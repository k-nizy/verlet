import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {selectedSnapshot,zonePlan,startContainer,buildOperatorPdf,ZONES} from '../public/task-pack.mjs';
import {buildWorkbook} from '../public/operator-export.mjs';
import {inspectTask} from '../lib/task-engine.mjs';
const require=createRequire(import.meta.url);
const {default:Module}=await import('node:module');
const pdfModule=new Module('pdf-lib');
pdfModule._compile(await fs.readFile(new URL('../public/lib/pdf-lib.min.js',import.meta.url),'utf8'),'pdf-lib.cjs');
const PDFLib=pdfModule.exports,ExcelJS=require('../.sites-runtime/exceljs/package/dist/exceljs.min.js');
const dir=new URL('../.sites-runtime/hom002-pilot/',import.meta.url),snapshot=JSON.parse(await fs.readFile(new URL('agent-corrected.json',dir),'utf8'));
const selected=selectedSnapshot(snapshot,['mwav421nc4ctn']),tasks=selected.records.filter(r=>r.collection==='tasks');assert.equal(tasks.length,2);
const f=tasks.find(r=>!r.data.doc.isReverse).data,reset=tasks.find(r=>r.data.doc.isReverse).data,rules=snapshot.records.find(r=>r.collection==='rules'&&r.id==='inhouse').data;
assert.equal(rules.version,'1.12');assert.equal(rules.rules.length,77);
const assets=JSON.parse(await fs.readFile(new URL('../public/ref/assets.json',import.meta.url),'utf8'));
assert.deepEqual(reset.doc.initial.map(({item,how,zones,place})=>({item,how,zones,place})),f.doc.target.map(({item,how,zones,place})=>({item,how,zones,place})));
for(const t of [f,reset]){
  const d=t.doc;assert.equal(t.rulesVersion,rules.version);assert.equal(t.status,'review');assert.equal(inspectTask(d,rules,assets).filter(c=>!c.ok).length,0);
  assert.ok(d.pass&&d.fail&&d.qc.length);
  const plan=zonePlan(d);assert.equal(plan.length,6);
  for(const r of plan){assert.ok(ZONES.includes(r.work));for(const item of r.items){assert.ok(ZONES.includes(item.start),JSON.stringify(item));if(item.container)assert.equal(item.start,r.items.find(x=>x.item===item.container).start);assert.ok(!Object.hasOwn(item,"endZone"))}}
  for(const item of d.initial.filter(x=>x.role==='product'&&!d.target.find(t=>t.item===x.item)?.place)){
    assert.equal(new Set(plan.map(r=>r.items.find(i=>i.item===item.item).start)).size,6);
  }
}
assert.equal(startContainer(f.doc,f.doc.initial.find(x=>x.item==='Staple strip')),'Staple box');
assert.equal(startContainer(reset.doc,reset.doc.initial.find(x=>x.item==='Staple strip')),'Stapler');
const built=buildWorkbook(ExcelJS,selected);assert.equal(built.counts.tasks,1);assert.equal(built.counts.reverses,1);assert.equal(built.counts.sheets,4);
const bytes=await built.workbook.xlsx.writeBuffer();await fs.writeFile(new URL('HOM-002-export-qa.xlsx',dir),bytes);
const opened=new ExcelJS.Workbook();await opened.xlsx.load(bytes);assert.equal(opened.getWorksheet('Operator Tasks').getCell('E4').value,'Pass');assert.equal(opened.getWorksheet('Operator Tasks').getCell('F4').value,'Fail');
const content=opened.worksheets.map(s=>JSON.stringify(s.getSheetValues())).join('\n');for(const label of ["START CHECK","DURING CHECK","END CHECK","Reference time"])assert.ok(content.includes(label));assert.match(content,/Suggested zone run/);assert.match(content,/Estimated time/);assert.match(content,/Uncommon/);assert.doesNotMatch(content,/HOM-001/);
const pdf=await buildOperatorPdf(PDFLib,selected);await fs.writeFile(new URL('HOM-002-print-qa.pdf',dir),pdf.bytes);assert.ok(pdf.draft);assert.ok(pdf.pages>3&&pdf.pages<24);
const loaded=await PDFLib.PDFDocument.load(pdf.bytes);assert.equal(loaded.getPageCount(),pdf.pages);
console.log(JSON.stringify({checks:'Agent result, rule checks, three QC blocks, exact reset Initial State, containment-aware rotation, six-zone coverage, selected-only workbook and PDF round trip passed.',pages:pdf.pages,counts:built.counts,readiness:'Review - physical testing and visibility-rule interpretation pending.'},null,2));
