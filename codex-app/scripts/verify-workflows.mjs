import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {mergeRecord} from '../public/record-merge.mjs';
const origin=process.env.BOUTIQUE_TEST_ORIGIN||'http://127.0.0.1:8765';
if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(origin))throw Error('Run workflow mutation QA only on a local preview.');
async function api(p,data,method=data?'POST':'GET'){const r=await fetch(origin+'/api/'+p,{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()};}
const state=() => api('state').then(x=>x.data.records);
const baseline=await state(),seed=baseline.find(x=>x.collection==='tasks'&&x.data.doc&&!x.data.doc.isReverse);
const image=await fetch(origin+'/api/file',{method:'POST',headers:{'Content-Type':'image/png'},body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVacAAAAASUVORK5CYII=','base64')}).then(x=>x.json());assert.ok(image.id);
const ids=['qa-write-'+crypto.randomUUID(),'qa-write-'+crypto.randomUUID()];
for(const [i,id] of ids.entries())assert.equal((await api('record/tasks/'+id,{expectedRevision:0,data:{name:'Local QA confirmed task',status:'confirmed',category:'HOM',referenceImageIds:i?[image.id]:[]}},'PUT')).status,200);
const before=(await state()).filter(x=>x.collection==='requests').length;
assert.equal((await api('agent/submit',{kind:'write',taskIds:[ids[0],'missing-task']})).status,400);
assert.equal((await state()).filter(x=>x.collection==='requests').length,before,'Invalid selection must not partially enqueue.');
assert.equal((await api('agent/submit',{kind:'write',taskIds:ids,imageIds:['missing-image']})).status,400);
const submitted=await api('agent/submit',{kind:'write',taskIds:ids,instructions:'Keep final step aligned with target.'});assert.equal(submitted.status,200);assert.equal(submitted.data.jobs.length,2);
assert.deepEqual((await api('agent/submit',{kind:'write',taskIds:ids})).data.jobs.map(x=>x.id),submitted.data.jobs.map(x=>x.id));
const allocated=[];
for(const [i,expected] of submitted.data.jobs.entries()){const claim=await api('agent/claim',{workerId:'workflow-qa'}),job=claim.data.job;assert.equal(job.id,expected.id);assert.equal(job.instructions,'Keep final step aligned with target.');assert.deepEqual(job.imageIds,i?[image.id]:[]);const task=structuredClone(seed.data.doc);task.code='HOM';task.id='HOM-000';task.reverse={possible:false,why:'Local fixture has no reset.'};const completed=await api('agent/complete',{id:job.id,lease:job.lease,result:{task,reset:null,reviewNotes:['Local QA fixture; not for recording.']}});assert.equal(completed.status,200,JSON.stringify(completed.data));allocated.push(completed.data.result.taskCode);}
assert.notEqual(allocated[0],allocated[1]);assert.ok(allocated.every(id=>/^HOM-\d{3}$/.test(id)));
// Exercise the actual browser storage adapter with two independently cached clients.
const runtime=(await fs.readFile(new URL('../public/boutique-runtime.js',import.meta.url),'utf8')).replaceAll("import('/record-merge.mjs')","import("+JSON.stringify(new URL('../public/record-merge.mjs',import.meta.url).href)+")");
function client(){const win=new EventTarget();const doc=new EventTarget();doc.visibilityState='hidden';new Function('window','document','fetch','setInterval',runtime)(win,doc,(p,o)=>fetch(new URL(p,origin),o),()=>0);return win;}
const mergeId='qa-merge-'+crypto.randomUUID(),base={name:'Cached task',status:'idea',summary:'Original',doc:{steps:['Original step']}};
await api('record/tasks/'+mergeId,{expectedRevision:0,data:base},'PUT');
const a=client(),b=client(),dbA=await a.boutique.use('db'),dbB=await b.boutique.use('db');
await dbA.collection('tasks').doc(mergeId).set({...base,summary:'Edited elsewhere'});
await dbB.collection('tasks').doc(mergeId).set({...base,status:'confirmed'});
let saved=(await state()).find(x=>x.id===mergeId).data;assert.equal(saved.status,'confirmed');assert.equal(saved.summary,'Edited elsewhere');
await a.boutique.refresh();await b.boutique.refresh();const common=structuredClone(saved);
await dbA.collection('tasks').doc(mergeId).set({...common,doc:{steps:['New saved step']}});
let conflict;b.addEventListener('boutique-save-conflict',e=>conflict=e.detail);
await assert.rejects(dbB.collection('tasks').doc(mergeId).set({...common,doc:{steps:['My conflicting step']}}),e=>e.code==='conflict');
assert.deepEqual(conflict.fields,['doc.steps']);assert.deepEqual(conflict.draft.doc.steps,['My conflicting step']);
saved=(await state()).find(x=>x.id===mergeId).data;assert.deepEqual(saved.doc.steps,['New saved step']);
await b.boutique.applyReviewed(conflict);
saved=(await state()).find(x=>x.id===mergeId).data;assert.deepEqual(saved.doc.steps,['My conflicting step']);assert.equal(saved.summary,'Edited elsewhere');
// An editor must retain its original baseline even after background cache refresh.
const editorSnapshot=a.boutique.snapshot('tasks',mergeId);await a.boutique.refresh();
await assert.rejects(dbA.collection('tasks').doc(mergeId).set({...editorSnapshot.data,doc:{steps:['A stale editor step']}},{baseRecord:editorSnapshot}),e=>e.code==='conflict');
assert.deepEqual(mergeRecord({a:1,b:1},{a:2,b:1},{a:1,b:2}),{value:{a:2,b:2},conflicts:[]});
// Normal audited cleanup; no production or seed records are removed.
for(const id of [...ids,mergeId]){const r=(await state()).find(x=>x.collection==='tasks'&&x.id===id);if(r)assert.equal((await api('record/tasks/'+id,{expectedRevision:r.revision},'DELETE')).status,200);}
const currentRules=(await state()).find(x=>x.collection==='rules'&&x.id==='inhouse');
const idea=(await api('agent/submit',{kind:'assist',prompt:'Local rule-change guard '+crypto.randomUUID(),json:true})).data.jobs[0];
const ideaClaim=(await api('agent/claim',{workerId:'workflow-qa'})).data.job;assert.equal(ideaClaim.id,idea.id);assert.equal(ideaClaim.rulesVersion,currentRules.data.version);
await api('record/rules/inhouse',{expectedRevision:currentRules.revision,data:{...currentRules.data,qaRuleChange:true}},'PUT');
assert.equal((await api('agent/complete',{id:idea.id,lease:ideaClaim.lease,result:{summary:'An answer from superseded rules'}})).status,409);
await api('agent/fail',{id:idea.id,lease:ideaClaim.lease,message:'Local QA rule change was correctly rejected.'});
const changedRules=(await state()).find(x=>x.collection==='rules'&&x.id==='inhouse');await api('record/rules/inhouse',{expectedRevision:changedRules.revision,data:currentRules.data},'PUT');
await api('agent/heartbeat',{workerId:'workflow-qa',state:'needs_sign_in'});assert.equal((await api('agent/status')).data.connected,false);
console.log('Passed: batch validation/deduplication, unique server IDs, instructions, actual cached-client safe merge, overlapping-array protection and retained unsaved draft.');
