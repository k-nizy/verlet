// Private maintenance client. Access credentials stay in this process only.
import { createInterface } from 'node:readline';
import fs from 'node:fs/promises';
const input=createInterface({input:process.stdin,terminal:false});
const origin='https://boutique-workroom.verletrobotics.chatgpt.site';
let connection;
console.log('Ready for private maintenance JSON on stdin (input is hidden).');
for await(const line of input){
  if(!line.trim())continue;
  const q=JSON.parse(line);
  if(q.connect){connection={token:q.token};console.log('Private maintenance connection ready.');continue;}
  if(q.close){input.close();break;}
  try{
    if(q.bodyFile)q.body=JSON.parse(await fs.readFile(q.bodyFile,'utf8'));
    const response=await fetch(origin+'/api/'+q.path,{method:q.method||'GET',headers:{'OAI-Sites-Authorization':'Bearer '+(q.token||connection?.token),'Content-Type':'application/json'},body:q.body===undefined?undefined:JSON.stringify(q.body)});
    const data=await response.json();
    if(q.output){await fs.writeFile(q.output,JSON.stringify(data,null,2));console.log(JSON.stringify({status:response.status,saved:true}));}
    else console.log(JSON.stringify({status:response.status,data:q.collection?data.records.filter(r=>r.collection===q.collection):data}));
  }catch(e){console.log(JSON.stringify({error:e.message}));}
  if(!connection){input.close();break;}
}
