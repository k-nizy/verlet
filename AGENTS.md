# Instructions for the agent (Codex reads this file; Claude reads CLAUDE.md, which points here)

## Before anything
1. Read `rules/how-we-work.md`.
2. For any NEW task: read `rules/inhouse-rules.md`. These are the Verlet In-House Rules. They replace the old fixed-zone rules for new work.
3. For the OLD workbook only (`D:\master task\verlet-real-tasks`): that project keeps its own rules in its `docs/02` and `docs/10`. Do not mix the two rule sets.
4. To exchange work with the Verlet Task Agent app, follow `codex/HOW-CODEX-WORKS-WITH-THE-APP.md`.

## Historical Boutique baseline — 12 November 2026
- The new live app is Boutique: https://boutique-workroom.verletrobotics.chatgpt.site. Its source is `D:/master task/sites/boutique-workroom`; read that folder's AGENTS.md before edits or publishing. Codex manages it directly through Sites. The original Claude app remains intact at https://claude.ai/artifact/N5eJi4gkdJbt5FbCcArMzx.
- `rules/inhouse-rules.md` and `.json` contain the approved v1.13 rules (78 rules). Verify the live version before new writing; the old v1.2 seed files are historical and must not replace live rules.
- The old workbook rules apply only to that old workbook. New Boutique descriptions use item roles, valid start variants, free methods and zones, and first/during/last-frame QC.
- The bridge uses `boutique-agent-v3`: target rows are objects; resets are separate entries. Preserve `appId`, `forwardId` and `forwardRec` when editing existing rows. The bridge guide's v2 example is historical.
- The current design release and its isolated QA adapter are separate under `drafts/boutique-redesign-20261111/`. Never publish `preview.html`, `preview-runtime.js` or `preview-data.json`.
- Review proposed rule clarifications in that draft's `RULES_REVIEW.md`; they are not active rules and must not be silently applied. The owner’s later amendments are active in live v1.10. All 27 forward tasks and 24 existing resets were rewritten on 12 November 2026; keep their rig, stock and procedural review flags visible. Do not silently clear review status on export.

## Always
- Codex owns coordination, implementation and verification from this chat. Do not send prompts to Claude, run Boutique's Claude writer or briefing, or consume another agent's/API's usage allowance without first asking the owner and explaining the purpose and likely usage. Approval for a website edit alone does not authorize spending Claude's weekly allowance. Prefer a direct editing and publishing path; reading existing Claude content does not authorize prompting it.
- Tell the plan first. Build only after it is confirmed.
- Never create a file without saying what it is and why, and getting a yes.
- New drafts go into `drafts/` or `codex/outbox/`. Never change files in `workbooks/` or `knowledge/` unless asked.
- No guessing. Every fact (price, company, platform task, stock count) says where it came from. If you do not know, say so.
- Before asking a question, re-read this folder and the conversation. Ask only what is not answered.
- Add one line to `log/CHANGELOG.md` for every change.

## Git
- Repo: https://github.com/k-nizy/verlet
- Commit and push as **k-nizy only**. Author and committer are k-nizy.
- Do not add Co-Authored-By lines or any other name to commits.
