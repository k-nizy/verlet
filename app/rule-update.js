// Exact JSON transfer through the native app, without retyping rule arrays or calling a model.
export function canonical(v){return JSON.stringify(order(v))}
function order(v){return Array.isArray(v)?v.map(order):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,order(v[k])])):v}
export function validateUpdate(base,next){
 if(base.version!=='1.9'||next.version!=='1.12')throw Error('This update is only for the verified v1.9 to v1.12 migration.');
 if(base.rules.length!==72||next.rules.length!==77||new Set(next.rules.map(r=>r.n)).size!==77)throw Error('Rule count or numbering is invalid.');
 const edits=base.rules.filter(r=>canonical(r)!==canonical(next.rules.find(n=>n.n===r.n))).map(r=>r.n).sort((a,b)=>a-b);
 if(canonical(edits)!==canonical([8,35,65,68,70]))throw Error('The prepared update changes unexpected existing rules.');
 for(let n=1;n<=77;n++)if(!next.rules.some(r=>r.n===n&&r.text?.trim()&&r.section?.trim()))throw Error('A rule number, section or text is missing.');
 if(canonical(next.changeLog.slice(0,base.changeLog.length))!==canonical(base.changeLog))throw Error('The previous change log must be preserved.');
 if(!next.motionReference)throw Error('The motion reference is missing.');
 return {changed:edits,added:[73,74,75,76,77]};
}
export async function applyUpdate({read,write,waitFor,base,next}){
 validateUpdate(base,next);
 const same=x=>canonical(x)===canonical(base);
 if(!same(await read('inhouse')))throw Error('The live rules differ from the verified v1.9 baseline. Nothing was replaced. Review the newer changes first.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(base))))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const backupId='archive-v1-9-'+hash.slice(0,16),archive=await read(backupId);
 if(archive&&canonical(archive.record)!==canonical(base))throw Error('The backup record contains different data. Nothing was replaced.');
 if(!archive)await write(backupId,{record:structuredClone(base),savedAt:new Date().toISOString(),reason:'Exact rules v1.9 backup before the agreed v1.12 update'});
 const backup=waitFor?await waitFor(backupId,v=>!!v&&canonical(v.record)===canonical(base)):await read(backupId);
 if(!backup||canonical(backup.record)!==canonical(base))throw Error('The backup could not be verified. Live rules were left unchanged.');
 if(!same(await read('inhouse')))throw Error('Rules changed while the backup was saved. The update was stopped.');
 // Native set has no verified CAS/transaction API. The UI explicitly asks editors to avoid simultaneous rule edits.
 await write('inhouse',structuredClone(next));
 if(canonical(waitFor?await waitFor('inhouse',v=>canonical(v)===canonical(next)):await read('inhouse'))!==canonical(next))throw Error('The saved rules did not match the update on read-back. Stop writing tasks and review the saved rules and backup.');
 return {version:next.version,count:next.rules.length,backupId};
}
