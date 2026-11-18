# Boutique

This GitHub copy starts a fresh database with the approved rules. Historical migration tests need the original private fixtures. UI generation works without those files. The live Sites deployment stores its own records.

Private workroom: https://boutique-workroom.verletrobotics.chatgpt.site

The custom access list contains the owner and the requested external account [private account]. That account can edit Boutique records. Sites labels its external grant Viewer; site-level Editor is available only to workspace members. No workspace membership was created. Current app authorization treats both allowed visitors as content editors; implement roles before adding read-only visitors.

The existing Boutique design is retained. Codex can edit this repository and publish directly through Sites. Claude is not involved in editing, hosting or ordinary app actions.

## Using the app

Use Overview to choose a next move, Writing room to edit and export descriptions, Pipeline to approve names, Ideas to prepare research, Lead bank to evaluate saved sources, Shelf to park possibilities, Sourcing to track equipment, Rules to maintain the standard, Library to consult references, and Start here for guidance.

**Rewrite selected**, **Rewrite all tasks** and **Rewrite task and reset** create durable Codex jobs. The local connector reads current rules, writes the task and reset, runs the shared checks and saves both atomically, retaining previous versions. **Research** saves its answer and sources in the Research queue. **Codex work & backups** shows progress, failures and retries. The browser can close during these jobs; other idea and new-name writing controls return results to the open page.

The owner authorized this connector to use their signed-in Codex account. Keep the connected computer on and online. Claude and separately billed model APIs are not called. Daily research is enabled at 09:00 Africa/Johannesburg through the linked Sites cloud schedule. The saved settings/codex-daily-guide defines evidence, reference types, deduplication and revision-checked news writes; settings/codex-daily-schedule records the enabled schedule. This cloud research schedule is separate from the local writing worker.

Launch `scripts/codex-connector.mjs` from Codex and pass supported Site access through hidden stdin. Credentials remain only in process memory and never reach the model. After a restart or lost access, Codex must reconnect the worker. No persistent access credential or startup service has been installed. Connected requires a recent heartbeat. Earlier manual requests remain preserved and are not silently executed.

The owner's v1.10 amendments require 3–6 meaningful task start states with honest physical exceptions; all identifiable realistic methods and ending arrangements, including uncommon scenarios; no method/ending count cap; and specific confirmed-versus-untested zone restrictions. All variants share the Target State. Sheets may continue onto extra pages.

**Complete backup** downloads records, save history and uploaded media. **Restore backup** previews the record count and merges after confirmation. Matching records replace the current value; the old current value is kept in history. Other records remain. Preserve backups before large edits.

## Editing and publishing

The retained source is `ui/original-boutique.html`; independent runtime controls are in `ui/codex-ui.js` and `public/boutique-runtime.js`. Regenerate with `python scripts/prepare-boutique.py` after UI-source edits. This does not change production records.

Server code is in `lib/workroom.ts`, `lib/agent-jobs.ts` and the API route. Run `python scripts/prepare-agent-engine.py` after editing UI checks to regenerate the shared `lib/task-engine.mjs`. Schema is in `db/schema.ts`; append migrations with `npm run db:generate`. Preserve existing migration files. The database binding is DB; the file bucket is BUCKET.

Build with the Sites skill's `build-site.mjs`. For local QA, apply the generated SQL to local D1 and run `npm start -- --port 8765`, then `node scripts/verify-workroom.mjs`. Stop the preview before rebuilding on Windows because Wrangler holds build files open.

Publish the exact pushed commit with the Sites source helper and the ordinary save/version/deploy actions. Preserve the private custom allowlist. The owner-private publishing shortcut no longer applies after the authorized external access grant. The initial seed inserts missing records only until its completion marker exists; subsequent deployments never reseed the database.

## Direct data maintenance from Codex

First inspect Sites `get_site` access configuration. This API is authorized only within this private Site's explicit access list. Use a supported Site service credential if returned, keeping it in memory and sending it only to this Site as `OAI-Sites-Authorization: Bearer ...`. Never create a bypass token just to test access. Browser visits use the normal Sites sign-in gate. Do not use the verification script after legitimate content edits: its initial-content comparison intentionally expects the original transfer baseline.

- `GET /api/state`: current records, data and revisions.
- `GET /api/backup`: records, history and file metadata. The UI additionally includes media bytes in its downloaded backup.
- `PUT /api/record/<collection>/<id>`: `{data, expectedRevision}`. Use revision 0 only for a new record. A stale revision returns 409; re-read before deciding what to change.
- `DELETE /api/record/<collection>/<id>`: `{expectedRevision}`. The prior value is retained in history.
- `GET /api/history?collection=...&id=...`: up to 100 previous values for one record. Restore a selected prior value with a normal revision-checked PUT.
- `POST /api/file`: raw image/video bytes, Content-Type image/png, image/jpeg, video/mp4 or video/webm, at most 20 MB. It returns the media ID.
- `GET /api/file/<id>`: stored media.

Use the existing `boutique-agent-v3` task JSON import/export when that is more appropriate. Keep appId, forwardId and forwardRec. Import intentionally runs task checks and can change the review status; direct migration did not run an import or rewrite descriptions.

See `MIGRATION.md` for transfer scope and limitations.

## Daily research tools

The private Site exposes `read_research_context` and `save_daily_research` at its Sites-managed MCP endpoint. The connected researcher can read current rules, stock, prior leads and catalogue matches without a credential in its prompt. The writer validates sources and revisions, preserves existing lead order and appends unique items; date/index keys keep votes and decisions attached correctly. Local regression checks are `node scripts/verify-agent.mjs` and `node scripts/verify-research-tools.mjs`, with the preview running.

## Operator and QC Excel export
In Writing room choose **Download operator / QC Excel**. The exported workbook follows the earlier operator task sheet: one task and its continuation rows share an ID and show instructions, QC failure checks, pass/fail, initial and target placements, setup notes and the paired task. Variations, per-item zones and evaluation rows are separate tabs. Every saved forward and reset is included, review status is retained and exporting never changes records. Long text continues on labelled rows. The app builds each download from current saved records.
