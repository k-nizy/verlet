function clearSaveReview(key,conflict){saveReviews.delete(key);if(conflict.collection==='tasks'&&S.editTask?.id===conflict.id){S.editing=false;S.editTask=null;S.editSnapshot=null;renderDoc()}renderSaveReviews()}
function renderSaveReviews(){
  try{sessionStorage.setItem('boutique-save-reviews',JSON.stringify([...saveReviews]))}catch(e){}
  var el=$('save-review-banner');if(!el)return;el.hidden=!saveReviews.size;el.replaceChildren();if(!saveReviews.size)return;
  var heading=document.createElement('h3');heading.textContent='Review overlapping changes';el.append(heading);
  var intro=document.createElement('p');intro.className='small muted';intro.textContent='Someone changed the same field while you were editing. Both versions are kept here for this browser session. Review the differences before choosing. Unrelated saved changes are preserved.';el.append(intro);
  function display(value){return typeof value==='string'?value:value===undefined?'Not present':JSON.stringify(value,null,2)}
  function at(value,path){if(path==='record')return value;return path.split('.').reduce(function(o,k){return o?.[k]},value)}
  for(var [key,c] of saveReviews){
    var section=document.createElement('section');section.className='save-comparison';var title=document.createElement('h3');title.textContent=c.draft.name||c.collection+'/'+c.id;section.append(title);
    for(var field of c.fields||['record']){var label=document.createElement('b');label.textContent=field.replace(/^doc\./,'').replace(/\./g,' / ');var grid=document.createElement('div');grid.className='save-comparison-grid';for(var pair of [['Currently saved',c.latest],['Your unsaved change',c.draft]]){var panel=document.createElement('div'),caption=document.createElement('b'),pre=document.createElement('pre');caption.textContent=pair[0];pre.textContent=display(at(pair[1],field));panel.append(caption,pre);grid.append(panel)}section.append(label,grid)}
    var actions=document.createElement('div');actions.className='row';
    var keep=document.createElement('button');keep.className='btn';keep.textContent='Keep saved changes';keep.onclick=(function(k,value){return function(){clearSaveReview(k,value)}})(key,c);actions.append(keep);
    if(c.base&&c.latest&&Number.isInteger(c.latestRevision)){var apply=document.createElement('button');apply.className='btn primary';apply.textContent='Use my changed fields';apply.onclick=(function(k,value,button){return async function(){button.disabled=true;try{await window.boutique.applyReviewed(value);clearSaveReview(k,value);toast('Your reviewed changes were saved.')}catch(e){toast(e.message);button.disabled=false}}})(key,c,apply);actions.append(apply)}
    var download=document.createElement('button');download.className='btn small ghost';download.textContent='Download my unsaved version';download.onclick=(function(value){return function(){window.boutique.download('boutique-unsaved-'+value.id+'.json',JSON.stringify(value,null,2))}})(c);actions.append(download);section.append(actions);el.append(section);
  }
}
