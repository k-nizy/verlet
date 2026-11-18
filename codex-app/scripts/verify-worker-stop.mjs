// Verify real Windows process-tree cancellation with a local CLI fixture, using no model allowance.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const origin=process.env.BOUTIQUE_TEST_ORIGIN||'http://127.0.0.1:8765';
if(process.platform!=='win32'||!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('This QA requires Windows and localhost.');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function api(action,data){const r=await fetch(origin+'/api/agent/'+action,{method:data?'POST':'GET',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});if(!r.ok)throw Error(await r.text());return r.json()}
const state=()=>fetch(origin+'/api/state').then(r=>r.json()).then(x=>x.records);
assert.equal((await state()).filter(r=>r.collection==='requests'&&['pending','running'].includes(r.data.status)).length,0);
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'boutique-stop-qa-')),entry=path.join(dir,'fixture.mjs'),pidsFile=path.join(dir,'pids.json');
await fs.writeFile(entry,`import fs from 'node:fs';import {spawn} from 'node:child_process';if(process.argv.includes('login')){console.log('Logged in using ChatGPT');process.exit(0)}const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});fs.writeFileSync(${JSON.stringify(pidsFile)},JSON.stringify([process.pid,child.pid]));setInterval(()=>{},1000);`);
let pids=[],worker;
const wasPaused=(await api('status')).queuePaused;
try{
  await api('queue',{paused:false});
  worker=spawn(process.execPath,[fileURLToPath(new URL('./codex-connector.mjs',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe']});worker.stdout.resume();worker.stderr.resume();worker.stdin.end(JSON.stringify({origin,codexEntry:entry})+'\n');
  const job=(await api('submit',{kind:'assist',prompt:'Local process-tree stop fixture '+crypto.randomUUID(),json:true})).jobs[0];
  for(let i=0;i<45;i++){try{pids=JSON.parse(await fs.readFile(pidsFile,'utf8'));break}catch{}await pause(500)}assert.equal(pids.length,2,'Worker must start the CLI fixture and its child.');
  await api('stop',{id:job.id,mode:'pause'});
  await api('edit-request',{id:job.id,instructions:'Keep these additional constraints',baseInstructions:'',restart:false});
  let current;
  for(let i=0;i<35;i++){current=(await state()).find(r=>r.collection==='requests'&&r.id===job.id);if(current?.data.stopAcknowledged)break;await pause(500)}
  assert.equal(current.data.status,'paused');assert.equal(current.data.stopAcknowledged,true);assert.equal(current.data.instructions,'Keep these additional constraints');
  for(const pid of pids){let alive=true;try{process.kill(pid,0)}catch{alive=false}assert.equal(alive,false,'The CLI wrapper and its descendant must both be gone.');}
  assert.ok((await api('activity')).events.find(e=>e.id===job.id&&e.status==='paused'));
  await api('stop',{id:job.id,mode:'cancel'});
  console.log('Passed: actual Windows worker stop killed only its CLI process tree, acknowledged after exit, preserved added instructions and produced a confirmed notification. No model call was made.');
}finally{
  if(worker?.pid)spawnSync(path.join(process.env.SystemRoot,'System32/taskkill.exe'),['/PID',String(worker.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
  for(const pid of pids)try{process.kill(pid)}catch{}
  await api('queue',{paused:wasPaused});
  const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('boutique-stop-qa-'));await fs.rm(resolved,{recursive:true,force:true});
}
