// Exact JSON transfer through the native app, without retyping rule arrays or calling a model.
export function canonical(v){return JSON.stringify(order(v))}
function order(v){return Array.isArray(v)?v.map(order):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,order(v[k])])):v}
function nextVersion(version) {
  const match = /^(\d+)\.(\d+)$/.exec(version);
  if (!match) throw Error('Unrecognized rules version.');
  return match[1] + '.' + (Number(match[2]) + 1);
}

export function prepareImport(base, input, at) {
  if (input.version !== nextVersion(base.version) || input.group !== base.group)
    throw Error('Choose the next approved version for this rule set.');
  if (!Array.isArray(input.rules) || !Array.isArray(input.brainstormingOnly))
    throw Error('Rule rows and brainstorming-only rule numbers are required.');
  const ordered = [...input.rules].sort((a,b)=>a.n-b.n);
  if (ordered.length < base.rules.length || ordered.some((r,i)=>r.n!==i+1 ||
      typeof r.text!=='string' || !r.text.trim() || typeof r.section!=='string' || !r.section.trim()))
    throw Error('Rule numbers, sections or text are missing.');
  if (input.brainstormingOnly.some(n=>!ordered.some(r=>r.n===n)))
    throw Error('Unknown brainstorming rule number.');
  if (!Array.isArray(base.changeLog) || !base.motionReference) throw Error('Live history or motion reference is missing.');
  return {...base, version:input.version, updatedAt:input.updatedAt, rules:structuredClone(input.rules),
    brainstormingOnly:[...input.brainstormingOnly], zones:structuredClone(input.zones), codes:structuredClone(input.codes),
    changeLog:[...base.changeLog,{at,by:'',what:'Imported approved in-house rules v'+input.version+' ('+ordered.length+' rules).'}]};
}

export function validateUpdate(base,next) {
  if (next.version!==nextVersion(base.version) || canonical(next.motionReference)!==canonical(base.motionReference) ||
      next.changeLog.length!==base.changeLog.length+1 || canonical(next.changeLog.slice(0,-1))!==canonical(base.changeLog))
    throw Error('Version, history or motion reference mismatch.');
  const old=new Map(base.rules.map(r=>[r.n,r]));
  return {changed:next.rules.filter(r=>old.has(r.n)&&canonical(old.get(r.n))!==canonical(r)).map(r=>r.n),
    added:next.rules.filter(r=>!old.has(r.n)).map(r=>r.n)};
}
export async function applyUpdate({read,write,waitFor,base,next}){
 validateUpdate(base,next);
 const same=x=>canonical(x)===canonical(base);
 if(!same(await read('inhouse')))throw Error('The live rules differ from the previewed baseline. Nothing was replaced. Review the newer changes first.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(base))))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const backupId='archive-v'+base.version.replace('.', '-')+'-'+hash.slice(0,16),archive=await read(backupId);
 if(archive&&canonical(archive.record)!==canonical(base))throw Error('The backup record contains different data. Nothing was replaced.');
 if(!archive)await write(backupId,{record:structuredClone(base),savedAt:new Date().toISOString(),reason:'Exact backup before v'+next.version});
 const backup=waitFor?await waitFor(backupId,v=>!!v&&canonical(v.record)===canonical(base)):await read(backupId);
 if(!backup||canonical(backup.record)!==canonical(base))throw Error('The backup could not be verified. Live rules were left unchanged.');
 if(!same(await read('inhouse')))throw Error('Rules changed while the backup was saved. The update was stopped.');
 // Native set has no verified CAS/transaction API. The UI explicitly asks editors to avoid simultaneous rule edits.
 await write('inhouse',structuredClone(next));
 if(canonical(waitFor?await waitFor('inhouse',v=>canonical(v)===canonical(next)):await read('inhouse'))!==canonical(next))throw Error('The saved rules did not match the update on read-back. Stop writing tasks and review the saved rules and backup.');
 return {version:next.version,count:next.rules.length,backupId};
}
