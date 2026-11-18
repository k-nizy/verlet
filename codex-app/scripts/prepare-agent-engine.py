"""Share Boutique's real description checks with its server and Codex worker."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
html = (root / 'ui/original-boutique.html').read_text(encoding='utf-8-sig')
constants = html[html.index('var ZN='):html.index('var STAGES=')]
checks = html[html.index('var BANNED='):html.index('function checkSummary(')]
roles = html[html.index('var ROLES='):html.index('function isStay(')]
out = '''// Generated from the UI's checks; edit ui/original-boutique.html instead.
export function inspectTask(d, rules, assets) {
const S={rules,ref:{assets}};
function codes(){return rules.codes||DEF_CODES}
function arr(x){return Array.isArray(x)?x:String(x||'').split(/\\n+/).filter(Boolean)}
'''+constants+roles+checks+'''return checkDoc(d);
}
'''
out += '''
export function normalizeTaskZones(d) {
  const clean = z => String(z).replace(/\\(\\s*\\d\\s*\\)/g,'').replace(/\\s*Zone\\b.*$/i,'').trim();
  for (const row of [...(d.initial||[]),...(d.target||[])]) if(Array.isArray(row.zones)) row.zones=row.zones.map(clean);
  if(Array.isArray(d.workZones))d.workZones=d.workZones.map(clean);
  return d;
}
export function resetInitial(forward, reset) {
  const roles=new Map((reset.initial||[]).map(r=>[r.item,r.role]));
  return forward.target.map(t=>({...t,role:roles.get(t.item)||forward.initial.find(i=>i.item===t.item)?.role||'part'}));
}
'''
(root / 'lib/task-engine.mjs').write_text(out, encoding='utf-8')
print('Prepared shared task checks.')
