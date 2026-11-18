/* Private Boutique storage adapter. No model API or Claude runtime is used. */
(function(){
  'use strict';
  let rows=new Map(), listeners=[], initialized=false, identity=null;
  let loading=null;
  const key=(c,id)=>c+'/'+id;
  async function api(path,options={}) {
    const response=await fetch('/api/'+path,{...options,headers:{...(options.body instanceof Blob?{}:{'Content-Type':'application/json'}),...options.headers}});
    let result;try{result=await response.json()}catch(e){throw new Error('Boutique could not respond. Check your connection and reload.');}
    if(!response.ok)throw Object.assign(new Error(result.message||result.error||'Could not save.'),result,{status:response.status,code:result.code||result.error||'request_failed'});
    return result;
  }
  const docSnap=r=>({id:r?.id,exists:!!r,data:()=>structuredClone(r?.data||{})});
  function signature(l){return JSON.stringify([...rows.values()].filter(r=>r.collection===l.collection&&(!l.id||r.id===l.id)));}
  function publish(){for(const l of listeners){const sig=signature(l);if(sig===l.previous)continue;l.previous=sig;
    try {l.next(l.id?docSnap(rows.get(key(l.collection,l.id))):{docs:[...rows.values()].filter(r=>r.collection===l.collection).map(docSnap)});}catch(e){l.error?.(e);}
  }}
  let epoch=0;const writes=new Map(),changed=new Map();
  async function refresh(){if(loading)return loading;const started=epoch;loading=(async()=>{const s=await api('state');const incoming=new Map(s.records.map(r=>[key(r.collection,r.id),r]));for(const [k,at] of changed)if(at>started){if(rows.has(k))incoming.set(k,rows.get(k));else incoming.delete(k);}rows=incoming;initialized=true;publish();return s;})().finally(()=>loading=null);return loading;}
  function remember(collection,id,data,revision){const k=key(collection,id);changed.set(k,++epoch);if(data===undefined)rows.delete(k);else rows.set(k,{collection,id,data:structuredClone(data),revision});publish();}
  function serial(k,fn){const p=(writes.get(k)||Promise.resolve()).catch(()=>{}).then(fn);writes.set(k,p);p.finally(()=>{if(writes.get(k)===p)writes.delete(k)}).catch(()=>{});return p;}
  async function ensure(){if(!initialized){await api('bootstrap',{method:'POST',body:'{}'});await refresh();}}
  function subscribe(collection,id,next,error){const l={collection,id,next,error,previous:undefined};listeners.push(l);ensure().then(()=>publish()).catch(e=>error?.(e));return()=>{listeners=listeners.filter(x=>x!==l)};}
  function doc(collection,id){return {
    onSnapshot:(next,error)=>subscribe(collection,id,next,error),
    async set(data,options={}){await ensure();const base=structuredClone(options.baseRecord||rows.get(key(collection,id))||null),draft=structuredClone(data);
      return serial(key(collection,id),async()=>{
        let old=base,next=draft;
        for(let attempt=0;attempt<3;attempt++){
          try{const result=await api('record/'+encodeURIComponent(collection)+'/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({data:next,expectedRevision:old?.revision||0})});remember(collection,id,next,result.revision);return;}
          catch(e){if(e.status!==409)throw e;
            const latestState=await api('state'),latest=latestState.records.find(r=>r.collection===collection&&r.id===id)||null;
            const {mergeRecord}=await import('/record-merge.mjs');const merged=old&&latest?mergeRecord(old.data,next,latest.data):{conflicts:['record']};
            if(merged.conflicts.length||attempt===2){
              const conflict={collection,id,draft,base:base?.data,latest:latest?.data,latestRevision:latest?.revision,fields:merged.conflicts};
              remember(collection,id,latest?.data,latest?.revision);
              window.dispatchEvent(new CustomEvent('boutique-save-conflict',{detail:conflict}));
              throw Object.assign(Error('This record changed elsewhere. Your unsaved version is available in Save review.'),{code:'conflict',status:409});
            }
            old=latest;next=merged.value;
          }
        }
      });
    },
    async delete(){await ensure();const old=rows.get(key(collection,id));if(!old)return;
      await api('record/'+encodeURIComponent(collection)+'/'+encodeURIComponent(id),{method:'DELETE',body:JSON.stringify({expectedRevision:old.revision})});remember(collection,id,undefined);
    }
  };}
  function download(filename,data){const blob=data instanceof Blob?data:new Blob([data],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  window.boutique={
    async use(name){
      if(name==='db'){await ensure();return {collection:c=>({doc:id=>doc(c,id),onSnapshot:(n,e)=>subscribe(c,null,n,e)}),doc:p=>doc(...p.split('/'))};}
      if(name==='sample')return null;
      if(name==='user'){identity=identity||await api('identity');return {id:async()=>identity.id,canEdit:async()=>identity.canEdit,profiles:async ids=>Object.fromEntries(ids.map(id=>[id,{name:id===identity.id?'You':'Team member'}]))};}
      if(name==='downloads')return {save:async o=>download(o.filename,o.data)};
      if(name==='assets')return {upload:async file=>api('file',{method:'POST',headers:{'Content-Type':file.type},body:file})};
      return null;
    },
    api,refresh,download,
    snapshot(collection,id){return structuredClone(rows.get(key(collection,id))||null)},
    async applyReviewed(c){if(!c.base||!c.latest)throw Error('This record was removed or replaced. Keep the saved version or download your draft.');const {mergeRecord}=await import('/record-merge.mjs');const draft=mergeRecord(c.base,c.draft,c.latest).value;draft.updatedAt=new Date().toISOString();return doc(c.collection,c.id).set(draft,{baseRecord:{collection:c.collection,id:c.id,data:c.latest,revision:c.latestRevision}})},
    async request(prompt,kind){const id=crypto.randomUUID();await doc('requests',id).set({title:kind||prompt.split('\n')[0].slice(0,100),prompt,status:'pending',createdAt:new Date().toISOString(),source:'Boutique',allowExternalAI:false});window.dispatchEvent(new Event('boutique-request-added'));return id;},
    async requests(){await ensure();await refresh();return [...rows.values()].filter(r=>r.collection==='requests').sort((a,b)=>(b.data.createdAt||'').localeCompare(a.data.createdAt||''));},
    async backup(){const data=await api('backup');data.media=[];
      for(const file of data.files){const response=await fetch('/api/file/'+encodeURIComponent(file.key.slice(6)));if(!response.ok)throw new Error('A media file could not be backed up.');const blob=await response.blob();const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});data.media.push({key:file.key,dataUrl:base64});}
      download('boutique-complete-backup_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(data,null,2));
    },
    async restore(data){if(data.format!=='boutique-backup-v1'||!Array.isArray(data.records))throw new Error('Choose a Boutique complete backup.');
      await ensure();const files=new Map();
      for(const file of data.media||[]){const blob=await (await fetch(file.dataUrl)).blob();const result=await api('file',{method:'POST',headers:{'Content-Type':blob.type},body:blob});files.set(file.key.slice(6),result.id);}
      for(const record of data.records){let value=structuredClone(record.data);function rewrite(o){if(!o||typeof o!=='object')return;for(const k of Object.keys(o)){if((k==='photoId'||k==='clipId')&&files.has(o[k]))o[k]=files.get(o[k]);else if((k==='imageIds'||k==='referenceImageIds')&&Array.isArray(o[k]))o[k]=o[k].map(id=>files.get(id)||id);else rewrite(o[k]);}}rewrite(value);await doc(record.collection,record.id).set(value);}
      await refresh();return data.records.length;
    }
  };
  setInterval(()=>{if(document.visibilityState==='visible'&&initialized)refresh().catch(()=>{});},15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&initialized)refresh().catch(()=>{});});
})();
