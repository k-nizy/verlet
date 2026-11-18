import assert from 'node:assert/strict';
const origin=process.env.BOUTIQUE_TEST_ORIGIN||'http://127.0.0.1:8765';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Request control mutation QA is localhost only.');
async function api(action,data){const r=await fetch(origin+'/api/agent/'+action,{method:data?'POST':'GET',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()}}
const state=()=>fetch(origin+'/api/state').then(r=>r.json()).then(x=>x.records);
const baseline=await state(),beforeDocs=baseline.filter(r=>r.collection==='tasks').map(r=>[r.id,r.revision]);
assert.equal(baseline.filter(r=>r.collection==='requests'&&['pending','running'].includes(r.data.status)).length,0,'Finish local jobs first.');
const queueWasPaused=(await api('status')).data.queuePaused,ids=[];
async function submit(kind='assist'){const r=await api('submit',{kind,prompt:'Request controls QA '+crypto.randomUUID(),question:'Local control research '+crypto.randomUUID(),instructions:'Original instructions',json:true});assert.equal(r.status,200);ids.push(r.data.jobs[0].id);return r.data.jobs[0].id}
async function claim(id){const r=await api('claim',{workerId:'request-controls-qa'});assert.equal(r.data.job.id,id);return r.data.job}
try{
  await api('queue',{paused:true});const a=await submit();assert.deepEqual((await api('claim',{workerId:'qa'})).data,{job:null,paused:true});
  await api('queue',{paused:false});const first=await claim(a);
  await api('queue',{paused:true});assert.equal((await api('complete',{id:a,lease:first.lease,result:{summary:'Active attempt can finish while queue is paused.'}})).status,200);
  const b=await submit('research');await api('queue',{paused:false});const old=await claim(b);
  let stopped=await api('stop',{id:b,mode:'pause'});assert.equal(stopped.data.record.data.stopAcknowledged,false);
  assert.equal((await api('heartbeat',{workerId:'qa',state:'working',currentJob:b,lease:old.lease})).data.stop,true);
  assert.equal((await api('complete',{id:b,lease:old.lease,result:{answer:'Obsolete',sources:[]}})).status,409);
  assert.equal((await api('activity')).data.events.some(e=>e.id===b),false,'Do not announce paused until the worker confirms.');
  const question='Updated real-world task research '+crypto.randomUUID();
  const edited=await api('edit-request',{id:b,instructions:'Added specific constraints',baseInstructions:'Original instructions',question,baseQuestion:old.question,restart:true});
  assert.equal(edited.data.record.data.status,'paused');assert.equal(edited.data.record.data.resumeAfterStop,true);assert.equal((await api('claim',{workerId:'qa'})).data.job,null);
  assert.equal((await api('edit-request',{id:b,instructions:'Losing stale edit',baseInstructions:'Original instructions',question,baseQuestion:old.question})).status,409);
  assert.equal((await api('stopped',{id:b,lease:old.lease})).data.record.data.status,'pending');
  const fresh=await claim(b);assert.notEqual(fresh.lease,old.lease);assert.equal(fresh.instructions,'Added specific constraints');assert.equal(fresh.question,question);
  assert.equal((await api('complete',{id:b,lease:old.lease,result:{answer:'Old overwrite attempt',sources:[]}})).status,409);
  assert.equal((await api('stopped',{id:b,lease:old.lease})).data.superseded,true);
  assert.equal((await api('complete',{id:b,lease:fresh.lease,result:{answer:'Updated answer',sources:[{title:'Fixture',url:'https://example.com'}]}})).status,200);
  const c=await submit();const running=await claim(c);await api('stop',{id:c,mode:'cancel'});
  assert.equal((await api('complete',{id:c,lease:running.lease,result:{summary:'Do not save'}})).status,409);
  assert.equal((await api('activity')).data.events.some(e=>e.id===c),false);
  assert.equal((await api('stopped',{id:c,lease:running.lease})).data.record.data.status,'cancelled');
  assert.equal((await api('claim',{workerId:'qa'})).data.job,null);
  const d=await submit();assert.equal((await api('stop',{id:d,mode:'cancel'})).data.record.data.stopAcknowledged,true);
  const e=await submit();await api('stop',{id:e,mode:'pause'});
  const events=(await api('activity')).data.events;
  for(const [id,status] of [[a,'completed'],[b,'completed'],[c,'cancelled'],[d,'cancelled'],[e,'paused']])assert.ok(events.find(e=>e.id===id&&e.status===status&&e.at));
  assert.equal((await api('retry',{id:a})).status,400,'Completed history uses follow-ups, never a destructive retry.');
  const f=await submit('research'),failed=await claim(f);await api('fail',{id:f,lease:failed.lease,message:'Local fixture failure'});
  assert.equal((await api('retry',{id:f})).status,200);
  assert.equal((await state()).find(r=>r.collection==='research'&&r.id===f).data.status,'waiting');
  await api('stop',{id:f,mode:'cancel'});
  assert.deepEqual((await state()).filter(r=>r.collection==='tasks').map(r=>[r.id,r.revision]),beforeDocs,'Control actions must not edit task documents.');
  console.log('Passed: global pause permits active completion, stop/edit/deferred restart, lease guards, research update, stale-edit protection, pending/running cancellation and confirmed notification events.');
}finally{
  for(const id of ids){const r=(await state()).find(r=>r.collection==='requests'&&r.id===id);if(r&&['pending','running'].includes(r.data.status))await api('stop',{id,mode:'cancel'})}
  await api('queue',{paused:queueWasPaused});
}
