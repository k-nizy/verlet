# How Codex works with the Verlet Task Agent app

The app lives on claude.ai (Verlet Task Agent). Codex cannot open it, so the two share work through JSON files in this folder.

## From the app to Codex
1. In the app, open **Write** and press **For Codex (JSON)**.
2. Save the file into `codex/inbox/` in this folder, for example `codex/inbox/verlet-agent-export_2026-11-10.json`.
3. The file holds:
   - `rules`: the current in-house rules (same as `rules/inhouse-rules-v1.json`, but always the latest version)
   - `tasks`: every written task, each with its `appId`
   - `confirmedNames`: names the owner confirmed that are not written yet
   - `news`: the last 7 days of the morning briefing, with sources and task leads

## What Codex does
- Write confirmed names, improve tasks, or brainstorm new ones, following `rules/inhouse-rules-v1.md` exactly.
- Keep each task's `appId` when editing an existing task, so the app updates the same task.
- Use the exact shape below. Zones only from: Supply, Tool, Used Equipment, Staging, Operation, Finished Goods.
- Save the result as `codex/outbox/<date>-codex.json` in the shape `{"format":"verlet-agent-v2","tasks":[ ... ]}`.

## From Codex back to the app
In the app, open **Write**, press **Import from Codex** and pick the outbox file. The app runs every check on each task and shows any that fail. Tasks with no `id` get the next free ID for their code.

## Task shape
See `codex/example-import.json` (HOM-001, stapling) for a complete, passing example.

```
{
  "appId": "keep it when editing; leave out for a new task",
  "code": "LIQ | LAB | LID | TOL | CAB | SRT | HOM | CLO | PAK | FIX",
  "id": "HOM-001 (leave empty for a new task)",
  "bunch": "Home, desk and books 01 · Staple and file documents",
  "name": "", "instruction": "one sentence",
  "initial": [{"item": "", "how": "what the job needs, or any way", "zones": ["Supply", "Staging"], "role": "moves | stays | not used"}],
  "steps": ["at most 5, no 'then'"], "target": [""], "free": "",
  "qc": ["one per step"], "pass": "", "fail": "at least three results; separated by semicolons",
  "realTools": "", "needs": "", "usesUp": "", "rigTest": "",
  "reverse": {"possible": true, "why": "", "instruction": "", "steps": [], "target": [], "qc": [], "pass": "", "fail": ""},
  "variation": {"start": "", "doing": "", "end": "", "qcNever": "", "mistakes": ""},
  "platformRisk": "None"
}
```

## Checks the app runs on every task
ID format; one-sentence instruction; every item has how it starts and start zones; only the six zone names; moving items have 2+ start zones; at most 5 steps; one QC line per step; no "then"; no gripper, angle or arm in steps; no banned words; no position words or colours unless needed (warnings); every "until" ends at something visible; Free line; Fail has 3+ results; real tools named; uses-up line; items not in the Asset Pool listed as Needs; reset has at most 5 steps with one QC line each, or a no-reverse reason; Variation Sheet written.
