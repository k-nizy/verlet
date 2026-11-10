# Instructions for the agent (Codex reads this file; Claude reads CLAUDE.md, which points here)

## Before anything
1. Read `rules/how-we-work.md`.
2. For any NEW task: read `rules/inhouse-rules-v1.md`. These are the Verlet In-House Rules. They replace the old fixed-zone rules for new work.
3. For the OLD workbook only (`D:\master task\verlet-real-tasks`): that project keeps its own rules in its `docs/02` and `docs/10`. Do not mix the two rule sets.
4. To exchange work with the Verlet Task Agent app, follow `codex/HOW-CODEX-WORKS-WITH-THE-APP.md`.

## Always
- Tell the plan first. Build only after it is confirmed.
- Never create a file without saying what it is and why, and getting a yes.
- New drafts go into `drafts/` or `codex/outbox/`. Never change files in `workbooks/` or `knowledge/` unless asked.
- No guessing. Every fact (price, company, platform task, stock count) says where it came from. If you do not know, say so.
- Before asking a question, re-read this folder and the conversation. Ask only what is not answered.
- Add one line to `log/CHANGELOG.md` for every change.

## Git
- Repo: https://github.com/k-nizy/Agent.1
- Commit and push as **k-nizy only**. Author and committer are k-nizy.
- Do not add Co-Authored-By lines or any other name to commits.
