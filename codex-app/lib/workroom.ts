import { env } from 'cloudflare:workers';
import seed from '../data/migration-seed.json';
import { agentRoute } from './agent-jobs';
import { downloadRoute } from './downloads';

// This workroom uses an explicit private Sites allowlist. The owner requested
// content editing for both currently allowed accounts. Dispatch is the access
// boundary, including its supported service-access credential. Implement roles
// before inviting read-only visitors; never broaden the audience without API
// membership checks.
const collections = new Set(['rules','tasks','sourcing','research','platform','notes','news','leadmeta','leadadmin','leadnotes','leadvotes','shelf','settings','briefs','requests','migration']);
const maxBody = 4 * 1024 * 1024;
const safeId = (s: string) => !!s && s.length <= 180 && !/[\x00-\x1f/\\]/.test(s);
const json = (data: unknown, status = 200) => Response.json(data, {status, headers: {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function binding() { if (!env.DB) throw new Error('The database is unavailable.'); return env.DB; }
function validateDoc(d: any) {
  if (!d || !collections.has(d.collection) || !safeId(d.id) || !d.data || typeof d.data !== 'object' || Array.isArray(d.data)) throw new Error('Invalid record.');
  if (JSON.stringify(d.data).length > 600000) throw new Error('This record is too large.');
}
async function body(request: Request) {
  if (+request.headers.get('content-length')! > maxBody) throw new Error('The request is too large.');
  const text = await request.text(); if (text.length > maxBody) throw new Error('The request is too large.');
  return JSON.parse(text);
}
async function state() {
  const result = await binding().prepare('SELECT collection,id,value,revision,updated_at FROM records ORDER BY collection,id').all();
  return {format:'boutique-backup-v1',at:new Date().toISOString(),records:result.results.map((r:any)=>({collection:r.collection,id:r.id,data:JSON.parse(r.value),revision:r.revision,updatedAt:r.updated_at}))};
}
async function put(d:any, remove=false) {
  validateDoc({...d,data:d.data||{}});
  const db=binding(), at=new Date().toISOString();
  const previous:any=await db.prepare('SELECT value,revision FROM records WHERE collection=? AND id=?').bind(d.collection,d.id).first();
  const revision=previous?.revision||0;
  if (!Number.isInteger(d.expectedRevision) || d.expectedRevision!==revision) return json({error:'conflict',message:'This record changed elsewhere. Reload before saving.'},409);
  const next=revision+1;
  // INSERT history only when the compare-and-swap succeeds. D1 batch is atomic.
  const query=remove
    ? db.prepare('DELETE FROM records WHERE collection=? AND id=? AND revision=?').bind(d.collection,d.id,revision)
    : revision
      ? db.prepare('UPDATE records SET value=?,revision=?,updated_at=? WHERE collection=? AND id=? AND revision=?').bind(JSON.stringify(d.data),next,at,d.collection,d.id,revision)
      : db.prepare('INSERT OR IGNORE INTO records(collection,id,value,revision,updated_at) VALUES(?,?,?,?,?)').bind(d.collection,d.id,JSON.stringify(d.data),next,at);
  const results=await db.batch([query,db.prepare('INSERT INTO history(collection,id,value,revision,at,operation) SELECT ?,?,?,?,?,? WHERE changes()=1').bind(d.collection,d.id,previous?.value||null,revision,at,remove?'delete':'save')]);
  if (results[0].meta.changes!==1) return json({error:'conflict',message:'Another save won. Reload before saving.'},409);
  return json({ok:true,revision:remove?0:next});
}

export async function handle(request: Request, path: string[]) {
  try {
    const url=new URL(request.url);
    const route=path[0];
    // Drain JSON bodies once, including rejected writes, so persistent HTTP
    // connections cannot carry an unread body into the following request.
    const input=!['GET','HEAD'].includes(request.method)&&!['file','download'].includes(route)?await body(request):undefined;
    if (!['GET','HEAD'].includes(request.method)) {
      const origin=request.headers.get('Origin');
      if (origin && origin!==url.origin) return json({error:'Cross-origin writes are not allowed.'},403);
    }
    if (route==='agent') return await agentRoute(binding(),request,path,input,env.BUCKET);
    if (route==='download') return await downloadRoute(request,path,env.BUCKET,binding());
    if (route==='state' && request.method==='GET') return json(await state());
    if (route==='identity' && request.method==='GET') return json({id:request.headers.get('oai-authenticated-user-id')||'owner',canEdit:true});
    if (route==='bootstrap' && request.method==='POST') {
      const db=binding();
      const complete=await db.prepare('SELECT id FROM records WHERE collection=? AND id=?').bind('migration','initialized').first();
      if(complete) return json({ok:true,alreadyInitialized:true});
      const at=new Date().toISOString();
      for(let start=0;start<seed.records.length;start+=40) await db.batch(seed.records.slice(start,start+40).map((d:any)=>{
        validateDoc(d);
        return db.prepare('INSERT OR IGNORE INTO records(collection,id,value,revision,updated_at) VALUES(?,?,?,?,?)').bind(d.collection,d.id,JSON.stringify(d.data),1,at);
      }));
      await db.prepare('INSERT OR IGNORE INTO records(collection,id,value,revision,updated_at) VALUES(?,?,?,?,?)').bind('migration','initialized',JSON.stringify({completedAt:at}),1,at).run();
      return json({ok:true,records:seed.records.length});
    }
    if (route==='record' && path.length===3) {
      const collection=path[1],id=path[2];
      if(!collections.has(collection)||!safeId(id)) return json({error:'Invalid record address.'},400);
      if(request.method==='PUT'||request.method==='DELETE') return put({...input,collection,id},request.method==='DELETE');
    }
    if (route==='backup' && request.method==='GET') {
      const snapshot=await state();
      const audit=await binding().prepare('SELECT * FROM history ORDER BY sequence').all();
      let files:any[]=[]; let cursor:string|undefined;
      if(env.BUCKET) do { const page=await env.BUCKET.list({prefix:'media/',cursor});files.push(...page.objects.map(o=>({key:o.key,size:o.size,uploaded:o.uploaded})));cursor=page.truncated?page.cursor:undefined; } while(cursor);
      return json({...snapshot,history:audit.results,files});
    }
    if(route==='history' && request.method==='GET') {
      const collection=url.searchParams.get('collection'),id=url.searchParams.get('id');
      return json((await binding().prepare('SELECT * FROM history WHERE collection=? AND id=? ORDER BY sequence DESC LIMIT 100').bind(collection,id).all()).results);
    }
    if(route==='file' && request.method==='POST') {
      if(!env.BUCKET) return json({error:'File storage is unavailable.'},503);
      const type=request.headers.get('Content-Type')||'';
      if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(type)) return json({code:'unsupported_type',message:'Use a PNG, JPEG or WebP image, or an MP4/WebM video.'},400);
      const data=await request.arrayBuffer();
      if(data.byteLength>20*1024*1024) return json({code:'too_large'},413);
      const id=crypto.randomUUID(); await env.BUCKET.put('media/'+id,data,{httpMetadata:{contentType:type}});
      return json({id});
    }
    if(route==='file' && path.length===2 && request.method==='GET') {
      if(!safeId(path[1])||!env.BUCKET) return json({error:'Not found.'},404);
      const object=await env.BUCKET.get('media/'+path[1]); if(!object) return json({error:'Not found.'},404);
      return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
    }
    return json({error:'Not found.'},404);
  } catch(e:any) {return json({error:e.message||'The request could not be completed.'},e.status||400);}
}
