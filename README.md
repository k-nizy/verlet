# Verlet Agent

A research and planning helper for the Verlet Robotics teleop task library.
It is used from two places with the same files: Claude and Codex.

## What it helps with
1. Keep the task-writing rules in one place (`rules/`).
2. Read the workbooks and collect the vocabulary: item names, zones, verbs.
3. Check new task ideas against the platform (Teleop Manager) so nothing is repeated.
4. Brainstorm tasks by family toward 1,200+, names first.
5. Match tasks to stock and list what to buy (how many, cost, where).
6. Research companies that could buy the data, and news on what to add to the rigs and arms.

Each of these is one "desk". See `desks/`.

## How to use it
Ask in plain words, for example:
- "Audit the Electronics Assembly sheet"
- "Brainstorm 30 bottle tasks"
- "What should we buy this week?"

The agent answers in chat first. It writes a file only after you say yes,
and every new file goes into `drafts/` first.

## Folders
| Folder | What is inside | Why it helps later |
|---|---|---|
| `rules/` | The writing rules and how to work | Every desk reads the same rules |
| `knowledge/` | Inventory, platform task export, tool photo list, vocabulary | Facts the desks check against |
| `workbooks/` | Copies of the master and competition workbooks | The agent reads copies, never the originals |
| `desks/` | One instruction file per desk | Says what each desk does and does not do |
| `drafts/` | Anything the agent writes | Waits here until you approve it |
| `log/` | Change log | Shows what changed and when |

## Status
Base folder only. Desks are built one at a time, starting with Rules and Sheet.
