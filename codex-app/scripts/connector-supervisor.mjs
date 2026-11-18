import {spawn} from 'node:child_process';
import net from 'node:net';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

// An inert, per-user named pipe prevents duplicate workers after repeated reconnects.
// It accepts no commands, URLs, credentials or model requests.
const origin=process.env.BOUTIQUE_SUPERVISOR_ORIGIN||'https://boutique-workroom.verletrobotics.chatgpt.site';
if(origin!=='https://boutique-workroom.verletrobotics.chatgpt.site'&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Unexpected Boutique origin.');
const suffix=createHash('sha256').update(os.homedir()+'|'+origin).digest('hex').slice(0,16);
const lock=net.createServer(socket=>socket.end());
const pipe='\\\\.\\pipe\\boutique-codex-'+suffix;
const managerId='boutique-manager-'+crypto.randomUUID();
let child,stopping=false,retryTimer,instanceId='',checking=false,controlTimer;
lock.on('error',e=>{if(e.code==='EADDRINUSE')process.exit(0);throw e});
lock.listen(pipe,()=>{start();controlTimer=setInterval(checkReconnect,10000);checkReconnect()});
function start(){
  if(stopping)return;
  clearTimeout(retryTimer);
  if(child&&child.exitCode===null&&child.signalCode===null&&!child.killed)return;
  instanceId=crypto.randomUUID();
  child=spawn(process.execPath,[fileURLToPath(new URL('./codex-connector.mjs',import.meta.url))],{windowsHide:true,stdio:['pipe','ignore','ignore'],env:{...process.env,OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''}});
  console.log(JSON.stringify({event:'worker-started',pid:child.pid,instanceId}));
  child.stdin.on('error',()=>{});
  child.stdin.end(JSON.stringify({origin,managerId,instanceId})+'\n');
  let retried=false;
  function retry(){if(retried)return;retried=true;if(!stopping)retryTimer=setTimeout(start,10000)}
  child.once('error',retry);child.once('exit',retry);
}
async function control(action,data){const r=await fetch(origin+'/api/agent/'+action,{method:data?'POST':'GET',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Connection control is not ready.');return r.json()}
async function checkReconnect(){
  if(checking||stopping)return;checking=true;
  try{
    const request=await control('reconnect');if(!request.requestId||request.status!=='pending')return;
    if(!child||child.exitCode!==null||child.signalCode!==null||child.killed){start();return;}
    const s=await control('status');
    // Require this exact child generation, not a cached heartbeat from an old process.
    // A healthy active job continues uninterrupted; no model request is made here.
    if(child&&child.exitCode===null&&child.signalCode===null&&!child.killed&&s.managerId===managerId&&s.instanceId===instanceId&&s.connected&&Date.now()-Date.parse(s.lastSeen)<30000)await control('reconnect-ack',{requestId:request.requestId,workerId:s.workerId,managerId,instanceId});
  }catch{}finally{checking=false;}
}
function stop(){stopping=true;clearTimeout(retryTimer);clearInterval(controlTimer);if(child)child.kill();lock.close();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
