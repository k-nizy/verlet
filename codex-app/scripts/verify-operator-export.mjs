import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildWorkbook} from '../public/operator-export.mjs';
const require=createRequire(import.meta.url),ExcelJS=require('../.sites-runtime/exceljs/package/dist/exceljs.min.js');
const snapshot=JSON.parse(await fs.readFile(new URL('../.sites-runtime/final-live-current.json',import.meta.url),'utf8'));
const original=JSON.stringify(snapshot),built=buildWorkbook(ExcelJS,snapshot),wb=built.workbook;
assert.deepEqual(wb.worksheets.map(s=>s.name),['Operator Tasks','Variations','Zone coverage','Evaluation log']);
assert.equal(built.counts.tasks,27);assert.equal(built.counts.reverses,24);assert.equal(JSON.stringify(snapshot),original);
const sheet=wb.getWorksheet('Operator Tasks'),ids=new Set();sheet.eachRow((r,n)=>{if(n>4)ids.add(String(r.getCell(1).value).replace(' (continued)',''))});assert.equal(ids.size,51);
assert.equal(sheet.getCell('C4').value,'Instruction and steps');assert.equal(sheet.getCell('D4').value,'QC checks');assert.equal(sheet.getCell('M4').value,'Paired Task ID');
for(const item of snapshot.records.filter(r=>r.collection==='tasks'&&r.data.doc)){let id=item.data.doc.id,rows=[];sheet.eachRow((r,n)=>{if(n>4&&String(r.getCell(1).value).replace(' (continued)','')===id)rows.push(r)});for(const [col,val] of [[3,item.data.doc.instruction],[5,item.data.doc.pass],[6,item.data.doc.fail]]){let combined=rows.map(r=>r.getCell(col).value||'').join(' ').replace(/\s+/g,' ');assert.ok(combined.includes(String(val||'').replace(/\s+/g,' ')),id+' missing column '+col)}}
for(const item of snapshot.records.filter(r=>r.collection==='tasks'&&r.data.doc))for(const target of item.data.doc.target||[]){if(!target.place)continue;let combined=[];sheet.eachRow((r,n)=>{if(n>4&&r.getCell(1).value===item.data.doc.id)combined.push(r.getCell(9).value||'')});assert.ok(combined.join(' ').replace(/\s+/g,' ').includes(target.place.replace(/\s+/g,' ')),item.data.doc.id+' missing placement '+target.item);}
const bytes=await wb.xlsx.writeBuffer();await fs.writeFile(new URL('../.sites-runtime/operator-export-qa.xlsx',import.meta.url),bytes);const reopened=new ExcelJS.Workbook();await reopened.xlsx.load(bytes);assert.equal(reopened.worksheets.length,4);assert.equal(reopened.getWorksheet('Evaluation log').getCell('O5').dataValidation?.type,undefined);console.log(JSON.stringify({tasks:built.counts.tasks,reverses:built.counts.reverses,operatorRows:sheet.rowCount-4,variationRows:wb.getWorksheet('Variations').rowCount-4,evaluationRows:wb.getWorksheet('Evaluation log').rowCount-4,sheets:wb.worksheets.map(s=>s.name)}));
