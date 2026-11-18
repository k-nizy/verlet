import {zoneRows,zonePlan,ZONES,STANDARD_MISTAKES} from './task-pack.js';
import {simpleOperatorText as easy} from './operator-language.js';

// Native editable Word tables and text from this export's saved snapshot.
export async function buildOperatorWord(D,snapshot){
 const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,BorderStyle,HeadingLevel,AlignmentType,VerticalAlign,Header,Footer,PageNumber,PageOrientation,SectionType}=D;
 const records=snapshot.records.filter(r=>r.collection==='tasks'&&r.data.doc).sort((a,b)=>a.data.doc.id.localeCompare(b.data.doc.id));
 if(!records.length)throw Error('Select a written task first.');
 const rules=snapshot.records.find(r=>r.collection==='rules'&&r.id==='inhouse')?.data.version||'';
 const draft=records.some(r=>r.data.status==='review'||r.data.checks?.some(c=>!c.ok)),sections=[];
 const list=x=>Array.isArray(x)?x:[],zone=z=>ZONES.includes(z)?z+' ('+(ZONES.indexOf(z)+1)+')':z||'Review actual setup';
 const p=(text,opts={})=>new Paragraph({children:[new TextRun({text:easy(text??''),...opts.run})],spacing:{after:70},...opts});
 const heading=(text,level=HeadingLevel.HEADING_2)=>p(text,{heading:level,keepNext:true});
 const bullet=text=>p(text,{bullet:{level:0},spacing:{after:55},run:{size:21}});
 const location=r=>r.place||(r.zones?.length===6?'Any zone (1–6)':list(r.zones).map(zone).join(', '));
 const border={style:BorderStyle.SINGLE,size:4,color:'C9D3C4'},none={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
 function table(headers,widths,rows,{redColumns=[],workRow=false}={}){
  const makeRow=(values,header=false,index=0)=>new TableRow({tableHeader:header,cantSplit:true,children:values.map((value,i)=>new TableCell({
   width:{size:widths[i],type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,
   shading:header?{fill:'EFF2E9'}:workRow&&index===rows.length-1?{fill:'EEECDC'}:{fill:'FFFEFA'},
   margins:{top:85,bottom:85,left:100,right:100},
   children:String(value??'').split('\n').map(t=>p(t,{spacing:{after:25,line:230},run:{size:20,bold:header||i===0,color:!header&&redColumns.includes(i)?'BE3528':'182E2A'},alignment:headers.length>6&&i>0&&i<7?AlignmentType.CENTER:AlignmentType.LEFT}))
  }))});
  return new Table({width:{size:widths.reduce((a,b)=>a+b,0),type:WidthType.DXA},columnWidths:widths,borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows:[makeRow(headers,true),...rows.map((r,i)=>makeRow(r,false,i))]});
 }
 function columns(left,right){return new Table({width:{size:15398,type:WidthType.DXA},columnWidths:[7699,7699],borders:{top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none},rows:Array.from({length:Math.max(left.length,right.length)},(_,n)=>new TableRow({cantSplit:true,children:[left,right].map((values,i)=>new TableCell({width:{size:7699,type:WidthType.DXA},verticalAlign:VerticalAlign.TOP,margins:{top:0,bottom:0,left:i?220:0,right:i?0:220},children:[values[n]||p('',{spacing:{after:0}})]}))}))})}
 function section(children,landscape=false){sections.push({properties:{type:SectionType.NEXT_PAGE,page:{size:{width:11906,height:16838,orientation:landscape?PageOrientation.LANDSCAPE:PageOrientation.PORTRAIT},margin:{top:720,bottom:720,left:720,right:720}}},headers:{default:new Header({children:[p('BOUTIQUE  OPERATOR GUIDE',{run:{size:16,color:'52665B'}})]})},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'Rules v'+rules+'   ·   '+(draft?'Review copy':'Task guide')+'   ·   ',size:16}),new TextRun({children:[PageNumber.CURRENT],size:16})]})]})},children})}
 section([
  p('Operator task guide',{style:'Title'}),p(records.filter(r=>!r.data.doc.isReverse).map(r=>r.data.doc.id).join(', ')+' and linked resets'),
  p('Use the task card to check the setup and finished result. Use the variation sheet to choose realistic ways to start, do and finish the job. The zone map and suggested runs show where each item can go.'),
  p(draft?'Review copy. The team must approve the listed equipment and gripper setup before use.':'Use equipment and arrangements approved for the actual rig.',{run:{bold:true,color:'A33428'}}),
  heading('Before you start'),...['Use the listed items and equipment approved on the actual rig.','Contained items share their container zone. Keep the required start and end conditions.','Check untested choices with the team before using them. Time estimates alone do not fail an episode.'].map(bullet),
  heading('Mistakes to avoid'),...STANDARD_MISTAKES.map(bullet),
  p('If an item is dropped, knocked over, broken or spilled, stop. Set up a valid start again and record a new episode.')
 ]);
 for(const record of records){
  const d=record.data.doc,v=d.variation||{},card=[p(d.id+' '+d.name,{heading:HeadingLevel.HEADING_1}),p(d.instruction,{run:{bold:true}}),p('Time per episode: '+(v.time||'Not timed on the rig.'))];
  card.push(p('Written under rules v'+(record.data.rulesVersion||'unknown')+' · Current rules v'+rules),heading('Initial state'),table(['Item and role','How it starts','Start location'],[1900,5100,3466],list(d.initial).map(r=>[r.item+' / '+r.role,r.how,location(r)])),heading('Steps'),...list(d.steps).map((s,i)=>p((i+1)+'. '+s)),heading('Target state'),table(['Item','How it ends','End location'],[1900,5100,3466],list(d.target).map(r=>[r.item,r.how,r.place||'Any allowed zone except its start zone'])),heading('Free choices'),p(d.free),heading('Task mistakes to avoid'),...list(d.qc).map(bullet));
  if(d.usesUp)card.push(p('Uses up: '+d.usesUp));if(d.wasteHolder)card.push(p('Waste holder: '+d.wasteHolder));section(card);
  const left=[heading('Ways to start'),...list(v.start).map(bullet),heading('Ways to do the job'),...list(v.doing).map(bullet)];
  const right=[heading('Ways to end'),...list(v.end).map(bullet),heading('Where this happens in real life'),...list(v.scenarios).map(bullet),heading('Common mistakes'),...list(v.mistakes).map(bullet)];
  const time=v.time||'Not timed on the rig.';
  const wide=[p('VARIATION SHEET · '+d.id+' · '+d.name.toUpperCase(),{heading:HeadingLevel.HEADING_1}),p('Time per episode: '+time+(/time alone/i.test(time)?'':' Time alone does not fail an episode.')),heading('Start variants one per run'),...list(v.startVariants).map(bullet),...(v.startReason?[p('Why fewer start states: '+v.startReason)]:[]),columns(left,right),heading('Choices that remain free'),p(v.qcNever)];
  const rows=zoneRows(d);
  wide.push(heading('Zone map '+d.id,HeadingLevel.HEADING_1),p('Start and End show allowed item zones. Contained items stay with their container at the start. Ends describes the required final placement.',{keepNext:true}),
   table(['Item',...ZONES.map((z,i)=>(i+1)+' '+z),'Ends'],[2100,1500,1500,1800,1550,1600,1800,3548],[...rows.map(r=>[r.item+(r.role==='not used'?' (not used)':''),...r.cells,r.end]),['Work zone',...ZONES.map(z=>list(d.workZones).includes(z)?'Work':'—'),'']],{redColumns:[1,2,3,4,5,6],workRow:true}),
   heading('Zone limits and tests'),p(d.zoneNotes||'No saved zone-test notes. Ask the team to check reach and clearance on the actual rig.')
  );
  wide.push(heading('Suggested runs '+d.id,HeadingLevel.HEADING_1),p('Optional plan: choose any run order and other allowed combinations. Each run is 5–10 episodes with one start variant. Change the handling between episodes. Across a two-hour block, cover the allowed product start and end zones, work zones and meaningful start variants. Check reach and clearance on the rig.',{keepNext:true}),
   table(['Run','Work zone','Start variant','Item start and end placements'],[500,1700,5400,7798],zonePlan(d).map(r=>[String(r.n),zone(r.work),r.variant,r.items.map(i=>i.item+': '+(i.container?'starts inside '+i.container+' in '+zone(i.start):'starts in '+zone(i.start))+(i.endZone?', ends in '+zone(i.endZone):i.endPlace?', ends '+i.endPlace:i.noPlan?', plan needs review':'')).join('\n')])),
  );section(wide,true);
 }
 const doc=new Document({creator:'Boutique',title:'Operator task guide',description:'Editable task cards, variation sheets, zone maps and suggested runs from current saved tasks',styles:{default:{document:{run:{font:'Calibri',size:22,color:'182E2A'},paragraph:{spacing:{line:245,after:70}}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',next:'Normal',run:{font:'Calibri',size:40,bold:true,color:'000000'},paragraph:{spacing:{after:200}}},{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',run:{size:28,bold:true,color:'182E2A'},paragraph:{spacing:{before:100,after:130},keepNext:true}},{id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',run:{size:22,bold:true,color:'182E2A'},paragraph:{spacing:{before:100,after:65},keepNext:true}}]},sections});
 return new Uint8Array(await(await Packer.toBlob(doc)).arrayBuffer());
}
