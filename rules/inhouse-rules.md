# Verlet In-House Rules, version 1.1 (2026-11-10)

These rules apply to every NEW task written for Verlet in-house. The old workbook (verlet-real-tasks) keeps its own older rules in its docs/02 and docs/10; do not mix the two.

Zones (no tape lines): Supply (1), Tool (2), Used Equipment (3), Staging (4), Operation (5), Finished Goods (6).

Codes: LIQ = Liquids, LAB = Tubes, racks and boxes, LID = Lids, latches and cases, TOL = Tools and fasteners, CAB = Cables and wire, SRT = Look-alike sorting, HOM = Home, desk and books, CLO = Clothing and hangers, PAK = Packing and wrapping, FIX = Replace and exchange.

1. [Purpose] One task name covers one real job that can be done in many correct ways. The description fixes what must be true, never how the operator does it.
2. [Purpose] These rules are for tasks created inside Verlet. A customer's tasks follow that customer's own rule set, kept as a separate group.
3. [Names and IDs] Task ID: a 3-letter code, a dash and a 3-digit number, then " · " and the task name. Example: LIQ-001 · Transfer red water into a 50 mL tube and close it.
4. [Names and IDs] Reverse ID: the same ID with R after the number. Example: LIQ-001R · Reset: Transfer red water into a 50 mL tube and close it.
5. [Names and IDs] Bunch (platform category): the group name, a 2-digit number and the family name, for example "Liquids 01 · Fill and close tubes". The reset bunch adds R: "Liquids 01R · Fill and close tubes".
6. [Names and IDs] Codes: LIQ liquids, LAB tubes racks and boxes, LID lids latches and cases, TOL tools and fasteners, CAB cables and wire, SRT look-alike sorting, HOM home desk and books, CLO clothing and hangers, PAK packing and wrapping, FIX replace and exchange. A new code is added only when no code fits.
7. [Instruction] One sentence in plain verbs that names the main items and the finished result. It never describes a method.
8. [Initial State] The Initial State is a table with three columns: Item, How it starts, Start zones. "How it starts" gives only what the job needs (empty, cap off, open, holding red water, loose) or says "any way". Start zones are separated by slashes, for example Supply (1) / Staging (4).
9. [Initial State] A start pose (lying, standing, stacked, open side up, touching) is never written unless the job needs it. The operator chooses how items lie at the start.
10. [Initial State] An item that is used but never moved is marked (stays in place). An item on the bench that is not part of the job is marked (not used).
11. [Steps] At most 5 steps. Each step is one part of the job and says the item, what happens to it, where it goes, and the visible end, for example "until the cap stops turning".
12. [Steps] Parts of a step are joined with commas or "and", never "then".
13. [Steps] Steps never say how to grab, which gripper to use, or at what angle to work.
14. [Steps] Each item's full name is used once in a step. After that, "it" is allowed when it can only mean one item.
15. [Steps] No step repeats what another step already says. No redundancy and no repeated words across the description.
16. [Target State] One line for every item that moved or stayed: where it ends (zone or inside which item) and the result the job created on it (closed, filled, stapled, buttoned). A pose is written only when the job needs one, such as a cup that holds liquid standing upright.
17. [Target State] When more than one ending is correct, every correct ending is listed, joined with "or".
18. [Target State] Everything the operator may choose freely is written in a Free line (for example "any order", "spines facing any side", "which corner"), so QC knows not to judge it.
19. [QC check] One QC line per step, in the same order, checking only the result of that step.
20. [QC check] QC never fails a video for the method, the grip, the angle, the start pose, the order of steps that are not marked "before", or anything in the Free line.
21. [QC check] Pass describes only what the last frame shows: the Target State is seen, nothing fell, nothing spilled.
22. [QC check] Fail lists concrete wrong results only, separated by semicolons, at least three, for example "the tube is open; the pipette is in its start zone; a book is outside the tray".
23. [Zones and variation] Zone runs: the operator chooses one start zone for each item from its list and records 5 to 10 episodes with those zones. Within a run, the way items are held, turned and placed changes every episode. Then the operator chooses new zones, different for at least two items, and starts the next run.
24. [Zones and variation] Within each 2-hour block, every zone on an item's list is used at least twice.
25. [Zones and variation] An item that moves ends in a zone different from where it started, unless it goes into a container. Inside a container it may face any direction and sit at any angle the container allows.
26. [Zones and variation] Zone lists include only zones the arms reach comfortably for that item, judged from its size and weight and the two-jaw 95 mm gripper.
27. [Words] Plain, simple English with short sentences. One name per item, taken from the Asset Pool when the item is there. Office tools keep the name printed on them (JAYO, INGCO, WISEUP, RIVER, Bosch, Ryobi, ANENG, TP-Link, Labshark).
28. [Words] No colours unless two items would otherwise be confused. Use each item as it is. Liquids are "red water".
29. [Words] No position words (middle, top, bottom, left, right, beside, side by side, in a row) unless the job needs them.
30. [Words] Every "until" ends at something visible: until it stops, until the edges meet, until it is empty, until it is fully inside, a count.
31. [Words] Banned words: firmly, neatly, properly, correctly, carefully, gently, slowly, roughly, all the way, around (except "full turns around"), about, some, small, enough, as needed, if, lift, lower, carry, push, pull, slide, let go, pinch, fingers, thumb, hand, wipe, tilt, sweep. Arms are never named.
32. [Safety and bench] Red water is standard; blue water is allowed for an episode and is never a separate task. Liquids never share a task with the power strip. Plastic before glass.
33. [Safety and bench] Only the big black nuts and bolts. Items inside boxes, bags or jars need light so they show on camera; bags are clear or white, never black. Drills are allowed but used simply. Fans are not used.
34. [Safety and bench] A tube is filled only while it stands in its rack or box. A tube taken out of a rack or box returns to the same hole or the same numbered well. Rack holes change each episode, so steps say "an empty hole". Cryobox wells are named by their printed corner numbers (81-hole box: 1, 9, 73, 81; 25-hole box: 1, 5, 21, 25), well 1 top-left in the camera view.
35. [Variation Sheets] Each family has a one-page Variation Sheet posted on every rig and read before the 2-hour block: the correct ways to start, to do the job and to end, the zone runs, what QC never judges, and common mistakes. A task with many more ways than its family gets its own sheet.
36. [Managing the rules] Every rule has a number, a version and a date. A new or changed rule is checked against every other rule before it is saved; any clash is resolved first.
37. [Managing the rules] When a rule changes, every description written under an older version is flagged for review.
38. [Reality] Every task uses the tool people really use for that job. Notes name the real tool, say whether it is in stock and whether it is easy to buy. If the real tool is hard to get, an improvised tool may be used, marked Improvised with the reason.
39. [Reality] QC checks only that the job was really done (stapled, closed, filled) and that nothing fell or spilled. How the operator did it never matters.
40. [Order] The order of steps is free, except where the job itself forces it (paper is gathered before it is stapled; a tube is filled before it is closed). Those steps say "before" or "after".
41. [Materials] A task that uses up material (paper, staples, tape, tissue, water) says in its Notes what is used up and how much per episode. Material not in stock is listed under Needs.
42. [Reverse] The reset starts from the end of the forward episode and ends in a valid start: every moved item back in one of its listed start zones, not the zone it just ended in. If the job cannot be undone with real tools, the Notes say "No reverse" and why.
43. [Platform] A job already on the Verlet platform is not written again as a forward task; it may appear only as a reverse.
44. [Bench] The bench has no tape lines. Operators and QC know the six zones by name. A zone is always written with its number: Supply (1), Tool (2), Used Equipment (3), Staging (4), Operation (5), Finished Goods (6).
45. [Steps] Write the steps first. The instruction, Initial State, Target State, QC check, Pass and Fail are traced from the steps. If any two of them disagree, the task is fixed before it is saved.
46. [Steps] A step or QC line never claims a result that no step made. A result in the middle of the job may be a QC line, for example the tube holds red water before it is closed.
47. [Target State] Every part taken off during the job (cap, lid, wrapper, packaging) appears in the Target State with where it ends, unless a step puts it back.
48. [QC check] QC lines and Pass name only what can be seen on the video at that moment, never hidden contents or past events.
49. [Liquids] Liquid endpoints, in this order of choice: a natural end (the pipette is empty, the source is empty, full to the shoulder); the container's own printed scale; a tape ring on the container only when it has no scale and a partial level is the point of the task (3 to 5 mm wide, ends meeting, lower edge at the level).
50. [Liquids] Liquid amounts add up: the source amount, the number of fills and the space in the receiver agree, for the forward task and its reset. Overflow is tested before recording.
51. [Setup] Every size, fit or reach fact that is not confirmed is listed under "Rig test first" and tested before recording. Sizes are never invented.
52. [Initial State] Start conditions are plain and easy to check. A tidy-up start is allowed (items scattered, open, outside their container), but never a half state (partly stuck, half open, raised corner, half pushed in). No task starts with a deliberate mistake; repair and swap jobs are written as replace or exchange jobs.
53. [Words] Counts are used only when QC can count them in the last frame: up to 10 items, or groups of 5 up to 20. Dominoes come in 10 or 20.
54. [Variety] In a look-alike task, the item that fits ends in a different zone from the item that does not.
55. [Words] Use the everyday word for the job ("button a shirt", "staple the sheets"). The hard case is "closed shut". Steps use plain action verbs: the Controlled Vocabulary (grab, move, take out, put into, put in, put onto, turn, press, place, fill, squeeze, pour, open, close, wrap, fold, peel, tear, plug in, unplug, button, unbutton, zip, unzip, stack, hang, coil) plus everyday job verbs such as gather, staple, sort and hang.
56. [Purpose] One task per kind of job; never two tasks that differ only in colour. Every task is a job clients worldwide would buy data for: real, manipulation-rich, simple to do, never senseless.
57. [Materials] Items used in platform tasks count as in stock even when they are not in the Asset Pool.
58. [Variation Sheets] Every Variation Sheet ends with the standard line: "If something goes wrong: if an item is dropped, stop, set up a valid start again and record again." Tasks do not repeat it.
59. [Words] Descriptions never contain reject codes, QC upload fields, camera instructions, the owner's name or a bunch number.
60. [Checking] A task is Ready only when every check passes. After every 10 tasks the text is re-read from start to end.

## Change log
- 2026-11-10: Version 1.0 agreed in chat
- 2026-11-10: Version 1.1: merged the old rules that still fit (rules 44-60 added; 21, 27, 31, 33, 34 updated); dropped old fixed-zone, fixed-order and fixed-method rules

The master copy of these rules lives in the Verlet Task Agent app (Rules screen). When a rule changes there, export again and replace this file.
