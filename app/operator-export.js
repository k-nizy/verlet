// The saved operator / QC template follows the earlier operator-task sheet.
import {ZONES,zonePlan,STANDARD_MISTAKES} from './task-pack.js';
const ink='FF173842', shade='FFEAF2F1', editable='FFFFF2CC';
const arr=x=>Array.isArray(x)?x.map(String):String(x||'').split('\n').filter(Boolean);
const text=x=>x==null?'':Array.isArray(x)?x.map(text).join('\n'):typeof x==='object'?JSON.stringify(x):String(x);
const zname=z=>ZONES.includes(z)?z+' ('+(ZONES.indexOf(z)+1)+')':'Review actual setup';
const place=x=>[x?.place,arr(x?.zones).length?'Allowed zones: '+arr(x.zones).map(zname).join(', '):''].filter(Boolean).join('; ')||'See item condition';
const endPlace=(d,r)=>place(r)+(!r.place&&(d.initial||[]).find(i=>i.item===r.item)?.role==='product'?'; not its start zone':'');
const numbered=x=>arr(x).map((v,i)=>(i+1)+'. '+v).join('\n');
function chunks(value,width,maxLines=22){
  const paragraphs=text(value).split('\n'),out=[];let lines=[];
  function push(s){lines.push(s);if(lines.length>=maxLines){out.push(lines.join('\n'));lines=[]}}
  for(const p of paragraphs){if(!p){push('');continue}let rest=p;while(rest.length>width){let n=rest.lastIndexOf(' ',width);if(n<width/2)n=width;push(rest.slice(0,n));rest=rest.slice(n).replace(/^\s+/,'')}push(rest)}
  if(lines.length)out.push(lines.join('\n'));return out.length?out:[''];
}
export function buildWorkbook(ExcelJS,snapshot){
  if(!Array.isArray(snapshot.records))throw Error('Saved task data could not be read. Reload and retry.');
  const tasks=snapshot.records.filter(r=>r.collection==='tasks'&&r.data.doc).map(r=>({...r.data,appId:r.id})).sort((a,b)=>a.doc.id.localeCompare(b.doc.id));
  const forwards=tasks.filter(t=>!t.doc.isReverse),reverses=tasks.filter(t=>t.doc.isReverse);if(!forwards.length)throw Error('No written tasks found.');
  const rules=snapshot.records.find(r=>r.collection==='rules'&&r.id==='inhouse')?.data;
  const wb=new ExcelJS.Workbook();wb.creator='Boutique';wb.title='Operator and QC task sheets';wb.created=new Date(snapshot.at||Date.now());
  function table(name,subtitle,headers,widths,rows){
    const s=wb.addWorksheet(name,{views:[{state:'frozen',ySplit:4,xSplit:2,showGridLines:false}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:4'}});s.columns=widths.map(width=>({width}));
    s.getCell('A1').value=name;s.getCell('A1').font={name:'Arial',size:15,bold:true,color:{argb:ink}};s.getRow(1).height=25;
    s.getCell('A2').value=subtitle;s.mergeCells(2,1,2,Math.min(headers.length,5));s.getCell('A2').font={name:'Arial',size:10,color:{argb:ink}};s.getRow(2).height=25;
    let h=s.getRow(4);h.values=headers;h.height=30;h.eachCell(c=>{c.font={name:'Arial',size:10,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:ink}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true}});
    const keyCols=name==='Operator Tasks'?2:name==='Evaluation log'?3:4;
    for(const [i,row] of rows.entries()){const parts=row.map((v,j)=>chunks(v,widths[j]-3));const count=Math.max(...parts.map(p=>p.length));for(let part=0;part<count;part++){let r=s.addRow(parts.map((v,j)=>j<keyCols&&part? (j===1?text(row[1])+' (continued)':text(row[j])):v[part]||null));let n=1;r.eachCell({includeEmpty:true},(c,j)=>{c.font={name:'Arial',size:10,color:{argb:ink}};c.alignment={vertical:'top',wrapText:true};if(i%2)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:shade}};n=Math.max(n,text(c.value).split('\n').length)});r.height=Math.min(360,Math.max(24,n*14+8));}}
    if(rows.length)s.autoFilter={from:{row:4,column:1},to:{row:s.rowCount,column:headers.length}};return s;
  }
  const review=t=>{const parent=tasks.find(p=>p.appId===t.forwardRec);return (t.reviewNotes?.length?t.reviewNotes:parent?.reviewNotes||[]).filter(n=>!/schema|banned.word|prohibited conditional|conditional token|location arrays?|missing.location|initial state.*reproduces|initial state.*matches|preserved IDs|filled every previously empty|the app must|platform catalogue|duplicate verification/i.test(n))};
  const rows=tasks.map(t=>{let d=t.doc,v=d.variation||{},pair=d.isReverse?d.forwardId:(reverses.find(x=>x.forwardRec===t.appId)?.doc.id||'None: '+(d.reverse?.why||'See task'));
    let initial=(d.initial||[]).map(x=>'[ ] '+x.item+' ('+(x.role||'item')+'): '+x.how+' '+place(x)).join('\n');
    let target=(d.target||[]).map(x=>x.item+': '+x.how+' End: '+endPlace(d,x)).join('\n');
    let notes=['Written under rules v'+(t.rulesVersion||'unknown')+'; current rules v'+(rules?.version||'unknown')+'.',t.status==='review'?'REVIEW BEFORE RECORDING: resolve the notes below and test on the rig.':'',d.rigTest?'Rig test first: '+d.rigTest:'',...review(t).map(n=>'Review: '+n),d.zoneNotes?'Zone notes: '+d.zoneNotes:'',d.needs?'Needs: '+d.needs:''].filter(Boolean).join('\n');
    const qcLabel=t.rulesVersion==='1.10'?'Task-specific failure checks (fail if observed):':'Task-specific QC observations (compare with Pass and Fail):';
    const qc=['First frame: check each listed item and the chosen start state before movement.','During: no standard mistake.\n'+numbered(STANDARD_MISTAKES),qcLabel+'\n'+numbered(d.qc),'Last frame: check every Target State row after release. Clean means a valid start, no mistake and every target true. Failed: record the mistake and its second.'].join('\n');
    return [d.id,d.name,d.instruction+'\n\n'+numbered(d.steps),qc,d.pass,d.fail,initial,notes,target,(d.initial||[]).map(x=>x.item+': '+x.how).join('\n'),d.allowedTypes||'See start and target conditions.',[d.free,v.qcNever?'QC does not judge: '+v.qcNever:'','Additional start states, methods and endings: see Variations.'].filter(Boolean).join('\n'),pair]});
  table('Operator Tasks',`${forwards.length} tasks · ${reverses.length} reverses · Both teams use the same row. Review and test flagged items before recording.`,['Task ID','Task name','Instruction and steps','QC Check, Step by Step','Pass','Fail','Before-Record Checklist','Setup Notes','Target State and End Zones','Items and Quantities','Allowed Colors and Types','Keep Rules','Paired Task ID'],[16,38,74,65,55,55,68,76,70,65,48,65,18],rows);
  let variations=[],zones=[],evaluation=[];
  for(const t of tasks){const d=t.doc,v=d.variation||{};for(const [key,name] of [['startVariants','Start state'],['start','Setup choices'],['doing','Method'],['end','Ending arrangement'],['scenarios','Real-life scenario'],['mistakes','Common mistake']])arr(v[key]).forEach((x,i)=>variations.push([d.id,d.name,name,String(i+1),x]));if(v.qcNever)variations.push([d.id,d.name,'QC does not judge','',v.qcNever]);
    if(v.startReason)variations.push([d.id,d.name,'Start-state limit reason','',v.startReason]);variations.push([d.id,d.name,'Estimated time','',v.time||'Not timed']);
    for(const run of zonePlan(d))variations.push([d.id,d.name,'Suggested zone run',String(run.n),'Work: '+zname(run.work)+'; State: '+run.variant+'\n'+run.items.map(i=>i.item+': '+(i.container?'inside '+i.container+'; start with container in '+zname(i.start):'start '+zname(i.start))+(i.endZone?'; end '+zname(i.endZone):i.endPlace?'; end '+i.endPlace:'')).join('\n')]);
    for(const i of d.initial||[]){const e=(d.target||[]).find(x=>x.item===i.item);zones.push([d.id,d.name,i.item,i.role,i.how,place(i),e?.how||'',e?endPlace(d,e):'',arr(d.workZones).map(zname).join(', '),d.zoneNotes||''])}
    arr(v.startVariants).forEach((x,i)=>evaluation.push([d.id,d.name,String(i+1),x,'','','','','','','','','','','','','',t.status==='review'?'Review before recording':'See rig-test notes']));
  }
  table('Variations','All saved realistic options, including uncommon ones. The lists remain expandable.',['Task ID','Task name','Type','Option','Details'],[16,38,25,12,110],variations);
  table('Zone coverage','Allowed zones and per-item placements. Untested restrictions remain review items.',['Task ID','Task name','Item','Role','Start condition','Start zones','End condition','End zones or placement','Work zones','Restrictions and rig tests'],[16,38,28,20,68,55,68,55,45,70],zones);
  const ev=table('Evaluation log','Copy a row for each episode; operators and QC record the actual state, method, ending and zones.',['Task ID','Task name','Start option','Planned start state','Run ID','Video ID','Operator','Date','Actual start state','Start zones','Actual method','Ending arrangement','End zones','Work zone','Clean / Failed','Mistake second','QC notes','Readiness'],[16,38,12,75,18,20,20,18,65,55,65,65,55,22,18,18,65,25],evaluation);
  for(let r=5;r<=ev.rowCount;r++){for(let c=5;c<=17;c++)ev.getCell(r,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:editable}};ev.getCell(r,15).dataValidation={type:'list',allowBlank:true,formulae:['"Clean,Failed"']};}
  return {workbook:wb,counts:{tasks:forwards.length,reverses:reverses.length,sheets:wb.worksheets.length},date:new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg'}).format(new Date(snapshot.at||Date.now())),rulesVersion:rules?.version};
}
let loading;
export async function prepareFullExport(){
  loading=loading||new Promise((resolve,reject)=>{if(window.ExcelJS)return resolve(window.ExcelJS);let s=document.createElement('script');s.src='/lib/exceljs-4.4.0.min.js';s.onload=()=>window.ExcelJS?resolve(window.ExcelJS):reject(Error('Excel library did not load.'));s.onerror=()=>reject(Error('Could not load Excel export. Retry.'));document.head.appendChild(s)}).catch(e=>{loading=null;throw e});
  const [ExcelJS,snapshot]=await Promise.all([loading,window.boutique.api('state')]);const built=buildWorkbook(ExcelJS,snapshot),buffer=await built.workbook.xlsx.writeBuffer();return {...built,blob:new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename:`Boutique_Operator_QC_${built.date}.xlsx`};
}
