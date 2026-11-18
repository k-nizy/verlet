import { env } from 'cloudflare:workers';
import assets from '../../public/ref/assets.json';
import bench from '../../public/ref/bench.json';
import library from '../../public/ref/library.json';
import { handle } from '../../lib/workroom';
export const dynamic='force-dynamic';
const object={type:'object',additionalProperties:false};
const tools=[
  {name:'read_research_context',description:'Read Boutique’s current research instructions, writing rules, existing jobs, recent leads, stock and rig notes. Supply search to check a proposed job against the saved platform catalogue.',inputSchema:{...object,properties:{search:{type:'string',maxLength:200}}},annotations:{readOnlyHint:true}},
  {name:'save_daily_research',description:'Save a sourced daily research briefing to Boutique, preserving previous lead positions and user decisions. Requires the current news revision from read_research_context.',inputSchema:{...object,properties:{date:{type:'string',pattern:'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'},expectedRevision:{type:'integer',minimum:0},briefing:{type:'object',properties:{items:{type:'array',items:{type:'object'}},leads:{type:'array',items:{type:'object'}}},required:['items','leads']}},required:['date','expectedRevision','briefing']},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}}
];
const normalize=(s:any)=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function records(c:string){return (await env.DB!.prepare('SELECT id,value,revision FROM records WHERE collection=? ORDER BY id').bind(c).all()).results.map((r:any)=>({id:r.id,data:JSON.parse(r.value),revision:r.revision}));}
async function context(search=''){
  const [rules,settings,tasks,news,platform,shelf,notes]=await Promise.all(['rules','settings','tasks','news','platform','shelf','notes'].map(records));
  const term=normalize(search),catalogue=platform.flatMap((r:any)=>r.data.tasks||[]);
  const match=(x:any)=>!term||term.split(' ').filter(Boolean).some(w=>normalize(JSON.stringify(x)).includes(w));
  return {currentDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),guide:settings.find(r=>r.id==='codex-daily-guide')?.data,rules:rules.find(r=>r.id==='inhouse')?.data,
    existingJobs:tasks.filter(r=>match({name:r.data.doc?.name||r.data.name,instruction:r.data.doc?.instruction})).map(r=>({appId:r.id,taskId:r.data.doc?.id,name:r.data.doc?.name||r.data.name,instruction:r.data.doc?.instruction,status:r.data.status})),
    oldFamilies:library.families.filter(match).map((f:any)=>({id:f.id,name:f.family,job:f.task})),
    recentBriefings:news.slice(-14).map(r=>({id:r.id,revision:r.revision,data:r.data})),
    earlierLeadMatches:term?news.flatMap(r=>(r.data.leads||[]).map((l:any)=>({date:r.id,name:l.name}))).filter(match):[],
    platform:{count:catalogue.length,info:platform.find(r=>r.id==='info')?.data||null,matches:term?catalogue.filter(match).slice(0,100):[],warning:catalogue.length?'Search proposed jobs; absence of a lexical match does not establish uniqueness.':'Full saved platform catalogue is empty; duplicate checks are incomplete.'},
    assets,bench,shelf:shelf.map(r=>r.data),rigNotes:notes.map(r=>r.data)};
}
async function save(request:Request,args:any){
  const {date,expectedRevision,briefing}=args;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!Number.isInteger(expectedRevision)||expectedRevision<0)throw Error('Supply a valid date and current revision.');
  if(!briefing||!Array.isArray(briefing.items)||!Array.isArray(briefing.leads)||briefing.items.length>50||briefing.leads.length>100)throw Error('Supply a bounded story and lead list.');
  if(!briefing.items.every((x:any)=>x.title&&/^https?:\/\//.test(x.url||'')))throw Error('Every story needs a title and supporting source URL.');
  if(!briefing.leads.every((x:any)=>x.name&&x.notes&&(!x.videoUrl||/^https?:\/\//.test(x.videoUrl))))throw Error('Each lead needs a name, honest review notes and a valid reference URL when available.');
  const old=(await records('news')).find(r=>r.id===date);
  if((old?.revision||0)!==expectedRevision)throw Error('The daily record changed. Read current context before saving.');
  // Lead keys use date plus list position. Append only: never re-sort or replace
  // existing leads, which would attach votes and decisions to a different job.
  const previous=old?.data||{},items=[...(previous.items||[])],leads=[...(previous.leads||[])];
  for(const x of briefing.items)if(!items.some((y:any)=>y.url===x.url))items.push(x);
  for(const x of briefing.leads)if(!leads.some((y:any)=>normalize(y.name)===normalize(x.name)))leads.push(x);
  const data={...previous,...briefing,date,createdAt:previous.createdAt||new Date().toISOString(),researchedAt:new Date().toISOString(),items,leads};
  const response=await handle(new Request(new URL('/api/record/news/'+date,request.url),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,expectedRevision})}),['record','news',date]);
  const result:any=await response.json();if(!response.ok)throw Error(result.message||result.error||'The briefing was not saved.');
  const saved=(await records('news')).find(r=>r.id===date)!;
  return {saved:true,date,revision:saved.revision,stories:saved.data.items.length,leads:saved.data.leads.length,referenceLinks:saved.data.leads.filter((l:any)=>l.videoUrl).length};
}
// Sites authenticates /mcp and checks the Site's private allowlist. Both allowed
// visitors are authorized content editors; preserve that audience and boundary.
export async function POST(request:Request){
  let rpc:any;
  try{
    const origin=request.headers.get('Origin');
    if(origin&&origin!==new URL(request.url).origin&&!['https://chatgpt.com','https://chat.openai.com'].includes(origin))return Response.json({error:'Origin not allowed.'},{status:403});
    const raw=await request.text();if(raw.length>700000)throw Error('Request too large.');rpc=JSON.parse(raw);
    if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
    let result:any;
    if(rpc.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
    else if(rpc.method==='initialize')result={protocolVersion:rpc.params?.protocolVersion||'2026-07-28',serverInfo:{name:'Boutique research',version:'1.0.0'},capabilities:{tools:{}}};
    else if(rpc.method==='tools/list')result={tools};
    else if(rpc.method==='tools/call'){
      try{const name=rpc.params?.name,args=rpc.params?.arguments||{};const data=name==='read_research_context'?await context(args.search):name==='save_daily_research'?await save(request,args):(()=>{throw Error('Unknown Boutique tool.');})();result={content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};}
      catch(e:any){result={isError:true,content:[{type:'text',text:e.message}]};}
    }else return Response.json({jsonrpc:'2.0',id:rpc.id,error:{code:-32601,message:'Method not found'}},{status:200});
    return Response.json({jsonrpc:'2.0',id:rpc.id,result},{headers:{'Cache-Control':'no-store'}});
  }catch(e:any){return Response.json({jsonrpc:'2.0',id:rpc?.id||null,error:{code:-32602,message:e.message}},{status:400});}
}
