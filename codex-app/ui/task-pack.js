/* Selected task/reset packs use the same saved records as the Writing room. */
var packModule=null,packLoading=import('/task-pack.mjs').then(function(m){packModule=m;return m}),packPdfLoading=null,packUrls=[];
var previousRotation=rotation;
var packWordLoading=null;
zoneMap=function(d){if(!packModule)return [];var rows=packModule.zoneRows(d).map(function(r){return {item:r.item+roleTag(r.role),cells:r.cells,note:r.container?'Starts inside '+r.container:''}});rows.push({item:'Work zone',cells:ZN.map(function(z){return (d.workZones||[]).includes(z)?'Work':'-'}),note:'',work:true});return rows};
rotation=function(d){if(!packModule)return [];return packModule.zonePlan(d).map(function(r){return {n:r.n,work:zf(r.work),variant:r.variant,parts:r.items.map(function(i){return i.item+': '+(i.container?'inside '+i.container+'; shares its start zone '+zf(i.start):'starts in '+zf(i.start))+(i.endZone?', ends in '+zf(i.endZone):i.endPlace?', ends '+i.endPlace:i.noPlan?', no complete rotation is feasible; review Zone limits':'')})}})};
packLoading.then(function(){if(S.openId&&!S.editing)renderDoc()}).catch(function(e){toast('Zone plan could not load: '+e.message)});
function packSelectedIds(){var ids=Object.keys(S.ticks||{}).filter(function(id){return S.ticks[id]});if(!ids.length&&S.openId){var t=S.tasks.find(function(t){return t.id===S.openId});if(t)ids=[t.forwardRec||t.id]}return ids}
async function loadPack(){var ids=packSelectedIds();if(!ids.length)throw Error('Tick a written task or open its description first.');var m=await packLoading,snapshot=await window.boutique.api('state');return m.selectedSnapshot(snapshot,ids)}
function packFeedback(s){$('task-pack-feedback').textContent=s}
function packDownload(bytes,type,name){var blob=new Blob([bytes],{type:type}),url=URL.createObjectURL(blob);packUrls.push(url);var a=document.createElement('a');a.href=url;a.download=name;a.className='btn small';a.textContent='Download '+(type==='application/pdf'?'PDF':'Excel')+' again';a.title=name;$('task-pack-links').appendChild(a);a.click()}
async function packDocumentDownload(bytes,type,name,snapshot){
 if(name.length>160)name='Boutique_'+snapshot.records.filter(function(r){return r.collection==='tasks'&&r.data.doc}).length+'_task_records'+(name.includes('_REVIEW')?'_REVIEW':'')+'_Operator_Guide'+(type==='application/pdf'?'.pdf':'.docx');
 var versions=snapshot.records.filter(function(r){return r.collection==='tasks'||r.collection==='rules'&&r.id==='inhouse'}).map(function(r){return {collection:r.collection,id:r.id,revision:r.revision}});
 var result=await window.boutique.api('download',{method:'POST',headers:{'Content-Type':type,'X-Boutique-Filename':name,'X-Boutique-Revisions':JSON.stringify(versions)},body:bytes});
 var format=type==='application/pdf'?'PDF':'Word',old=$('task-pack-links').querySelector('[data-format="'+format+'"]');if(old)old.remove();
 var a=document.createElement('a');a.href=result.url;a.download=result.filename;a.className='btn small';a.dataset.format=format;a.textContent='Save prepared '+format+' file';a.title=result.filename;$('task-pack-links').appendChild(a);a.click();return result;
}
async function exportSelectedPack(kind,button){
  button.disabled=true;packFeedback('Reading the latest selected task and linked reset…');
  try{
    var snapshot=await loadPack(),tasks=snapshot.records.filter(function(r){return r.collection==='tasks'&&r.data.doc}),draft=tasks.some(function(r){return r.data.status==='review'||r.data.checks?.some(function(c){return !c.ok})}),label=tasks.filter(function(r){return !r.data.doc.isReverse}).map(function(r){return r.data.doc.id}).join('_'),base='Boutique_'+label+(draft?'_REVIEW':'');
    if(kind==='excel'){
      if(!window.ExcelJS)await new Promise(function(resolve,reject){var s=document.createElement('script');s.src='/lib/exceljs-4.4.0.min.js';s.onload=resolve;s.onerror=function(){reject(Error('Excel library could not load.'))};document.head.appendChild(s)});
      var m=await import('/operator-export.mjs'),built=m.buildWorkbook(window.ExcelJS,snapshot);var sheet=built.workbook.getWorksheet('Operator Tasks');sheet.getCell('A2').value='Selected task pack · Rules v'+built.rulesVersion+' · '+(draft?'REVIEW COPY':'Check rig-test notes')+' · Approved task-sheet format';
      packDownload(await built.workbook.xlsx.writeBuffer(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base+'_Excel_preview.xlsx');
    }else if(kind==='word'){
      packWordLoading=packWordLoading||new Promise(function(resolve,reject){if(window.docx)return resolve(window.docx);var s=document.createElement('script');s.src='/lib/docx.umd.js';s.onload=function(){resolve(window.docx)};s.onerror=function(){packWordLoading=null;reject(Error('Word library could not load. Please retry.'))};document.head.appendChild(s)});
      var wordLib=await packWordLoading,wordModule=await import('/operator-word.mjs'),wordBytes=await wordModule.buildOperatorWord(wordLib,snapshot);
      await packDocumentDownload(wordBytes,'application/vnd.openxmlformats-officedocument.wordprocessingml.document',base+'_Operator_Guide.docx',snapshot);
    }else{
      packPdfLoading=packPdfLoading||new Promise(function(resolve,reject){if(window.PDFLib)return resolve(window.PDFLib);var s=document.createElement('script');s.src='/lib/pdf-lib.min.js';s.onload=function(){resolve(window.PDFLib)};s.onerror=function(){packPdfLoading=null;reject(Error('PDF library could not load.'))};document.head.appendChild(s)});
      var lib=await packPdfLoading,result=await packModule.buildOperatorPdf(lib,snapshot);await packDocumentDownload(result.bytes,'application/pdf',base+'_Operator_Guide.pdf',snapshot);
    }
    packFeedback(tasks.length+' task/reset records prepared from the latest save. '+(draft?'Review copy: resolve the named issues before recording or delivery. ':'')+(kind==='excel'?'Excel follows the approved task-sheet format.':'If the download did not start, click Save prepared '+(kind==='word'?'Word':'PDF')+' file below. After editing a task, click Download '+(kind==='word'?'Word':'PDF')+' again to get the latest save. No run log is included.'));
  }catch(e){packFeedback('Could not export: '+e.message)}finally{button.disabled=false}
}
function initTaskPack(){
  var box=document.createElement('div');box.className='card';box.id='selected-task-pack';box.innerHTML='<h3>Selected task pack</h3><p class="small muted">Tick tasks or open one description. Its linked reset is included. Both files use the latest saved descriptions.</p><div class="row"><button class="btn" id="pack-excel">Selected Excel preview</button><button class="btn primary" id="pack-pdf">Printable operator PDF</button></div><p class="small muted">Excel follows the approved task-sheet format. Review copies stay labelled and must be checked before recording or delivery.</p><p class="small" id="task-pack-feedback" role="status"></p><div class="row" id="task-pack-links"></div>';$('w-list').closest('.card').before(box);
  $('pack-pdf').textContent='Download PDF';
  var wordButton=document.createElement('button');wordButton.className='btn';wordButton.id='pack-word';wordButton.textContent='Download Word';$('pack-pdf').before(wordButton);
  $('pack-excel').onclick=function(){exportSelectedPack('excel',this)};$('pack-pdf').onclick=function(){exportSelectedPack('pdf',this)};wordButton.onclick=function(){exportSelectedPack('word',this)};
  $('x-md').textContent='Download PDF';$('x-md').addEventListener('click',function(e){e.stopImmediatePropagation();exportSelectedPack('pdf',this)},true);
}
initTaskPack();
