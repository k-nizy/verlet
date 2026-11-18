"""Prepare the retained Boutique UI and a traceable migration seed."""
import json, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
if all((ROOT/'data'/name).exists() for name in ('original-export.json', 'visible-migration.json', 'rules-at-transfer.json')):
    export = json.loads((ROOT/'data/original-export.json').read_text(encoding='utf-8-sig'))
    visible = json.loads((ROOT/'data/visible-migration.json').read_text(encoding='utf-8'))
    records = []
    def add(collection, id, data):
        records.append(dict(collection=collection,id=id,data=data))

    add('rules','inhouse',json.loads((ROOT/'data/rules-at-transfer.json').read_text(encoding='utf-8-sig')))
    for task in export['tasks']:
        doc = {k:v for k,v in task.items() if k not in ['appId','status','rulesVersion','forwardRec']}
        add('tasks',task['appId'],dict(name=task['name'],doc=doc,status=task['status'],rulesVersion=task.get('rulesVersion',''),forwardRec=task.get('forwardRec',''),source='Original Boutique export'))
    for item in visible['pipeline']:
        add('tasks',item['id'],{k:v for k,v in item.items() if k!='id'})
    for news in export['news']:
        add('news',news['id'],{k:v for k,v in news.items() if k!='id'})
    for item in visible['sourcing']:
        data=item['fields'].copy()
        ref=item['reference'].split(' · unlocks ')
        data['assetId']=ref[0] if ref[0].startswith('AST-') else ''
        data['tasks']=ref[1].split(': ',1)[1].split(', ') if len(ref)>1 else []
        for field in ['qty','priceLow','priceHigh']:
            data[field]=float(data[field]) if data[field] else None
        add('sourcing',item['id'],data)
    for item in visible['shelf']:
        data=item['fields'].copy()
        data['migrationReviewedDate']=item['facts'].get('Reviewed','')
        # Exact times and actor IDs are not exposed by the original UI.
        # Preserve the displayed date separately rather than inventing a timestamp.
        add('shelf',item['id'],data)
    add('settings','studio',dict(focus=visible['studio'].get('focus',''),watch=visible['studio'].get('watch','').splitlines()))
    if visible.get('brief',{}).get('items'):
        brief=visible['brief']
        # The UI separates IDs and names with the same separator as between entries.
        # Join adjacent ID/name strings back into the displayed task names.
        import re
        for entry in brief['items']:
            parts=entry['names']; names=[]; i=0
            while i<len(parts):
                if re.fullmatch(r'[A-Z]{3}-\d{3}R?',parts[i]) and i+1<len(parts):
                    names.append(parts[i]+' · '+parts[i+1]);i+=2
                else: names.append(parts[i]);i+=1
            entry['names']=names
        add('briefs','latest',brief)
    report = dict(
      source='Original Boutique: For Codex JSON export plus read-only capture of visible screens',
      capturedAt=visible['capturedAt'],
      contentCounts=dict(forward=27,resets=24,pipelineIdeas=20,sourcing=20,shelf=9,newsBriefings=2,leads=40,rules=72),
      preserved=['All exported task/reset descriptions, IDs, forward links, saved status and rules versions','Both exported briefings and their 40 leads','20 visible pipeline names and their needs','All editable sourcing and shelf fields, with original record IDs','Reference files, workspace focus/watchlist and visible saved agent briefing'],
      limitations=['The old app has no full database export. Original per-record actor IDs, exact timestamps, pipeline notes not shown on screen, and any hidden per-lead overrides are not certified as transferred.','Original app and its saved data remain intact. No old records have been deleted or rewritten.','The saved platform catalogue was empty. It still needs a fresh read before duplicate checks can be treated as complete.','Daily AI briefings are not scheduled on this new site. Research and writing requests wait for Codex in the chat.'],
    )
    add('migration','20261111',report)
    (ROOT/'data').mkdir(exist_ok=True)
    (ROOT/'data/migration-seed.json').write_text(json.dumps(dict(records=records),ensure_ascii=False),encoding='utf-8')
    (ROOT/'MIGRATION.md').write_text('# Boutique transfer\n\n'+json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

public=ROOT/'public'; public.mkdir(exist_ok=True)
html=(ROOT/'ui/original-boutique.html').read_text(encoding='utf-8-sig')
html=html.replace('</head>', '<link rel="stylesheet" href="/boutique-theme.css?v=20261113-sage">\n</head>', 1)
shutil.copyfile(ROOT/'ui/boutique-theme.css', public/'boutique-theme.css')
start=html.index('function waitUse(name)');end=html.index('function loadRef()',start)
html=html[:start]+"function waitUse(name){return window.boutique.use(name)}\n"+html[end:]
html=html.replace('waitUse("sample").then(function(s){S.sample=s;setDot("ai",!!s,s?"Claude: ready":"Claude: not available here")});','S.sample=true;setDot("ai",false,"AI: requests only");')
html=html.replace('Open the page on claude.ai while signed in.','Reload Boutique while signed in.')
html=html.replace('Claude: waiting','AI: requests only')
html=html.replace('Questions for Claude to research on the web. In a chat with Claude, say "run the Boutique research queue". Answers come back here with sources.','Questions for Codex to research. Ask this chat to read the research queue. No agent runs automatically.')
html=html.replace('What should Claude find out?','What should Codex find out?')
html=html.replace('src="/_blob/', 'src="/api/file/').replace("'/_blob/","'/api/file/").replace('"/_blob/','"/api/file/')
html=html.replace('window.__boutique={checkDoc:checkDoc,normalize:normalize,S:S};','')
html=html.replace('initBoutiqueUI();', 'initBoutiqueUI();\n'+(ROOT/'ui/codex-ui.js').read_text(encoding='utf-8')+'\n'+(ROOT/'ui/save-review.js').read_text(encoding='utf-8')+'\n'+(ROOT/'ui/saved-answer.js').read_text(encoding='utf-8')+'\n'+(ROOT/'ui/workflows.js').read_text(encoding='utf-8')+'\n'+(ROOT/'ui/request-controls.js').read_text(encoding='utf-8')+'\n'+(ROOT/'ui/task-pack.js').read_text(encoding='utf-8'),1)
html=html.replace('<script>\n(function()', '<script src="/boutique-runtime.js"></script>\n<script>\n(function()',1)
if '/boutique-runtime.js' not in html:
    pos=html.index('<script>',html.index('<body'))
    html=html[:pos]+'<script src="/boutique-runtime.js"></script>\n'+html[pos:]
# Replace obsolete platform-refresh instructions, without initiating a refresh.
start=html.index('var PLAT_PROMPT=');end=html.index("';",start)+2
html=html[:start]+'''var PLAT_PROMPT='Read Teleop Manager in Codex using the connected browser. Preserve every platform record. Save the read-only catalogue in this private Boutique through its supported storage API; record the source, count and read time. Do not call Claude or spend an external AI allowance.';'''+html[end:]
html=html.replace('To refresh: open a Claude chat where your computer is connected (the Claude desktop app, signed in to Teleop Manager), paste the refresh request and send it. Claude reads the platform and saves the list here. Every name you paste in Write is then checked against it before writing.','To refresh, ask Codex in this chat to read Teleop Manager and update the saved catalogue. Until it is loaded, duplicate checks are incomplete. Pasting a task name does not start an AI agent.')
html=html.replace('What should we look at?</button>','Request planning in Codex</button>')
html=html.replace('Claude is not available here.','Open Codex requests to prepare this work.')
html=html.replace('AI writer','Codex request queue')
html=html.replace('The agent writes the full description, the reset and the Variation Sheet under the in-house rules, checks it and saves it.','Prepare a writing request for Codex, or open a saved description to edit it directly. Requests wait for this chat; they do not run an agent.')
html=html.replace('The agent shows what it understood before writing. About a minute per task; keep this page open. Rules:','Read the parsed list before requesting work. Ask Codex in this chat to complete the request; you can close this page. Rules:')
html=html.replace('Thinking…','Preparing request…')
html=html.replace('Can we build this?</button>','Request idea review</button>')
html=html.replace('id="do-brain">Brainstorm</button>','id="do-brain">Request new ideas</button>')
html=html.replace('id="r-check">Check for conflicts</button>','id="r-check">Request a rules review</button>')
html=html.replace('Write ticked</button>','Request writing</button>')
html=html.replace('Rewrite ticked</button>','Request rewrite</button>')
html=html.replace('Rewrite all under current rules','Request all rewrites in Codex')
html=html.replace('Confirm a name when you want it written.','Confirm a name when you want Codex to write it.')
html=html.replace('Written opens the description; Exported records that a copy was produced.','Request writing, continue in this chat, and review the result here. Exported records that a copy was produced.')
html=html.replace('The first briefing arrives tomorrow before 9:00.','No saved briefing yet. Ask Codex in this chat to research one.')
html=html.replace('The daily briefing adds 10 to 20 each morning before 9:00 Kigali time.','Ask Codex in this chat to research new leads. No automatic briefing is scheduled.')
html=html.replace('No briefing yet. It arrives each morning before 9:00 Kigali time, with a notification.','No saved briefing yet. Request one from Codex in this chat.')
# Preserve the original saved shelf review date without inventing a precise time.
html=html.replace('esc(day(s.reviewedAt||s.updatedAt))','esc(s.reviewedAt||s.updatedAt?day(s.reviewedAt||s.updatedAt):(s.migrationReviewedDate||"Date unavailable"))')
html=html.replace('"Last run "+day(b.at)','"Saved briefing"+(b.at?" · "+day(b.at):" · migrated from original Boutique")')
# Current automatic connector copy overrides historical request-only labels.
html=html.replace('Request all rewrites in Codex','Rewrite all tasks')
html=html.replace('Request rewrite</button>','Rewrite selected</button>')
html=html.replace('Questions for Codex to research. Ask this chat to read the research queue. No agent runs automatically.','Ask a question and Codex researches it, then saves the answer and sources here. Open Codex work to follow progress.')
html=html.replace('Prepare a writing request for Codex, or open a saved description to edit it directly. Requests wait for this chat; they do not run an agent.','Write or rewrite descriptions with your connected Codex worker, or edit a saved description directly.')
html=html.replace('Read the parsed list before requesting work. Ask Codex in this chat to complete the request; you can close this page. Rules:','Review the parsed list before writing. All write and rewrite jobs save automatically; you may close this page. Rules:')
html=html.replace('Request writing, continue in this chat, and review the result here. Exported records that a copy was produced.','Review the saved result here. Exported records that a copy was produced.')
html=html.replace('Request writing</button>','Write selected</button>')
html=html.replace('To refresh, ask Codex in this chat to read Teleop Manager and update the saved catalogue. Until it is loaded, duplicate checks are incomplete. Pasting a task name does not start an AI agent.','Ask Codex in the desktop chat to read the signed-in Teleop Manager and refresh the saved catalogue. This browser-only source needs that connection; duplicate checks remain incomplete until it is loaded.')
html=html.replace('"Waiting")+\'</span><button class="btn small" data-rq', '(r.status==="failed"?"Needs attention":r.status==="running"?"Researching":"Queued"))+\'</span><button class="btn small" data-rq')
html=html.replace('Ask Codex in this chat to research new leads. No automatic briefing is scheduled.','Daily research adds sourced leads and demonstrations; see the saved schedule above.')
html=html.replace('No saved briefing yet. Ask Codex in this chat to research one.','No new briefing yet. The next daily research run will add verified sources and demonstrations.')
html=html.replace('Only tasks with no failing checks','Only ready tasks (For Codex only)')
html=html.replace('AI: requests only','Codex: connecting…')
(public/'boutique.html').write_text(html,encoding='utf-8')
import urllib.parse
icon=html.split("href='data:image/svg+xml,",1)[1].split("'>",1)[0]
(public/'favicon.svg').write_text(urllib.parse.unquote(icon),encoding='utf-8')
print(json.dumps(dict(uiBytes=len(html.encode('utf-8')))))
