// Generated from the UI's checks; edit ui/original-boutique.html instead.
export function inspectTask(d, rules, assets) {
const S={rules,ref:{assets}};
function codes(){return rules.codes||DEF_CODES}
function arr(x){return Array.isArray(x)?x:String(x||'').split(/\n+/).filter(Boolean)}
var ZN=["Supply","Tool","Used Equipment","Staging","Operation","Finished Goods"];
var ZFULL={"Supply":"Supply Zone (1)","Tool":"Tool Zone (2)","Used Equipment":"Used Equipment Zone (3)","Staging":"Staging Zone (4)","Operation":"Operation Zone (5)","Finished Goods":"Finished Goods Zone (6)"};
var DEF_CODES={LIQ:"Liquids",LAB:"Tubes, racks and boxes",LID:"Lids, latches and cases",TOL:"Tools and fasteners",CAB:"Cables and wire",SRT:"Look-alike sorting",HOM:"Home, desk and books",CLO:"Clothing and hangers",PAK:"Packing and wrapping",FIX:"Replace and exchange"};
var ROLES=["product","base","source","hand tool","used tool","tool with a home","part","part taken off","leftover","waste holder","not used"];
function roleOf(r){var x=String(r||"").toLowerCase().trim();if(x==="stays")return "base";if(x==="tool with home")return "tool with a home";return x||"moves"}
function isProduct(r){r=roleOf(r);return r==="product"||r==="moves"}
var BANNED=["firmly","neatly","properly","correctly","carefully","gently","slowly","roughly","all the way","around","about","some","small","enough","as needed","if","lower","slide","let go","pinch","fingers","thumb","hand","tilt"];
var POS=["middle","top","bottom","left","right","beside","side by side","in a row"];
var COLOURS=["blue","green","yellow","orange","purple","pink","black","white","grey","gray","brown"];
function rx(w){return new RegExp("\\b"+w.replace(/\s+/g,"\\s+")+"\\b","i")}
function nm(s){return String(s||"").toLowerCase().replace(/\(.*?\)/g,"").replace(/\s+/g," ").trim()}
function vlist(v,k){var x=(v||{})[k];return Array.isArray(x)?x.filter(function(s){return String(s).trim()}):arr(x)}
function checkDoc(d){
  var out=[];function add(ok,name,note,level){out.push({ok:!!ok,level:ok?"ok":(level||"bad"),name:name,note:note||""})}
  var c=codes(),isR=!!d.isReverse;
  add(isR?/^[A-Z]{3}-\d{3}R$/.test(d.id||""):/^[A-Z]{3}-\d{3}$/.test(d.id||""),isR?"Reset ID is the task ID with R":"ID is 3 letters, a dash and 3 digits",d.id||"no ID");
  add(c[String(d.id||"").slice(0,3)],"ID uses a known category code",String(d.id||"").slice(0,3),"warn");
  add(d.name&&d.name.length>5,"Task name present");
  var ins=String(d.instruction||"").trim();add(ins&&ins.split(/[.!?](\s|$)/).filter(function(x){return x&&x.trim()}).length===1,"Instruction is one sentence");
  var ini=d.initial||[],tg=d.target||[];var badZ=[];
  ini.concat(tg).concat([{zones:d.workZones||[]}]).forEach(function(r){(r.zones||[]).forEach(function(z){if(ZN.indexOf(z)<0)badZ.push(z)})});
  add(ini.length>0&&ini.every(function(r){return r.item&&r.how&&((r.zones||[]).length||r.place)}),"Initial State: every item has how it starts and where");
  add(!badZ.length,"Only the six zone names are used",badZ.length?"Unknown: "+badZ.join(", "):"");
  if(!isR){var mv=ini.filter(function(r){return isProduct(r.role)});add(mv.every(function(r){return (r.zones||[]).length>=2}),"Every moving item has at least two start zones","","warn")}
  add(tg.length>0&&tg.every(function(r){return typeof r==="object"&&r.item&&r.how}),"Target State table: every row has how it ends with its job-specific placement");
  var tn=tg.map(function(r){return nm(r.item)});var missing=ini.filter(function(r){return tn.indexOf(nm(r.item))<0}).map(function(r){return r.item});
  add(!missing.length,"Every Initial State item has a Target State row",missing.join(", "));
  var st=d.steps||[],qc=d.qc||[];
  add(st.length>=1&&st.length<=5,"At most 5 steps",st.length+" steps");
  add((d.workZones||[]).length>0,"Work zone named (rule 67)","","warn");
  var narrow=ini.filter(function(r){return isProduct(r.role)&&(r.zones||[]).length<4});add(!ini.some(function(r){return r.zones&&r.zones.length>0&&r.zones.length<6})&&(!d.workZones||d.workZones.length===6)||String(d.zoneNotes||"").trim().length>3,"Restricted start and work zones have a reason (rule 8)",narrow.map(function(r){return r.item}).join(", "),"warn");
  add(qc.length>=1&&qc.length<=3,"1 to 3 mistakes special to this task (rule 22)",qc.length+" lines","warn");
  var badRole=ini.filter(function(r){var x=roleOf(r.role);return ROLES.indexOf(x)<0&&x!=="moves"});add(!badRole.length,"Every item has a known role (rule 10)",badRole.map(function(r){return r.item+": "+r.role}).join(", "),"warn");
  if(!isR){var hasLeft=ini.some(function(r){return roleOf(r.role)==="leftover"})||tg.some(function(r){return /waste holder/i.test(r.place||"")});var wh=String(d.wasteHolder||"").trim();add(!hasLeft||(wh&&!/^none/i.test(wh)),"Waste holder named when the job makes waste (rule 71)",wh||"none","warn");
    var vagueTool=tg.filter(function(r){var s0=ini.filter(function(x){return nm(x.item)===nm(r.item)})[0];return s0&&roleOf(s0.role)==="hand tool"&&/^(used|any way|as it is)?$/i.test(String(r.how||"").trim())});add(!vagueTool.length,"Hand tools end in a concrete ready state (rule 61)",vagueTool.map(function(r){return r.item}).join(", "),"warn");
    add((vlist(d.variation||{},"startVariants").length>=3&&vlist(d.variation||{},"startVariants").length<=6)||!!String(d.zoneNotes||"").trim()&&vlist(d.variation||{},"startVariants").length>0,"3 to 6 task start states, or a physical exception (rule 70)",vlist(d.variation||{},"startVariants").length+" listed","warn");add(String((d.variation||{}).time||"").trim().length>2,"Time per episode in the Variation Sheet (rule 65)","","warn");
    var noOC=ini.filter(function(r){return /bottle|box|case|jar|tube|lid|cap\b|bag|file|binder|stapler|\btin\b|container|envelope|capsule/i.test(r.item)&&!/rack|holder|tray|plate|reel|stand/i.test(r.item)&&roleOf(r.role)!=="not used"&&!/open|clos|cap (on|off)|lid (on|off)|\bon the\b|\boff the\b|zipped|sealed|inside/i.test(r.how||"")});add(!noOC.length,"Open or closed is written for items that open (rule 9)",noOC.map(function(r){return r.item}).join(", "),"warn")}
  var v=d.variation||{};var vtxt=[].concat(vlist(v,"start"),vlist(v,"doing"),vlist(v,"end"),vlist(v,"scenarios"),vlist(v,"mistakes"),[v.qcNever||""]).join("\n");
  var tgTxt=tg.map(function(r){return r.item+" "+r.how+" "+(r.place||"")}).join("\n");
  var all=[d.instruction].concat(st,qc,[tgTxt,d.pass,d.fail,d.free]).join("\n");
  add(!/\bthen\b/i.test(all+"\n"+vtxt),"No “then”");
  add(!/\bgripper|\bangle\b|\bleft arm\b|\bright arm\b|\bleader\b|\bfollower\b/i.test(st.join("\n")),"Steps never say gripper, angle or arm");
  var body=(all+"\n"+vtxt).replace(/full turns around/gi,"");var hits=BANNED.filter(function(w){return rx(w).test(body)});add(!hits.length,"No banned words",hits.join(", "));
  var ph=POS.filter(function(w){return rx(w).test(all)});add(!ph.length,"No position words unless the job needs them",ph.join(", "),"warn");
  var ch=COLOURS.filter(function(w){return rx(w).test(all)});add(!ch.length,"No colours unless needed",ch.join(", "),"warn");
  var dang=st.filter(function(s){return /\buntil\s*[.,;]?$/i.test(s)});add(!dang.length,"Every “until” ends at something visible");
  add(String(d.free||"").trim().length>0,"Free line present");
  add(String(d.fail||"").split(";").filter(function(x){return x.trim()}).length>=3,"Fail lists at least three concrete results");
  if(!isR){add(String(d.realTools||"").trim().length>0,"Real tools named");add(String(d.usesUp||"").trim().length>0,"Uses-up line present")}
  var strip=function(s){return String(s).toLowerCase().replace(new RegExp("\\b("+COLOURS.concat(["red","clear"]).join("|")+")\\b","g"),"").replace(/\(.*?\)/g,"").replace(/^\d+\s+/,"").replace(/\s+/g," ").trim()};
  if(!isR){var A=((S.ref.assets&&S.ref.assets.items)||[]).map(function(a){return strip(a.name)});
    var unk=ini.map(function(r){return r.item}).filter(function(n){if(!n)return false;var k=strip(n);return !A.some(function(a){return a===k||a.indexOf(k)>=0||k.indexOf(a)>=0})});
    var needs=String(d.needs||"").toLowerCase();var unlisted=unk.filter(function(n){return needs.indexOf(strip(n))<0});
    add(!unlisted.length,"Items not in the Asset Pool are listed as Needs",unlisted.join(", "),"warn")}
  add(vlist(v,"start").length>=3&&vlist(v,"doing").length>0&&vlist(v,"end").length>0&&vlist(v,"scenarios").length>=3&&vlist(v,"mistakes").length>=3&&String(v.qcNever||"").trim(),"Variation Sheet sections present; review method and ending coverage",vlist(v,"start").length+"/"+vlist(v,"doing").length+"/"+vlist(v,"end").length+"/"+vlist(v,"scenarios").length+"/"+vlist(v,"mistakes").length);
  if(!isR){var r=d.reverse||{};add(r.possible!==false||String(r.why||"").trim(),"Reset written, or the reason it is not")}
  return out;
}
return checkDoc(d);
}

export function normalizeTaskZones(d) {
  const clean = z => String(z).replace(/\(\s*\d\s*\)/g,'').replace(/\s*Zone\b.*$/i,'').trim();
  for (const row of [...(d.initial||[]),...(d.target||[])]) if(Array.isArray(row.zones)) row.zones=row.zones.map(clean);
  if(Array.isArray(d.workZones))d.workZones=d.workZones.map(clean);
  return d;
}
export function resetInitial(forward, reset) {
  const roles=new Map((reset.initial||[]).map(r=>[r.item,r.role]));
  return forward.target.map(t=>({...t,role:roles.get(t.item)||forward.initial.find(i=>i.item===t.item)?.role||'part'}));
}
