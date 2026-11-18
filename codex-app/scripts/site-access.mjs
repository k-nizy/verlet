// Read supported Sites service access only through hidden stdin. Never log it.
// For this explicitly allowlisted private Boutique only; checks and backs up data.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const input=await new Promise((resolve,reject)=>{
  let text='';const tty=process.stdin.isTTY;
  if(tty){process.stdin.setRawMode(true);process.stderr.write('Ready for private Site access JSON (input is hidden).\n');}
  process.stdin.setEncoding('utf8');
  function done(){if(tty)process.stdin.setRawMode(false);process.stdin.pause();process.stdin.off('data',onData);try{resolve(JSON.parse(text.trim()))}catch(e){reject(Error('Invalid access input.'))}}
  function onData(chunk){text+=chunk;if(text.includes('\x03'))reject(Error('Cancelled.'));else if(text.length>16000)reject(Error('Access input too large.'));else if(text.includes('\n')||text.includes('\r'))done();}
  process.stdin.on('data',onData);
});
const origin='https://boutique-workroom.verletrobotics.chatgpt.site';
if(input.origin!==origin||typeof input.token!=='string')throw Error('Use the supported credential for this private Boutique.');
async function api(path,method='GET',data){const r=await fetch(origin+'/api/'+path,{method,redirect:'manual',headers:{'OAI-Sites-Authorization':'Bearer '+input.token,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});if(!r.ok)throw Error('Site API returned '+r.status);return r.json();}
if(input.action==='verify'){
  const anonymous=await fetch(origin+'/api/state',{redirect:'manual'});
  assert.ok([301,302,303,307,308,401,403].includes(anonymous.status),'Unauthenticated API must stay protected.');
  await api('bootstrap','POST',{});
  const state=await api('state');
  const seed=JSON.parse(await fs.readFile(new URL('../data/migration-seed.json',import.meta.url)));
  for(const record of seed.records){const actual=state.records.find(r=>r.collection===record.collection&&r.id===record.id);assert.deepEqual(actual?.data,record.data);}
  const counts={};for(const r of state.records)counts[r.collection]=(counts[r.collection]||0)+1;
  const backup=await api('backup');
  await fs.mkdir(new URL('../outputs/',import.meta.url),{recursive:true});
  await fs.writeFile(new URL('../outputs/first-private-backup.json',import.meta.url),JSON.stringify(backup,null,2));
  console.log(JSON.stringify({verified:true,anonymousStatus:anonymous.status,counts,allTransferredContentMatches:true,history:backup.history.length,files:backup.files.length}));
}else throw Error('Unsupported maintenance action.');
