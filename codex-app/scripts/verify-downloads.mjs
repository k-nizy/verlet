import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {selectedSnapshot,buildOperatorPdf} from '../public/task-pack.mjs';
import {buildOperatorWord} from '../public/operator-word.mjs';
const require=createRequire(import.meta.url),runtime='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/';
const origin=process.env.BOUTIQUE_TEST_ORIGIN||'http://127.0.0.1:8765';if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Download mutation QA runs only on localhost.');
const state=()=>fetch(origin+'/api/state').then(r=>r.json());
let snapshot=await state();const selected=selectedSnapshot(snapshot,['mwav421nc4ctn']),versions=selected.records.filter(r=>r.collection==='tasks'||r.collection==='rules'&&r.id==='inhouse').map(({collection,id,revision})=>({collection,id,revision}));
const pdf=await buildOperatorPdf(require(runtime+'pdf-lib'),selected),word=await buildOperatorWord(require(runtime+'docx'),selected);
await fs.mkdir('.sites-runtime/download-qa',{recursive:true});await fs.writeFile('.sites-runtime/download-qa/operator.pdf',pdf.bytes);await fs.writeFile('.sites-runtime/download-qa/operator.docx',word);
const headers=(type,name,refs=versions)=>({'Content-Type':type,'X-Boutique-Filename':name,'X-Boutique-Revisions':JSON.stringify(refs)});
const cases=[['application/pdf','Operator.pdf',pdf.bytes],['application/vnd.openxmlformats-officedocument.wordprocessingml.document','Operator.docx',word]];
const links=[];
for(const [type,name,bytes] of cases){const posted=await fetch(origin+'/api/download',{method:'POST',headers:headers(type,name),body:bytes});assert.equal(posted.status,200,await posted.clone().text());const result=await posted.json();links.push(result.url);const got=await fetch(origin+result.url);assert.equal(got.status,200);assert.match(got.headers.get('Content-Disposition'),new RegExp('attachment; filename="'+name+'"'));assert.equal(got.headers.get('Content-Type'),type);assert.equal(got.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(new Uint8Array(await got.arrayBuffer()),new Uint8Array(bytes));assert.equal((await fetch(origin+result.url,{method:'HEAD'})).headers.get('Content-Length'),String(bytes.length));}
assert.equal((await fetch(origin+'/api/download',{method:'POST',headers:headers('text/html','bad.html'),body:'<script></script>'})).status,400);
assert.equal((await fetch(origin+'/api/download',{method:'POST',headers:headers('application/pdf','bad.pdf'),body:'bad content'})).status,400);
const stale=structuredClone(versions);stale[0].revision--;
assert.equal((await fetch(origin+'/api/download',{method:'POST',headers:headers('application/pdf','stale.pdf',stale),body:pdf.bytes})).status,409);
// The earlier file must refuse to serve stale content after a saved task changes.
const r=snapshot.records.find(r=>r.collection==='tasks'&&r.id==='mwav421nc4ctn');
const write=await fetch(origin+'/api/record/tasks/'+r.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:r.revision,data:{...r.data,qaDownloadCheck:true}})});assert.equal(write.status,200);
try{for(const url of links)assert.equal((await fetch(origin+url)).status,409)}finally{const updated=(await state()).records.find(x=>x.collection==='tasks'&&x.id===r.id);await fetch(origin+'/api/record/tasks/'+r.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:updated.revision,data:r.data})})}
console.log('Passed: current-source Word/PDF generation, persistent attachment URLs, exact bytes, HEAD/size, unsupported-file rejection and stale-upload/download protection.');
