// Shared by the live task view, selected exports and printable operator packs.
import {simpleOperatorText} from './operator-language.js';
export const ZONES=['Supply','Tool','Used Equipment','Staging','Operation','Finished Goods'];
const list=x=>Array.isArray(x)?x:[];
const rx=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function startContainer(d,row){return list(d.initial).filter(x=>x.item!==row.item).sort((a,b)=>b.item.length-a.item.length).find(x=>new RegExp('\\binside (?:the )?(?:closed |open )?'+rx(x.item)+'\\b','i').test((row.place||'')+' '+row.how))?.item||''}
export function selectedSnapshot(snapshot,ids){
  const selected=new Set(ids),records=snapshot.records.filter(r=>r.collection!=='tasks'||selected.has(r.id)||selected.has(r.data.forwardRec));
  const tasks=records.filter(r=>r.collection==='tasks'&&r.data.doc);if(!tasks.some(r=>!r.data.doc.isReverse))throw Error('Select a written forward task first.');
  return {...snapshot,records};
}
function endFor(d,row){return list(d.target).find(t=>t.item.toLowerCase()===row.item.toLowerCase())}
const startZones=r=>list(r.zones).length?r.zones:/where it started/i.test(r.place||'')?ZONES:[];
function ends(z,ez,n,offset){const starts=Array.from({length:n},(_,k)=>z[(k+offset)%z.length]),out=[];function go(k,seen){if(k===n)return ez.every(e=>seen.has(e));if(ez.filter(e=>!seen.has(e)).length>n-k)return false;for(const e of [...ez].filter(e=>e!==starts[k]).sort((a,b)=>Number(seen.has(a))-Number(seen.has(b)))){out[k]=e;if(go(k+1,new Set([...seen,e])))return true}return false}return go(0,new Set())?out:null}
export function zonePlan(d){
  const rows=list(d.initial),work=list(d.workZones),variants=list(d.variation?.startVariants),n=Math.max(1,Math.min(6,Math.max(work.length,variants.length,...rows.map(r=>list(r.zones).length))));
  const assignments=new Map(),anchor=rows.find(r=>r.role==='base'&&!startContainer(d,r));
  for(const [i,r] of rows.entries())if(!startContainer(d,r)){const z=startZones(r);assignments.set(r.item,Array.from({length:n},(_,k)=>z.length?z[(k+(r===anchor?0:i))%z.length]:''))}
  function starts(r,seen=new Set()){if(seen.has(r.item))throw Error('Circular item containment needs review.');const c=startContainer(d,r);if(!c)return assignments.get(r.item)||Array(n).fill('');return starts(rows.find(x=>x.item===c),new Set([...seen,r.item]))}
  const plans=rows.map((r,i)=>{const z=list(r.zones),target=endFor(d,r);return {r,start:starts(r),end:r.role==='product'&&!target?.place&&z.length?ends(z,list(target?.zones).length?target.zones:ZONES,n,anchor===r?0:i):null}});
  return Array.from({length:n},(_,k)=>({n:k+1,work:anchor?assignments.get(anchor.item)[k]:work[k%work.length]||'',variant:variants[k%variants.length]||'',items:plans.map(({r,start,end})=>({item:r.item,start:start[k],container:startContainer(d,r),endZone:end?.[k]||'',endPlace:endFor(d,r)?.place||'',noPlan:r.role==='product'&&!endFor(d,r)?.place&&!end}))}));
}
export function zoneRows(d){return list(d.initial).map(r=>{const end=endFor(d,r),container=startContainer(d,r),source=container?list(d.initial).find(x=>x.item===container):r;return {item:r.item,role:r.role,container,cells:ZONES.map(z=>[startZones(source).includes(z)?(container?'With container':'Start'):'',!end?.place&&list(end?.zones).includes(z)?'End':''].filter(Boolean).join(' / ')||'-'),end:end?.place||'Any allowed end zone; product outside its actual start zone'}})}
export const STANDARD_MISTAKES=['An item is dropped, anywhere.','An item falls or is knocked over.','Liquid spills.','Something is forced, torn, bent or crushed.','The wrong item is used.','An unused item is used for the job, moved without obstruction, moved twice, or moved off the mat.','A required before/after order is broken.','The operator stops and restarts.','The third failed try at the same action.','Wasted motion: needless back-and-forth, repeated adjustments, hovering or idle pauses.'];
export const INCIDENT='If something goes wrong: if anything is dropped, knocked over, broken or spilled, stop, set up a valid start again and record again. A video with a mistake that is saved anyway is marked Failed, with the second it happened.';
function plain(s){return simpleOperatorText(s??'').normalize('NFKC').replace(/[–—‑]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/→/g,' to ').replace(/×/g,' x ').replace(/[^\x20-\x7e\n]/g,' ')}
export async function buildOperatorPdf(PDFLib,snapshot,{operatorOnly=true}={}){
  const incident=operatorOnly?'If anything is dropped, knocked over, broken or spilled, stop. Set up a valid start again and record a new episode.':INCIDENT;
  const {PDFDocument,StandardFonts,rgb}=PDFLib,pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const tasks=snapshot.records.filter(r=>r.collection==='tasks'&&r.data.doc).sort((a,b)=>a.data.doc.id.localeCompare(b.data.doc.id)),rules=snapshot.records.find(r=>r.collection==='rules'&&r.id==='inhouse')?.data.version||'';
  if(!tasks.length)throw Error('No written task selected.');
  const W=595.28,H=841.89,M=38,CW=W-2*M,ink=rgb(.10,.19,.16),sage=rgb(.90,.93,.89),red=rgb(.66,.19,.14);let page,y,section='Quick start';
  const draft=tasks.some(r=>r.data.status==='review'||r.data.checks?.some(c=>!c.ok));
  function newPage(){page=pdf.addPage([W,H]);y=H-M;page.drawText('BOUTIQUE  /  OPERATOR GUIDE',{x:M,y,size:9,font:bold,color:ink});page.drawText(draft?'REVIEW PILOT':'TASK PACK',{x:W-M-90,y,size:9,font:bold,color:draft?red:ink});page.drawText(plain(section),{x:M,y:y-13,size:8,font:regular,color:ink});y-=33;}
  function wrap(value,width,size=10,font=regular){const out=[];for(const para of plain(value).split('\n')){let line='';for(const word of para.split(/\s+/)){if(font.widthOfTextAtSize((line?line+' ':'')+word,size)>width&&line){out.push(line);line=word}else line+=(line?' ':'')+word}out.push(line)}return out}
  function ensure(height){if(y-height<44)newPage()}
  function text(value,{size=10,font=regular,color=ink,width=CW,indent=0,gap=6}={}){const lines=wrap(value,width-indent,size,font);for(const line of lines){ensure(size*1.4);page.drawText(line,{x:M+indent,y:y-size,size,font,color});y-=size*1.4}y-=gap}
  function heading(value){ensure(96);y-=7;text(value,{size:13,font:bold,gap:7})}
  function bullets(values){for(const value of list(values))text('- '+value,{indent:4,gap:3});y-=5}
  function table(headers,widths,values){
    function row(cells,header=false){const lines=cells.map((v,i)=>wrap(v,widths[i]-12,header?8.5:9,header?bold:regular)),height=Math.max(...lines.map(a=>a.length))*12+12;ensure(height);let x=M;for(let i=0;i<cells.length;i++){page.drawRectangle({x,y:y-height,width:widths[i],height,color:header?sage:rgb(1,1,1),borderColor:rgb(.75,.79,.74),borderWidth:.5});for(const [j,line] of lines[i].entries())page.drawText(line,{x:x+6,y:y-14-j*12,size:header?8.5:9,font:header?bold:regular,color:ink});x+=widths[i]}y-=height}
    row(headers,true);for(const value of values){const height=Math.max(...value.map((v,i)=>wrap(v,widths[i]-12,9).length))*12+12;if(y-height<44){newPage();row(headers,true)}row(value)}y-=10;
  }
  const zoneName=z=>z?z+' ('+(ZONES.indexOf(z)+1)+')':'Review actual setup';
  const location=r=>r.place||(list(r.zones).length===6?'Any zone (1-6)':list(r.zones).map(zoneName).join(', '));
  newPage();text('Operator quick start',{size:25,font:bold,gap:10});text(tasks.filter(r=>!r.data.doc.isReverse).map(r=>r.data.doc.id).join(', ')+' / tasks and linked resets',{size:14,gap:12});
  text('Read this quick start, the chosen task card and one start state before recording. Methods and endings are options, not a fixed sequence.');
  if(draft)text('Review pilot: resolve equipment, visibility and rig-test notes before recording or platform delivery.',{font:bold,color:red});
  heading('Before during and after the task');bullets(['Before movement: compare the setup with the Initial State and selected valid start state. Closed opaque containers need a visibility-rule decision before this pilot is approved.','During the episode: no standard or task-specific mistake. Required action dependencies apply; independent action order stays free.','After the last action: compare every Target State row, including item placement and closures. Closed contents need evidence from the visible task sequence; do not claim they are directly visible.']);
  heading('Choose zones and variations');bullets(['Choose any allowed start, work and end zones. Contained items share their container zone.','A product ends outside its own start zone unless its job ends inside/onto its destination or returns it to its original location.','The six-run plan is a suggestion. Record 5-10 episodes per run using one start state and zone setup. Change how items are handled between episodes.','Across each two-hour block, cover every allowed product start/end zone, work zone and meaningful start state. The shift lead checks coverage; it is not a per-video QC failure.','Ordinary/uncommon labels are qualitative suggestions. Untested methods or arrangements need the named equipment and a successful rig check. Time estimates alone never fail a video.']);
  heading('Standard mistakes');bullets(STANDARD_MISTAKES);text(incident,{size:9});
  for(const record of tasks){const t=record.data,d=t.doc,v=d.variation||{};section=d.id;newPage();text(d.id,{size:11,font:bold,color:red});text(d.name,{size:20,font:bold,gap:10});text(d.instruction,{size:12,font:bold,gap:9});text('Written under rules v'+(t.rulesVersion||'unknown')+' / Current rules v'+rules+' / '+(t.status==='review'?'Review before recording':'Check rig-test notes')+' / '+(d.isReverse?'Forward task: '+d.forwardId:'Reset: '+(tasks.find(r=>r.data.forwardRec===record.id)?.data.doc.id||'See reset decision')),{size:9});
    heading('Initial State');table(['Item / role','Condition','Start location'],[110,260,CW-370],list(d.initial).map(r=>[r.item+' / '+r.role,r.how,location(r)]));
    heading('Steps');bullets(list(d.steps).map((s,i)=>(i+1)+'. '+s));
    heading('Target State');table(['Item','Finished condition','End location'],[100,265,CW-365],list(d.target).map(r=>[r.item,r.how,r.place||'Any allowed zone except its start zone']));
    heading('Free choices');text(d.free);
    heading('Task mistakes to avoid');bullets(d.qc);if(!operatorOnly){text('Pass: '+d.pass);text('Fail: '+d.fail);text('Clean = valid start, no mistake, and every target true. Failed = anything else. Record the mistake and the second it happened.');}
    heading('Before use');text('Use only equipment and arrangements approved on the actual rig. Check model-dependent or untested choices with the team.');const forward=d.isReverse?tasks.find(r=>r.id===t.forwardRec||r.data.doc.id===d.forwardId)?.data.doc:null;const setupValue=(key)=>String(d[key]||forward?.[key]||'Not specified; confirm setup');text('Uses up: '+setupValue('usesUp')+' / Waste holder: '+setupValue('wasteHolder'));
    section=d.id+' / Variations';newPage();text(section,{size:20,font:bold,gap:10});text('Time per episode: '+(v.time||'Not timed.'));heading('Start states - choose one per run');bullets(list(v.startVariants).map((s,i)=>(i+1)+'. '+s));if(v.startReason)text('Why fewer start states: '+v.startReason);heading('Setup choices');bullets(v.start);heading('Realistic methods');bullets(v.doing);heading('Ending arrangements');bullets(v.end);heading('Real-world situations');bullets(v.scenarios);heading('Common mistakes');bullets(v.mistakes);heading('Free choices');text(v.qcNever);
    section=d.id+' / Zone map';newPage();text(section,{size:20,font:bold,gap:10});text('1 Supply / 2 Tool / 3 Used Equipment / 4 Staging / 5 Operation / 6 Finished Goods',{size:9});
    table(['Item','1','2','3','4','5','6'],[135,64,64,64,64,64,CW-455],zoneRows(d).map(r=>[r.item,...r.cells]));
    for(const r of zoneRows(d))text(r.item+': '+(r.container?'starts inside '+r.container+'; ':'')+'ends '+r.end,{size:9});
    heading('Work zones');text(list(d.workZones).map(zoneName).join(', '));heading('Zone limits and tests');text(d.zoneNotes,{size:9});heading('Suggested zone rotation');
    table(['Setup / start state','Work zone','Item placements'],[80,94,CW-174],zonePlan(d).map(r=>[String(r.n)+' / state '+String((r.n-1)%Math.max(1,list(v.startVariants).length)+1),zoneName(r.work),r.items.map(i=>i.item+': '+(i.container?'inside '+i.container+'; starts in zone '+(ZONES.indexOf(i.start)+1):'starts in zone '+(ZONES.indexOf(i.start)+1))+(i.endZone?'; ends in zone '+(ZONES.indexOf(i.endZone)+1):i.endPlace?'; end '+i.endPlace:i.noPlan?'; plan needs review':'')).join('\n')]));
    text('The plan is optional. Containment and role conditions always apply; review any infeasible zone combination on the actual rig.',{size:9});text(incident,{size:9});
  }
  if(!operatorOnly){section='Run log';newPage();text('Run log',{size:22,font:bold,gap:10});text('Task ID: __________   Date: __________   Operator: __________');text('Record actual choices. Use another row for each run and record failed-video details with the video ID.');
  table(['Run / video IDs','Start state / zones','Method / ending / work zone','Clean / Failed; mistake + second'],[90,135,150,CW-375],Array.from({length:8},()=>['\n\n','\n\n','\n\n','\n\n']));}
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg'}).format(new Date(snapshot.at||Date.now()));
  for(const [i,p] of pdf.getPages().entries()){p.drawText('Boutique | Rules v'+rules+' | '+date+' | '+(draft?'Review pilot':'Task pack'),{x:M,y:24,size:8,font:regular,color:ink});p.drawText(String(i+1)+' / '+pdf.getPageCount(),{x:W-M-35,y:24,size:8,font:regular,color:ink})}
  pdf.setTitle(tasks[0].data.doc.id+' Operator and QC pilot');pdf.setAuthor('Boutique');return {bytes:await pdf.save(),pages:pdf.getPageCount(),draft};
}
