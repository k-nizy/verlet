import { inspectTask, resetInitial, normalizeTaskZones } from './task-engine.mjs';
import assets from '../public/ref/assets.json';

const reply=(d:any,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
const clock=()=>new Date().toISOString();
const decode=(r:any)=>r?{collection:r.collection,id:r.id,data:JSON.parse(r.value),revision:r.revision}:null;
async function read(db:any,c:string,id:string){return decode(await db.prepare('SELECT * FROM records WHERE collection=? AND id=?').bind(c,id).first());}
async function list(db:any,c:string){return (await db.prepare('SELECT * FROM records WHERE collection=?').bind(c).all()).results.map(decode);}
function eligible(r:any){return r.data.execution==='codex-local-v1';}

// The guard deliberately violates NOT NULL on any stale revision. D1 batch
// rolls back every statement, including history, so task/reset saves are atomic.
export async function commitRecords(db:any,changes:any[],extra:any[]=[]){
  const conditions:any[]=[],params:any[]=[];
  for(const c of changes.concat(extra)){
    conditions.push('(SELECT COALESCE(MAX(revision),0) FROM records WHERE collection=? AND id=?)=?');
    params.push(c.collection,c.id,c.revision);
  }
  const guard=crypto.randomUUID(),at=clock();
  const sql=db.prepare("INSERT INTO records(collection,id,value,revision,updated_at) SELECT 'migration',?,'{}',CASE WHEN "+conditions.join(' AND ')+" THEN 1 ELSE NULL END,?").bind(guard,...params,at);
  const statements=[sql];
  for(const c of changes){
    statements.push(db.prepare('INSERT INTO history(collection,id,value,revision,at,operation) VALUES(?,?,?,?,?,?)').bind(c.collection,c.id,c.before===undefined?null:JSON.stringify(c.before),c.revision,at,'save'));
    statements.push(db.prepare('INSERT INTO records(collection,id,value,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET value=excluded.value,revision=excluded.revision,updated_at=excluded.updated_at').bind(c.collection,c.id,JSON.stringify(c.data),c.revision+1,at));
  }
  statements.push(db.prepare("DELETE FROM records WHERE collection='migration' AND id=?").bind(guard));
  try{await db.batch(statements);}catch{throw Object.assign(Error('A task, reset or rule changed while Codex was working. Your edits are preserved; retry with the latest version.'),{status:409});}
}
const change=(r:any,data:any)=>({...r,before:r.data,data});

export async function agentRoute(db:any,request:Request,path:string[],input:any,bucket?:any){
  const action=path[1];
  if(action==='queue'&&request.method==='POST'){
    if(typeof input.paused!=='boolean')return reply({message:'Choose pause or resume.'},400);
    const r=await read(db,'settings','codex-controls');
    await commitRecords(db,[change(r||{collection:'settings',id:'codex-controls',revision:0,data:{}},{...r?.data,paused:input.paused,updatedAt:clock()})]);
    return reply({paused:input.paused});
  }
  if(action==='activity'&&request.method==='GET'){
    const rows=await db.prepare("SELECT id,json_extract(value,'$.title') title,json_extract(value,'$.kind') kind,json_extract(value,'$.status') status,json_extract(value,'$.error') error,json_extract(value,'$.result.taskId') taskId,json_extract(value,'$.result.status') resultStatus,COALESCE(NULLIF(json_extract(value,'$.completedAt'),''),NULLIF(json_extract(value,'$.stoppedAt'),''),NULLIF(json_extract(value,'$.controlAt'),''),updated_at) at FROM records WHERE collection='requests' AND json_extract(value,'$.execution')='codex-local-v1' AND (json_extract(value,'$.status') IN ('completed','failed') OR (json_extract(value,'$.status') IN ('paused','cancelled') AND json_extract(value,'$.stopAcknowledged')=1)) ORDER BY at DESC LIMIT 60").all();
    return reply({events:rows.results});
  }
  if(['stop','edit-request','resume','stopped'].includes(action)&&request.method==='POST'){
    const r=await read(db,'requests',String(input.id||''));
    if(!r||!eligible(r))return reply({message:'Choose an automatic Codex request.'},400);
    const x=r.data,at=clock();let data:any;
    if(action==='stopped'){
      if(x.lease!==input.lease)return reply({stopped:true,superseded:true});
      if(!['paused','cancelled'].includes(x.status))return reply({stopped:false});
      const restart=x.status==='paused'&&x.resumeAfterStop;
      data={...x,stopAcknowledged:true,stoppedAt:at,lease:'',leaseUntil:'',status:restart?'pending':x.status,resumeAfterStop:false,progress:restart?'Updated request queued':x.status==='cancelled'?'Cancelled; the saved tasks are unchanged':'Paused; add details or restart when ready'};
    }else if(action==='stop'){
      if(!['pending','running','paused','failed','cancelled'].includes(x.status))return reply({message:'This request already finished. Add a follow-up to change it.'},400);
      const cancel=input.mode==='cancel',awaitStop=x.status==='running'||(['paused','cancelled'].includes(x.status)&&x.stopAcknowledged===false&&!!x.lease);
      data={...x,status:cancel?'cancelled':'paused',stopAcknowledged:!awaitStop,resumeAfterStop:false,error:'',completedAt:'',controlAt:at,stoppedAt:awaitStop?'':at,progress:awaitStop?'Stopping the current attempt…':cancel?'Cancelled; saved tasks are unchanged':'Paused; ready to edit'};
    }else{
      if(!['paused','failed','cancelled','pending'].includes(x.status))return reply({message:'Stop the current attempt before editing it.'},409);
      if(action==='edit-request'){
        if(typeof input.instructions!=='string'||input.instructions.length>12000)return reply({message:'Use up to 12,000 characters of additional instructions.'},400);
        if(input.baseInstructions!==undefined&&input.baseInstructions!==(x.instructions||''))return reply({message:'Someone changed these instructions. Your text is still in the editor; reopen the latest request before saving.'},409);
        if(x.kind==='research'&&(typeof input.question!=='string'||!input.question.trim()||input.question.length>12000))return reply({message:'Write a research question of up to 12,000 characters.'},400);
        if(x.kind==='research'&&input.baseQuestion!==undefined&&input.baseQuestion!==x.question)return reply({message:'The research question changed elsewhere. Review the latest version before saving.'},409);
      }
      const waiting=x.stopAcknowledged===false&&!!x.lease;
      const restart=action==='resume'||input.restart===true;
      data={...x,...(action==='edit-request'?{instructions:input.instructions.trim(),...(x.kind==='research'?{question:input.question.trim(),title:input.question.trim().slice(0,120)}:{})}:{}),status:restart&&!waiting?'pending':'paused',resumeAfterStop:restart&&waiting,error:'',result:null,completedAt:'',controlAt:at,stopAcknowledged:!waiting,progress:restart?(waiting?'Stopping; will restart with the updated details':'Updated request queued'):'Details saved; request paused'};
      if(!waiting){data.lease='';data.leaseUntil='';}
      if(restart&&!waiting)data.createdAt=at;
    }
    const changes=[change(r,data)];
    const q=x.researchId?await read(db,'research',x.researchId):null;
    if(q)changes.push(change(q,{...q.data,question:data.question||q.data.question,status:data.status==='pending'?'waiting':data.status,error:''}));
    await commitRecords(db,changes);
    return reply({ok:true,stopped:action==='stopped',record:{collection:'requests',id:r.id,data,revision:r.revision+1}});
  }
  if(action==='status'&&request.method==='GET'){
    const s=(await read(db,'settings','codex-worker'))?.data||{};
    const online=!!s.lastSeen&&Date.now()-Date.parse(s.lastSeen)<75000;
    const reconnect=(await read(db,'settings','codex-reconnect'))?.data||null;
    const controls=(await read(db,'settings','codex-controls'))?.data||{};
    return reply({...s,online,connected:online&&['ready','working','paused'].includes(s.state),queuePaused:!!controls.paused,reconnect,uses:'Your signed-in Codex account on this computer'});
  }
  if(action==='reconnect'&&request.method==='GET')return reply((await read(db,'settings','codex-reconnect'))?.data||{});
  if(action==='reconnect'&&request.method==='POST'){
    const old=await read(db,'settings','codex-reconnect');
    if(old?.data.status==='pending'&&Date.now()-Date.parse(old.data.requestedAt)<90000)return reply({requestId:old.data.requestId});
    const data={requestId:crypto.randomUUID(),requestedAt:clock(),status:'pending'};
    await commitRecords(db,[change(old||{collection:'settings',id:'codex-reconnect',revision:0,data:{}},data)]);
    return reply({requestId:data.requestId});
  }
  if(action==='reconnect-ack'&&request.method==='POST'){
    const r=await read(db,'settings','codex-reconnect'),worker=await read(db,'settings','codex-worker');
    const s=worker?.data;
    if(!r||r.data.requestId!==input.requestId||!s||s.workerId!==input.workerId||!input.managerId||s.managerId!==input.managerId||!input.instanceId||s.instanceId!==input.instanceId||Date.now()-Date.parse(s.lastSeen)>30000||!['ready','working','paused'].includes(s.state))return reply({message:'Waiting for a fresh ready Windows worker.'},409);
    await commitRecords(db,[change(r,{...r.data,status:'connected',acknowledgedAt:clock(),workerId:s.workerId,managerId:s.managerId,instanceId:s.instanceId})],[{collection:'settings',id:worker.id,revision:worker.revision}]);
    return reply({ok:true});
  }
  if(action==='heartbeat'&&request.method==='POST'){
    const at=clock();
    const data={lastSeen:at,workerId:input.workerId,managerId:input.managerId||'',instanceId:input.instanceId||'',currentJob:input.currentJob||'',state:input.state||'ready',message:input.message||''};
    await db.prepare("INSERT INTO records(collection,id,value,revision,updated_at) VALUES('settings','codex-worker',?,1,?) ON CONFLICT(collection,id) DO UPDATE SET value=excluded.value,revision=records.revision+1,updated_at=excluded.updated_at").bind(JSON.stringify(data),at).run();
    if(input.currentJob&&input.lease){const r=await read(db,'requests',input.currentJob);if(r?.data.status!=='running'||r.data.lease!==input.lease)return reply({ok:true,stop:true});const next={...r.data,leaseUntil:new Date(Date.now()+90000).toISOString(),progress:input.progress||r.data.progress};await db.prepare("UPDATE records SET value=?,updated_at=? WHERE collection='requests' AND id=? AND revision=?").bind(JSON.stringify(next),at,r.id,r.revision).run();}
    return reply({ok:true});
  }
  if(action==='submit'&&request.method==='POST'){
    const kind=input.kind;
    if(!['write','rewrite','research','assist'].includes(kind))return reply({message:'Choose writing, rewriting or research.'},400);
    const imageIds=input.imageIds||[];
    if(!Array.isArray(imageIds)||imageIds.length>4||imageIds.some((id:any)=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)))return reply({message:'Attach up to four uploaded images.'},400);
    for(const id of imageIds){const file=await bucket?.head('media/'+id);if(!file||!['image/png','image/jpeg','image/webp'].includes(file.httpMetadata?.contentType)||file.size>8*1024*1024)return reply({message:'An attached image is missing, unsupported or larger than 8 MB.'},400);}
    const instructions=String(input.instructions||'').trim();
    if(instructions.length>12000)return reply({message:'Keep the writing instructions under 12,000 characters.'},400);
    const requests=await list(db,'requests'),out=[];
    const taskKind=['write','rewrite'].includes(kind),ids=taskKind?input.taskIds:[null];
    if(!Array.isArray(ids)||!ids.length||ids.length>60)return reply({message:'Choose 1 to 60 tasks.'},400);
    if(taskKind&&ids.some((id:any)=>typeof id!=='string'||id.length>180))return reply({message:'A selected task ID is invalid.'},400);
    // Validate the entire selection before creating any job.
    const taskImages=new Map();
    if(taskKind)for(const id of [...new Set(ids)]){const t=await read(db,'tasks',String(id));if(!t||t.data.doc?.isReverse||kind==='write'&&(t.data.doc||t.data.status!=='confirmed')||kind==='rewrite'&&!t.data.doc)return reply({message:kind==='write'?'Choose confirmed names that have not been written.':'Choose forward tasks to rewrite.'},400);const refs=[...new Set([...imageIds,...(t.data.referenceImageIds||[])])];if(refs.length>4||refs.some((x:any)=>typeof x!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(x)))return reply({message:'Keep up to four reference images for each task.'},400);for(const ref of refs){const file=await bucket?.head('media/'+ref);if(!file||!['image/png','image/jpeg','image/webp'].includes(file.httpMetadata?.contentType)||file.size>8*1024*1024)return reply({message:'A task reference image is missing or unsupported. Update the task references before writing.'},400);}taskImages.set(id,refs);}
    for(const taskId of [...new Set(ids)]){
      const existing=requests.find((r:any)=>eligible(r)&&(['pending','running','paused'].includes(r.data.status)||kind==='assist'&&!input.noCache&&r.data.status==='completed')&&r.data.kind===kind&&(taskKind?r.data.taskId===taskId:kind==='research'?r.data.question===String(input.question||'').trim()&&r.data.instructions===instructions:r.data.prompt===input.prompt&&r.data.json===!!input.json&&(r.data.instructions||'')===instructions&&JSON.stringify(r.data.imageIds||[])===JSON.stringify(imageIds)));
      if(existing){out.push({id:existing.id,duplicate:true,status:existing.data.status});continue;}
      let title='Codex request';
      if(kind==='rewrite'){const t=await read(db,'tasks',String(taskId));if(!t?.data.doc||t.data.doc.isReverse)return reply({message:'Choose a forward task to rewrite.'},400);title='Rewrite '+t.data.doc.id+' · '+t.data.doc.name;}
      if(kind==='write'){const t=await read(db,'tasks',String(taskId));title='Write · '+t.data.name;}
      if(kind==='research'&&!String(input.question||'').trim())return reply({message:'Write a research question.'},400);
      if(kind==='assist'&&(!input.prompt||input.prompt.length>300000))return reply({message:'The request is empty or too long.'},400);
      const id=crypto.randomUUID(),at=clock();
      const data:any={execution:'codex-local-v1',kind,title:kind==='research'?String(input.question).slice(0,120):kind==='assist'?input.prompt.split('\n')[0].slice(0,120):title,status:'pending',createdAt:at,source:'Boutique',taskId:taskId||'',question:kind==='research'?String(input.question).trim():'',researchKind:input.researchKind||'general',ref:input.ref||'',prompt:kind==='assist'?input.prompt:'',json:!!input.json,progress:'Waiting for the Codex connector'};
      data.imageIds=taskImages.get(taskId)||[...new Set(imageIds)];data.instructions=instructions;
      const changes=[{collection:'requests',id,revision:0,data}];
      if(kind==='research'){data.researchId=id;changes.push({collection:'research',id,revision:0,data:{question:data.question,kind:data.researchKind,ref:data.ref,status:'waiting',answer:'',sources:[],createdAt:at,requestId:id}});}
      await commitRecords(db,changes);requests.push({id,data});out.push({id});
    }
    return reply({jobs:out});
  }
  if(action==='claim'&&request.method==='POST'){
    const controls=await read(db,'settings','codex-controls');
    if(controls?.data.paused)return reply({job:null,paused:true});
    const pending=(await list(db,'requests')).filter((r:any)=>eligible(r)&&(r.data.status==='pending'||r.data.status==='running'&&Date.parse(r.data.leaseUntil)<Date.now())).sort((a:any,b:any)=>a.data.createdAt.localeCompare(b.data.createdAt));
    const r=pending[0];if(!r)return reply({job:null});
    const lease=crypto.randomUUID(),rules=await read(db,'rules','inhouse'),tasks=await list(db,'tasks');
    const t=tasks.find((t:any)=>t.id===r.data.taskId),reset=t?tasks.find((x:any)=>x.data.forwardRec===t.id&&x.data.doc?.isReverse):null;
    const research=r.data.researchId?await read(db,'research',r.data.researchId):null;
    const data={...r.data,status:'running',workerId:input.workerId,lease,leaseUntil:new Date(Date.now()+90000).toISOString(),startedAt:clock(),rulesVersion:rules?.data.version||'',progress:'Reading current rules and task',snapshot:{taskRevision:t?.revision||0,resetId:reset?.id||'',resetRevision:reset?.revision||0,rulesRevision:rules?.revision||0,researchRevision:research?.revision||0}};
    await commitRecords(db,[change(r,data)],[{collection:'settings',id:'codex-controls',revision:controls?.revision||0}]);
    return reply({job:{id:r.id,...data},rules:rules?.data,task:t,reset,taskNames:tasks.map((t:any)=>({id:t.data.doc?.id||t.id,name:t.data.name,status:t.data.status})),platform:(await list(db,'platform')).map((x:any)=>x.data),lessons:(await list(db,'notes')).map((x:any)=>x.data)});
  }
  if(['complete','fail'].includes(action)&&request.method==='POST'){
    const r=await read(db,'requests',input.id);
    if(!r||r.data.status!=='running'||r.data.lease!==input.lease)return reply({message:'This request is no longer assigned to this worker.'},409);
    if(action==='fail'){
      const message=String(input.message||'Codex could not finish. Retry this request.').slice(0,1500);
      const changes=[change(r,{...r.data,status:'failed',error:message,completedAt:clock(),progress:'Needs attention'})];
      const q=r.data.researchId?await read(db,'research',r.data.researchId):null;if(q)changes.push(change(q,{...q.data,status:'failed',error:message}));
      await commitRecords(db,changes);return reply({ok:true});
    }
    const result=input.result;
    if(!result||JSON.stringify(result).length>600000)return reply({message:'Codex returned an empty or oversized result.'},400);
    const data={...r.data,status:'completed',completedAt:clock(),progress:'Saved in Boutique',result};
    const changes:any[]=[change(r,data)],guards:any[]=[];
    if(r.data.kind==='assist'){const rules=await read(db,'rules','inhouse');if((rules?.revision||0)!==r.data.snapshot.rulesRevision)return reply({message:'The rules changed during this idea review. Retry to use the latest rules.'},409);if(rules)guards.push({collection:'rules',id:'inhouse',revision:rules.revision});}
    if(['rewrite','write'].includes(r.data.kind)){
      const t=await read(db,'tasks',r.data.taskId),snap=r.data.snapshot;
      const rules=await read(db,'rules','inhouse');
      if(!t||t.revision!==snap.taskRevision||!rules||rules.revision!==snap.rulesRevision)return reply({message:'The task or rules changed. Retry to use the latest version.'},409);
      guards.push({collection:'rules',id:'inhouse',revision:snap.rulesRevision});
      const d=result.task,rd=result.reset;
      const writing=r.data.kind==='write';
      if(!d||!Array.isArray(d.initial)||!Array.isArray(d.steps)||!Array.isArray(d.target)||d.isReverse||!writing&&d.id!==t.data.doc.id)return reply({message:'Codex must return a complete forward task and preserve existing IDs.'},400);
      if(writing){
        if(t.data.doc||t.data.status!=='confirmed')return reply({message:'This name is no longer waiting for writing.'},409);
        const code=String(t.data.requestedId?t.data.requestedId.slice(0,3):t.data.parkedDoc?.code||d.code||'').toUpperCase(),allowed=rules.data.codes||{LIQ:1,LAB:1,LID:1,TOL:1,CAB:1,SRT:1,HOM:1,CLO:1,PAK:1,FIX:1};
        if(!Object.hasOwn(allowed,code))return reply({message:'Choose a valid task category.'},400);
        const counter=await read(db,'settings','task-numbering'),all=await list(db,'tasks');
        const maximum=Math.max(0,...all.map((x:any)=>{const m=String(x.data.doc?.id||'').match(new RegExp('^'+code+'-(\\d{3})R?$'));return m?+m[1]:0}),counter?.data[code]||0);
        if(maximum>=999)return reply({message:'This category needs an expanded ID format before another task can be written.'},400);
        const requested=String(t.data.requestedId||t.data.parkedDoc?.id||''),validRequested=new RegExp('^'+code+'-\\d{3}$').test(requested)&&+requested.slice(4)>0&&!all.some((x:any)=>x.data.doc?.id===requested||x.data.doc?.id===requested+'R');
        if(requested&&!validRequested)return reply({message:'The requested task ID is invalid, occupied or belongs to another category. Update the confirmed name before retrying.'},409);
        d.code=code;d.id=validRequested?requested:code+'-'+String(maximum+1).padStart(3,'0');d.bunch=t.data.bunch||code+' · '+t.data.name;
        changes.push(change(counter||{collection:'settings',id:'task-numbering',revision:0,data:{}},{...counter?.data,[code]:Math.max(maximum,+d.id.slice(4))}));
      }else{d.code=t.data.doc.code;d.bunch=t.data.doc.bunch;}
      normalizeTaskZones(d);d.name=t.data.doc?.name||t.data.name;
      if(d.reverse?.possible!==false&&!rd)return reply({message:'A possible reset must be written.'},400);
      const oldReset=snap.resetId?await read(db,'tasks',snap.resetId):null;
      if((oldReset?.revision||0)!==snap.resetRevision)return reply({message:'The reset changed. Retry to use the latest version.'},409);
      if(oldReset&&!rd)return reply({message:'The existing reset is preserved. Explain a proposed removal in a review note.'},400);
      const checks=inspectTask(d,rules.data,assets);
      if(rd){normalizeTaskZones(rd);rd.isReverse=true;rd.id=d.id+'R';rd.forwardId=d.id;rd.name='Reset: '+d.name;rd.code=d.code;rd.bunch=oldReset?.data.doc.bunch||d.bunch;rd.initial=resetInitial(d,rd);rd.workZones=rd.workZones||d.workZones;}
      const rc=rd?inspectTask(rd,rules.data,assets):[];
      const status=writing||checks.concat(rc).some((c:any)=>!c.ok&&c.level==='bad')||(result.reviewNotes||[]).length?'review':'described';
      changes.push(change(t,{...t.data,name:d.name,doc:d,checks,status,rulesVersion:rules.data.version,updatedAt:clock(),editedBy:'Codex',reviewNotes:result.reviewNotes||[],attempts:input.attempts||1}));
      if(rd){const resetId=t.id+'r',occupied=!oldReset?await read(db,'tasks',resetId):null;if(occupied)return reply({message:'The reset record ID is already occupied; no records were changed.'},409);const rr=oldReset||{collection:'tasks',id:resetId,revision:0,data:{}};changes.push(change(rr,{...rr.data,forwardRec:t.id,name:rd.name,doc:rd,checks:rc,status,rulesVersion:rules.data.version,updatedAt:clock(),editedBy:'Codex'}));}
      data.result={taskId:t.id,taskCode:d.id,status,reviewNotes:result.reviewNotes||[]};
    }
    if(r.data.kind==='research'){
      const q=await read(db,'research',r.data.researchId);
      if(!q||q.revision!==r.data.snapshot.researchRevision)return reply({message:'This question changed or was removed. Its answer remains in the request.'},409);
      if(typeof result.answer!=='string'||!Array.isArray(result.sources))return reply({message:'Research needs an answer and source list.'},400);
      const sources=result.sources.filter((s:any)=>typeof s.url==='string'&&/^https?:\/\//.test(s.url));
      changes.push(change(q,{...q.data,status:'done',answer:result.answer,sources,answeredAt:clock(),error:''}));
    }
    await commitRecords(db,changes,guards);return reply({ok:true,result:data.result});
  }
  if(action==='retry'&&request.method==='POST'){
    const r=await read(db,'requests',input.id);
    if(!r||!eligible(r)||r.data.status!=='failed')return reply({message:'Retry a failed request, restart a paused request, or add a follow-up to a saved result.'},400);
    const changes=[change(r,{...r.data,status:'pending',error:'',result:null,completedAt:'',progress:'Waiting for Codex',createdAt:clock()})];
    const q=r.data.researchId?await read(db,'research',r.data.researchId):null;
    if(q)changes.push(change(q,{...q.data,status:'waiting',error:''}));
    await commitRecords(db,changes);return reply({ok:true});
  }
  return reply({message:'Agent action not found.'},404);
}
