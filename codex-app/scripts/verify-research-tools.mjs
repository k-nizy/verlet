import assert from 'node:assert/strict';
const origin='http://127.0.0.1:8765';
let id=0;
async function rpc(method,params){const r=await fetch(origin+'/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params})});return (await r.json()).result;}
assert.deepEqual((await rpc('server/discover')).supportedVersions,['2026-07-28']);
assert.equal((await rpc('tools/list')).tools.length,2);
const context=(await rpc('tools/call',{name:'read_research_context',arguments:{search:'stapler'}})).structuredContent;
assert.ok(context.existingJobs.some(j=>j.taskId==='HOM-002'));
const date='2099-01-01',get=await fetch(origin+'/api/state').then(r=>r.json()),old=get.records.find(r=>r.collection==='news'&&r.id===date),revision=old?.revision||0;
const first={items:[{title:'Local QA source',url:'https://example.com/qa'}],leads:[{name:'Local QA A',notes:'Original position and note',videoUrl:'https://example.com/qa'}]};
let r=await rpc('tools/call',{name:'save_daily_research',arguments:{date,expectedRevision:revision,briefing:first}});assert.equal(r.isError,undefined);assert.equal(r.structuredContent.saved,true);
const next={items:first.items,leads:[{...first.leads[0],notes:'Must not replace original'}, {name:'Local QA B',notes:'Second position'}]};
r=await rpc('tools/call',{name:'save_daily_research',arguments:{date,expectedRevision:revision+1,briefing:next}});assert.equal(r.structuredContent.leads,2);
r=await rpc('tools/call',{name:'save_daily_research',arguments:{date,expectedRevision:revision,briefing:next}});assert.equal(r.isError,true);
const actual=(await fetch(origin+'/api/state').then(r=>r.json())).records.find(r=>r.collection==='news'&&r.id===date);
assert.equal(actual.data.leads[0].name,'Local QA A');assert.equal(actual.data.leads[0].notes,'Original position and note');assert.equal(actual.data.leads[1].name,'Local QA B');
assert.equal((await fetch(origin+'/mcp',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'})).status,403);
await fetch(origin+'/api/record/news/'+date,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:actual.revision})});
console.log('Passed: research tool discovery, scoped context search, daily save/readback, stable lead order, duplicate suppression, stale-write rejection and origin validation.');
