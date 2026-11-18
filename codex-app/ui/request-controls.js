/* Per-request controls keep edits separate from the attempt being stopped. */
function requestControlsHTML(r){
  var x=r.data;if(x.execution!=='codex-local-v1')return '';
  var id=esc(r.id),waiting=x.stopAcknowledged===false&&['paused','cancelled'].includes(x.status);
  var edit='<button class="btn small" data-edit-request="'+id+'">'+(x.status==='running'?'Stop &amp; edit':x.status==='completed'?'Add follow-up':'Edit details')+'</button>';
  var restart=['paused','cancelled'].includes(x.status)?'<button class="btn small" data-resume-request="'+id+'" '+(waiting||x.resumeAfterStop?'disabled':'')+'>Restart request</button>':'';
  var cancel=['pending','running','paused'].includes(x.status)?'<button class="btn small danger-text" data-cancel-request="'+id+'">Cancel request</button>':'';
  return '<div class="request-actions">'+edit+restart+cancel+'</div>'+(waiting?'<p class="small muted">Waiting for the Windows worker to confirm it stopped. '+(x.resumeAfterStop?'Your updated request will then restart.':'You can save extra instructions now.')+'</p>':'');
}
async function requestRecord(id){var rows=await window.boutique.requests(),r=rows.find(function(r){return r.id===id});if(!r)throw Error('This request no longer exists.');return r}
async function requestControl(action,data){return window.boutique.api('agent/'+action,{method:'POST',body:JSON.stringify(data)})}
function closeWorkDialog(){var d=$('codex-queue');if(d?.open)d.close()}
async function openRequestEditor(id){
  var record=await requestRecord(id),x=record.data,follow=x.status==='completed';
  if(['pending','running'].includes(x.status)){record=(await requestControl('stop',{id:id,mode:'pause'})).record;x=record.data;}
  closeWorkDialog();
  var d=$('request-editor');if(!d){d=document.createElement('dialog');d.id='request-editor';d.className='command-dialog request-editor';document.body.appendChild(d)}
  d.setAttribute('aria-labelledby','request-editor-title');
  d.innerHTML='<form class="request-editor-body"><div class="item-top"><h2 id="request-editor-title">'+(follow?'Add a follow-up':'Edit Codex request')+'</h2><button class="btn" type="button" data-editor-close>Close</button></div><p><b>'+esc(x.title)+'</b></p><p class="small muted">'+(follow?'The saved answer stays in the history. Your follow-up creates a new request using current rules.':'This attempt is paused. Restart begins a fresh attempt with your added instructions and current rules. Existing saved tasks stay unchanged until a new result saves.')+'</p>'+(x.kind==='research'?'<label class="field">Research question<textarea id="request-question" rows="4" maxlength="12000" required>'+esc(x.question||'')+'</textarea></label>':'')+'<label class="field">'+(follow?'Follow-up instructions':'Additional instructions')+'<textarea id="request-instructions" rows="7" maxlength="12000" placeholder="Add what you want changed or included…">'+esc(follow?'':x.instructions||'')+'</textarea></label>'+(x.prompt?'<details><summary class="small">Original request</summary><pre class="request-original">'+esc(x.prompt)+'</pre></details>':'')+'<p id="request-editor-feedback" class="small" role="status">'+(!follow&&x.stopAcknowledged===false?'Stopping the current attempt. You can save now; a restart waits for the worker to confirm.':'')+'</p><div class="request-actions">'+(!follow?'<button class="btn" type="button" id="request-save">Save details · keep paused</button>':'')+'<button class="btn primary" type="submit">'+(follow?'Queue follow-up':'Save &amp; restart')+'</button></div></form>';
  var dirty=false;d.oninput=function(){dirty=true};function close(){if(dirty&&!confirm('Discard your unsaved instruction changes?'))return;d.close()};d.querySelector('[data-editor-close]').onclick=close;d.oncancel=function(e){e.preventDefault();close()};
  async function save(restart){
    var instructions=$('request-instructions').value,question=$('request-question')?.value;
    if(follow&&!instructions.trim()){ $('request-editor-feedback').textContent='Add instructions for this follow-up.';return }
    var buttons=d.querySelectorAll('button');buttons.forEach(function(b){b.disabled=true});
    try{
      if(follow){
        var data={kind:x.kind==='write'?'rewrite':x.kind,taskIds:x.taskId?[x.taskId]:[],question:question||x.question,prompt:x.prompt,json:x.json,researchKind:x.researchKind,ref:x.ref,imageIds:x.imageIds||[],instructions:[x.instructions||'',instructions].filter(Boolean).join('\n\nFOLLOW-UP:\n'),noCache:true};
        var jobs=await submitCodex(data);if(jobs.some(function(j){return j.duplicate}))throw Error('An unfinished request already exists. Your text is kept here; open that request to add these details.');
      }else{
        var result=await requestControl('edit-request',{id:id,instructions:instructions,question:question,baseInstructions:x.instructions||'',baseQuestion:x.question,restart:restart});
        toast(result.record.data.resumeAfterStop?'Details saved. Restart will follow the stop confirmation.':restart?'Updated request queued.':'Details saved. Request remains paused.');
      }
      dirty=false;d.close();openCodexQueue();pollRequestActivity();
    }catch(e){$('request-editor-feedback').textContent=e.message}finally{buttons.forEach(function(b){b.disabled=false})}
  }
  d.querySelector('form').onsubmit=function(e){e.preventDefault();save(true)};
  if($('request-save'))$('request-save').onclick=function(){save(false)};
  d.showModal();$('request-instructions').focus();
}
async function toggleRequestQueue(button){
  button.disabled=true;
  try{var status=await refreshConnector();if(!status)throw Error('Could not read queue status. Please retry.');var result=await requestControl('queue',{paused:!status.queuePaused});toast(result.paused?'Queue paused. The current request can finish; new requests will wait.':'Queue resumed. Queued requests can start.');await refreshConnector();renderQueueControls()}catch(e){toast(e.message)}finally{button.disabled=false}
}
function renderQueueControls(){document.querySelectorAll('[data-toggle-queue]').forEach(function(b){b.textContent=connectorStatus.queuePaused?'Resume queue':'Pause queue';b.setAttribute('aria-pressed',String(!!connectorStatus.queuePaused))});var s=$('queue-pause-summary');if(s){s.hidden=!connectorStatus.queuePaused;s.textContent='Queue paused · the connector stays online. Stop an individual request to edit its instructions.'}}

var requestActivity=[],activityBusy=false,activitySeen=new Set(),activityStarted=false;
try{activitySeen=new Set(JSON.parse(localStorage.getItem('boutique-activity-seen')||'[]'));activityStarted=localStorage.getItem('boutique-activity-started')==='1'}catch(e){}
function activityKey(e){return e.id+'|'+e.status+'|'+e.at}
function activityLabel(e){return e.status==='completed'?(e.resultStatus==='review'?'Saved · review needed':e.kind==='research'?'Research saved':e.kind==='assist'?'Answer saved':'Task saved'):e.status==='paused'?'Paused':e.status==='cancelled'?'Cancelled':'Needs attention'}
function rememberActivity(){try{localStorage.setItem('boutique-activity-seen',JSON.stringify(Array.from(activitySeen).slice(-240)));localStorage.setItem('boutique-activity-started','1')}catch(e){}}
function renderActivityBadge(){var n=requestActivity.filter(function(e){return !activitySeen.has(activityKey(e))}).length,b=$('activity-button'),badge=$('activity-count');if(b){b.setAttribute('aria-label','Notifications'+(n?' · '+n+' unread':''));badge.textContent=n>9?'9+':n;badge.hidden=!n}}
function markActivityRead(){requestActivity.forEach(function(e){activitySeen.add(activityKey(e))});rememberActivity();renderActivityBadge()}
async function pollRequestActivity(){
  if(activityBusy)return;activityBusy=true;
  try{
    var response=await window.boutique.api('agent/activity'),previous=new Set(requestActivity.map(activityKey));requestActivity=response.events||[];
    if(!activityStarted){activityStarted=true;markActivityRead()}
    else {var fresh=requestActivity.filter(function(e){return !activitySeen.has(activityKey(e))&&!previous.has(activityKey(e))});if(fresh.length)toast(fresh.length>1?fresh.length+' Codex request updates. Open Notifications.':activityLabel(fresh[0])+': '+fresh[0].title);}
    if($('activity-error'))$('activity-error').textContent='';
    if($('request-notifications')?.open){renderRequestNotifications();markActivityRead()}renderActivityBadge();
  }catch(e){var error=$('activity-error');if(error)error.textContent='Could not refresh notifications. Your saved requests remain in Codex work.'}finally{activityBusy=false}
}
function renderRequestNotifications(){
  var list=$('activity-list');if(!list)return;
  list.innerHTML=requestActivity.length?requestActivity.map(function(e){return '<article class="item"><div class="item-top"><b>'+esc(activityLabel(e))+'</b><time class="small muted">'+esc(new Date(e.at).toLocaleString())+'</time></div><p>'+esc(e.title)+'</p>'+(e.error?'<p class="small danger-text">'+esc(e.error)+'</p>':'')+'<button class="btn small" data-activity-request="'+esc(e.id)+'">'+(e.status==='completed'?'Open result':'Open request')+'</button></article>'}).join(''):'<div class="empty">No completed, paused or cancelled requests yet. Updates appear here when the worker confirms them.</div>';
}
async function openRequestNotifications(){
  closeWorkDialog();var d=$('request-notifications');if(!d){d=document.createElement('dialog');d.id='request-notifications';d.className='command-dialog notification-dialog';d.setAttribute('aria-labelledby','activity-title');d.innerHTML='<div class="notification-body"><div class="item-top"><h2 id="activity-title">Notifications</h2><button class="btn" data-activity-close>Close</button></div><p class="small muted">Recent request updates are saved across restarts. Unread badges are remembered in this browser.</p><p id="activity-error" class="small" role="status"></p><div id="activity-list"></div></div>';document.body.appendChild(d);d.querySelector('[data-activity-close]').onclick=function(){d.close()}}
  renderRequestNotifications();d.showModal();await pollRequestActivity();markActivityRead();
}
async function openActivityRequest(id){
  var r=await requestRecord(id);$('request-notifications').close();
  if(r.data.status!=='completed'){openCodexQueue();return}
  await window.boutique.refresh();
  if(r.data.result?.taskId){show('write');S.openId=r.data.result.taskId;S.editing=false;renderDoc()}
  else if(r.data.kind==='research'){show('sourcing');renderResearch()}
  else openSavedCodexAnswer(r);
}
function initRequestControls(){
  var work=document.createElement('button');work.className='btn small';work.type='button';work.textContent='Codex work';work.onclick=openCodexQueue;$('reconnect-codex').before(work);
  var pause=document.createElement('button');pause.className='btn small';pause.type='button';pause.dataset.toggleQueue='';$('reconnect-codex').before(pause);
  var summary=document.createElement('p');summary.id='queue-pause-summary';summary.className='small muted';summary.hidden=true;$('codex-status-bar').after(summary);
  var bell=document.createElement('button');bell.className='btn icon notification-button';bell.id='activity-button';bell.type='button';bell.title='Notifications';bell.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span id="activity-count" class="notification-count" hidden></span>';bell.onclick=openRequestNotifications;document.querySelector('.topbar .row').prepend(bell);
  var previousRefresh=refreshConnector;refreshConnector=async function(){var s=await previousRefresh();renderQueueControls();return s};
  document.addEventListener('click',async function(e){
    var b=e.target.closest('[data-edit-request],[data-resume-request],[data-cancel-request],[data-toggle-queue],[data-activity-request]');if(!b)return;
    if(b.hasAttribute('data-toggle-queue')){toggleRequestQueue(b);return}
    b.disabled=true;
    try{
      if(b.dataset.editRequest)await openRequestEditor(b.dataset.editRequest);
      else if(b.dataset.activityRequest)await openActivityRequest(b.dataset.activityRequest);
      else if(b.dataset.cancelRequest){var result=await requestControl('stop',{id:b.dataset.cancelRequest,mode:'cancel'});toast(result.record.data.stopAcknowledged?'Request cancelled. Saved tasks are unchanged.':'Stop requested. Cancellation will be confirmed by the worker.');closeWorkDialog();openCodexQueue();pollRequestActivity()}
      else if(b.dataset.resumeRequest){var result=await requestControl('resume',{id:b.dataset.resumeRequest});toast(result.record.data.resumeAfterStop?'Restart will follow the stop confirmation.':'Request queued with current rules.');closeWorkDialog();openCodexQueue()}
    }catch(error){toast(error.message)}finally{b.disabled=false}
  });
  var guide=$('v-guide').querySelector('.card ol');if(guide){var li=document.createElement('li');li.innerHTML='<b>Pause queue</b> lets the current request finish and holds new work. In <b>Codex work</b>, use <b>Stop &amp; edit</b> to add instructions, then <b>Save &amp; restart</b>. Cancel stops one request. Notifications confirm saved results or a worker-confirmed stop; restarting uses a fresh attempt.';guide.appendChild(li)}
  renderQueueControls();pollRequestActivity();setInterval(pollRequestActivity,12000);
}
initRequestControls();
