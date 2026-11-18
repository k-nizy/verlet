import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const html=await fs.readFile(new URL('../ui/original-boutique.html',import.meta.url),'utf8');
const pure=html.slice(html.indexOf('function rotationPairs('),html.indexOf('function rotation(d)'));
const plan=new Function(pure+';return rotationPairs;')();
for(let s=1;s<64;s++)for(let e=1;e<64;e++){
  const z=Array.from({length:6},(_,i)=>i).filter(i=>s&(1<<i)),ez=Array.from({length:6},(_,i)=>i).filter(i=>e&(1<<i)),n=Math.max(z.length,ez.length);
  const expected=z.every(a=>ez.some(b=>a!==b))&&ez.every(b=>z.some(a=>a!==b));
  const p=plan(z,ez,n,1);assert.equal(!!p,expected);
  if(p){assert.ok(ez.every(x=>p.includes(x)));assert.ok(p.every((x,k)=>x!==z[(k+1)%z.length]));}
}
const origin=process.env.BOUTIQUE_TEST_ORIGIN||'http://127.0.0.1:8765';
if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(origin))throw Error('Run mutation QA only on a local preview.');
async function api(p,body,method){const r=await fetch(origin+'/api/'+p,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
const initial=(await api('state')).data.records;
for(let n=0;n<10;n++){
  const queued=(await api('agent/submit',{kind:'assist',prompt:'Local progress/save race '+crypto.randomUUID(),json:true})).data.jobs[0];
  const claimed=(await api('agent/claim',{workerId:'race-test'})).data.job;
  assert.equal(claimed.id,queued.id);
  const race=await Promise.all([
    api('agent/heartbeat',{workerId:'race-test',currentJob:claimed.id,lease:claimed.lease,progress:'Working'}),
    api('agent/complete',{id:claimed.id,lease:claimed.lease,result:{answer:'Local QA'}})
  ]);
  assert.equal(race[0].status,200);assert.equal(race[1].status,200);
}
const forward=initial.find(r=>r.collection==='tasks'&&r.data.doc?.id==='HOM-002');
const reset=initial.find(r=>r.collection==='tasks'&&r.data.forwardRec===forward.id);
const rules=initial.find(r=>r.collection==='rules'&&r.id==='inhouse');
const jobs=(await api('agent/submit',{kind:'rewrite',taskIds:[forward.id]})).data.jobs;
assert.equal(jobs.length,1);
assert.equal((await api('agent/submit',{kind:'rewrite',taskIds:[forward.id]})).data.jobs[0].id,jobs[0].id);
let claim=await api('agent/claim',{workerId:'qa-worker'});assert.equal(claim.status,200);assert.equal(claim.data.job.id,jobs[0].id);
assert.equal((await api('agent/claim',{workerId:'competing-worker'})).data.job,null);
let job=claim.data.job;
assert.equal((await api('agent/complete',{id:job.id,lease:'incorrect',result:{}})).status,409);
const task=structuredClone(forward.data.doc),rd=reset?structuredClone(reset.data.doc):null;
const resetPart=rd?.initial.find(r=>r.role==='part');
if(resetPart)resetPart.role='product';
task.reverse={possible:!!rd,why:rd?'':'No separate reset for QA.'};
// A concurrent manual edit must prevent BOTH task and reset writes.
await api('record/tasks/'+forward.id,{data:{...forward.data,qaConcurrent:true},expectedRevision:forward.revision},'PUT');
assert.equal((await api('agent/complete',{id:job.id,lease:job.lease,result:{task,reset:rd}})).status,409);
let records=(await api('state')).data.records;
assert.equal(records.find(r=>r.collection==='tasks'&&r.id===reset.id).revision,reset.revision);
await api('agent/fail',{id:job.id,lease:job.lease,message:'QA simulated conflict'});
await api('agent/retry',{id:job.id});
claim=await api('agent/claim',{workerId:'qa-worker'});job=claim.data.job;
assert.equal((await api('agent/complete',{id:job.id,lease:job.lease,result:{task,reset:rd,reviewNotes:[]}})).status,200);
records=(await api('state')).data.records;
assert.equal(records.find(r=>r.collection==='tasks'&&r.id===forward.id).data.doc.id,task.id);
assert.equal(records.find(r=>r.collection==='tasks'&&r.id===reset.id).revision,reset.revision+1);
if(resetPart){const saved=records.find(r=>r.collection==='tasks'&&r.id===reset.id).data.doc.initial.find(r=>r.item===resetPart.item);assert.equal(saved.role,'product');assert.equal(saved.how,task.target.find(r=>r.item===resetPart.item).how);}
assert.equal((await api('agent/complete',{id:job.id,lease:job.lease,result:{task,reset:rd}})).status,409);
const research=(await api('agent/submit',{kind:'research',question:'QA question'})).data.jobs[0];
claim=await api('agent/claim',{workerId:'qa-worker'});job=claim.data.job;assert.equal(job.id,research.id);
assert.equal((await api('agent/complete',{id:job.id,lease:job.lease,result:{answer:'QA answer',sources:[{title:'Example',url:'https://example.com'}]}})).status,200);
assert.equal((await api('state')).data.records.find(r=>r.collection==='research'&&r.id===research.id).data.answer,'QA answer');
// Restore the local baseline through normal audited saves.
records=(await api('state')).data.records;
for(const r of [forward,reset,rules].filter(Boolean)){const current=records.find(x=>x.collection===r.collection&&x.id===r.id);if(current.revision!==r.revision)assert.equal((await api('record/'+r.collection+'/'+r.id,{data:r.data,expectedRevision:current.revision},'PUT')).status,200);}
console.log('Passed: submission deduplication, single-worker claim, lease checks, concurrent-edit protection, atomic task/reset save, repeated-completion protection, research persistence.');
