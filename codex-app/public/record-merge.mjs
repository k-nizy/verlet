const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
// Arrays are indivisible: never splice two descriptions or variation lists together.
export function mergeRecord(base,draft,latest,path='') {
  if(equal(draft,base))return {value:latest,conflicts:[]};
  if(equal(latest,base)||equal(draft,latest))return {value:draft,conflicts:[]};
  if(object(base)&&object(draft)&&object(latest)) {
    const value={},conflicts=[];
    for(const k of new Set([...Object.keys(base),...Object.keys(draft),...Object.keys(latest)])) {
      const r=['updatedAt','editedBy'].includes(k)&&!path?{value:draft[k],conflicts:[]}:mergeRecord(base[k],draft[k],latest[k],path?path+'.'+k:k);
      if(r.value!==undefined)value[k]=r.value;
      conflicts.push(...r.conflicts);
    }
    return {value,conflicts};
  }
  return {value:draft,conflicts:[path||'record']};
}
