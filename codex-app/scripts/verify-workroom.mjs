import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.BOUTIQUE_TEST_ORIGIN||'http://127.0.0.1:8765';
if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(origin))throw Error('Run destructive QA only on a local preview.');
async function api(path,method='GET',body,headers={}){const r=await fetch(origin+'/api/'+path,{method,headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
assert.equal((await api('bootstrap','POST',{})).status,200);
const seed=JSON.parse(await fs.readFile(new URL('../data/migration-seed.json',import.meta.url)));
const state=(await api('state')).data;
for(const expected of seed.records){const actual=state.records.find(r=>r.collection===expected.collection&&r.id===expected.id);assert.deepEqual(actual?.data,expected.data);}
const tasks=state.records.filter(r=>r.collection==='tasks'&&r.data.doc);
assert.equal(tasks.length,51);assert.equal(tasks.filter(r=>r.data.doc.isReverse).length,24);
const original=JSON.parse(await fs.readFile(new URL('../data/original-export.json',import.meta.url)));
for(const task of original.tasks){const actual=tasks.find(r=>r.id===task.appId).data;const {appId,status,rulesVersion,forwardRec,...description}=task;assert.deepEqual(actual.doc,description);assert.equal(actual.status,status);assert.equal(actual.rulesVersion,rulesVersion);assert.equal(actual.forwardRec,forwardRec||'');}
const id='qa-'+crypto.randomUUID(),path='record/notes/'+id;
let r=await api(path,'PUT',{data:{text:'First version'},expectedRevision:0});assert.equal(r.status,200);assert.equal(r.data.revision,1);
r=await api(path,'PUT',{data:{text:'Second version'},expectedRevision:1});assert.equal(r.status,200);assert.equal(r.data.revision,2);
assert.equal((await api(path,'PUT',{data:{text:'Stale overwrite'},expectedRevision:1})).status,409);
let versions=(await api('history?collection=notes&id='+id)).data;assert.equal(versions.length,2);assert.equal(JSON.parse(versions[0].value).text,'First version');
assert.equal((await api(path,'PUT',{data:{text:'Cross origin'},expectedRevision:2},{Origin:'https://example.com'})).status,403);
assert.equal((await api('record/unknown/test','PUT',{data:{},expectedRevision:0})).status,400);
assert.equal((await api(path,'DELETE',{expectedRevision:2})).status,200);
versions=(await api('history?collection=notes&id='+id)).data;assert.equal(versions[0].operation,'delete');assert.equal(JSON.parse(versions[0].value).text,'Second version');
// Uploaded bytes live only in this preview's local R2 bucket.
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVacAAAAASUVORK5CYII=','base64');
const uploaded=await fetch(origin+'/api/file',{method:'POST',headers:{'Content-Type':'image/png'},body:image});assert.equal(uploaded.status,200);const media=await uploaded.json();
const saved=await fetch(origin+'/api/file/'+media.id);assert.equal(saved.headers.get('Content-Type'),'image/png');assert.deepEqual(Buffer.from(await saved.arrayBuffer()),image);
const denied=await fetch(origin+'/api/file',{method:'POST',headers:{'Content-Type':'text/html'},body:'<script>alert(1)</script>'});assert.equal(denied.status,400);
const backup=(await api('backup')).data;assert.equal(backup.format,'boutique-backup-v1');assert.ok(backup.history.length>=3);assert.ok(backup.files.some(f=>f.key==='media/'+media.id));
const html=await fs.readFile(new URL('../public/boutique.html',import.meta.url),'utf8');
assert.ok(html.includes('/boutique-runtime.js'));assert.ok(!html.includes('window.claude'));assert.ok(!html.includes('window.__boutique'));
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(match[1].trim())new Function(match[1]);}
new Function(await fs.readFile(new URL('../public/boutique-runtime.js',import.meta.url),'utf8'));
console.log('Passed: migration content, 51 task/reset records, conflict protection, save/delete history, origin checks, media round-trip, complete backup and JavaScript syntax.');
