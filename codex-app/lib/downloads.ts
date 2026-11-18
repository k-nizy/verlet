const types:Record<string,string>={'application/pdf':'.pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'.docx'};
const reply=(value:any,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const limit=8*1024*1024;
async function current(db:any,revisions:any[]){for(const r of revisions){const row=await db.prepare('SELECT revision FROM records WHERE collection=? AND id=?').bind(r.collection,r.id).first();if(row?.revision!==r.revision)return false}return true}
export async function downloadRoute(request:Request,path:string[],bucket:any,db:any){
 if(!bucket)return reply({message:'Download storage is unavailable. Please retry.'},503);
 if(request.method==='POST'&&path.length===1){
  // Drain the request even on validation failures; a rejected body must not
  // contaminate the next request on a persistent HTTP connection.
  const reader=request.body?.getReader();if(!reader)return reply({message:'The file is empty.'},400);const chunks:Uint8Array[]=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit){chunks.length=0;continue}chunks.push(part.value)}
  if(size>limit)return reply({message:'This document is larger than 8 MB. Select fewer tasks.'},413);
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  const type=request.headers.get('Content-Type')||'',filename=request.headers.get('X-Boutique-Filename')||'';
  if(!types[type]||!/^[a-zA-Z0-9_.-]{1,170}$/.test(filename)||!filename.endsWith(types[type]))return reply({message:'Choose a PDF or Word document with a matching filename.'},400);
  let revisions:any[];try{revisions=JSON.parse(request.headers.get('X-Boutique-Revisions')||'[]')}catch{return reply({message:'The task version could not be read.'},400)}
  if(!Array.isArray(revisions)||!revisions.length||revisions.length>125||revisions.some(r=>!['tasks','rules'].includes(r.collection)||typeof r.id!=='string'||r.id.length>180||!Number.isInteger(r.revision)))return reply({message:'Prepare the file again from the latest saved tasks.'},400);
  if(!await current(db,revisions))return reply({message:'A task or rule changed while this file was prepared. Export again to use the latest version.'},409);
  if(type==='application/pdf'?!new TextDecoder().decode(bytes.slice(0,5)).startsWith('%PDF-'):bytes[0]!==0x50||bytes[1]!==0x4b||bytes[2]!==3||bytes[3]!==4)return reply({message:'The generated document is incomplete. Please export again.'},400);
  const id=crypto.randomUUID(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
  await bucket.put('exports/'+id,bytes,{httpMetadata:{contentType:type},customMetadata:{filename,sha256:digest}});
  await bucket.put('exports-meta/'+id,JSON.stringify({revisions}),{httpMetadata:{contentType:'application/json'}});
  if(!await current(db,revisions)){await bucket.delete(['exports/'+id,'exports-meta/'+id]);return reply({message:'A task or rule changed. Export again to download the updated file.'},409)}
  return reply({url:'/api/download/'+id,id,filename,size,sha256:digest});
 }
 if(['GET','HEAD'].includes(request.method)&&path.length===2&&/^[0-9a-f-]{36}$/.test(path[1])){
  const object=await bucket.get('exports/'+path[1]);if(!object)return reply({message:'This file could not be found. Export it again in Boutique.'},404);
  const manifest=await bucket.get('exports-meta/'+path[1]);if(!manifest)return reply({message:'Prepare the download again in Boutique.'},409);
  const metadata=object.customMetadata||{},revisions=JSON.parse(await manifest.text()).revisions;
  if(!await current(db,revisions))return reply({message:'This file was prepared before the latest task changes. Export it again in Boutique to get the current version.'},409);
  const filename=metadata.filename||'Boutique-document',headers={'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':'attachment; filename="'+filename+'"','Content-Length':String(object.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','ETag':'"'+metadata.sha256+'"'};
  return new Response(request.method==='HEAD'?null:object.body,{headers});
 }
 return reply({message:'Download not found.'},404);
}
