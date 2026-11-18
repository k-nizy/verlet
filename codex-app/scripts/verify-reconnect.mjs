import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const origin=process.env.BOUTIQUE_TEST_ORIGIN||'http://127.0.0.1:8765';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Reconnect QA runs only on localhost.');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function api(action,data){const r=await fetch(origin+'/api/agent/'+action,{method:data?'POST':'GET',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(10000)});return {status:r.status,data:await r.json()};}
async function waitFor(check,timeout=60000){const until=Date.now()+timeout;while(Date.now()<until){const s=(await api('status')).data;if(check(s))return s;await pause(1000)}throw Error('The reconnect handshake did not complete.');}
const records=await fetch(origin+'/api/state').then(r=>r.json());
assert.equal(records.records.filter(r=>r.collection==='requests'&&['pending','running'].includes(r.data.status)).length,0,'Do not run model jobs during reconnect QA.');
const pending=(await api('reconnect',{})).data;
assert.equal((await api('reconnect',{})).data.requestId,pending.requestId);
assert.equal((await api('reconnect-ack',{requestId:pending.requestId,workerId:'stale',managerId:'wrong',instanceId:'old'})).status,409);
const pids=[],instances=[];
const manager=spawn(process.execPath,[fileURLToPath(new URL('./connector-supervisor.mjs',import.meta.url))],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,BOUTIQUE_SUPERVISOR_ORIGIN:origin,OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''}});
let buffer='';manager.stdout.on('data',chunk=>{buffer+=chunk;const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines)try{const e=JSON.parse(line);if(e.event==='worker-started'&&e.pid){pids.push(e.pid);instances.push(e.instanceId)}}catch{}});
try{
  const first=await waitFor(s=>s.connected&&s.reconnect?.requestId===pending.requestId&&s.reconnect.status==='connected'&&s.reconnect.workerId===s.workerId&&s.reconnect.instanceId===s.instanceId);
  assert.equal(first.instanceId,instances.at(-1));
  process.kill(pids.at(-1));
  const retry=(await api('reconnect',{})).data;
  const second=await waitFor(s=>s.connected&&s.workerId!==first.workerId&&s.instanceId!==first.instanceId&&s.reconnect?.requestId===retry.requestId&&s.reconnect.status==='connected'&&s.reconnect.workerId===s.workerId&&s.reconnect.instanceId===s.instanceId);
  assert.equal(second.instanceId,instances.at(-1));
  assert.equal((await api('reconnect-ack',{requestId:retry.requestId,workerId:first.workerId,managerId:first.managerId,instanceId:first.instanceId})).status,409);
  console.log('Passed: durable reconnect, request deduplication, real ChatGPT-authenticated worker handshake, crash recovery and stale-generation rejection.');
  if(process.env.BOUTIQUE_WAIT_FOR_UI==='1'){
    console.log('Waiting for the Reconnect Codex button in the local browser.');
    await waitFor(s=>s.connected&&s.reconnect?.requestId!==retry.requestId&&s.reconnect?.status==='connected'&&s.reconnect.workerId===s.workerId&&s.reconnect.instanceId===s.instanceId,120000);
    console.log('Passed: the real browser reconnect button completed the Windows manager handshake.');
  }
}finally{
  manager.kill();for(const pid of pids)try{process.kill(pid)}catch{}
}
