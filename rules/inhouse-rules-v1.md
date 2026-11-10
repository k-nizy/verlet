# Verlet In-House Rules, version 1.0 (2026-11-10)

These rules apply to every NEW task written for Verlet in-house. The old workbook (verlet-real-tasks) keeps its own older rules in its docs/02 and docs/10; do not mix the two.

Zones (no tape lines): Supply, Tool, Used Equipment, Staging, Operation, Finished Goods.

Codes: LIQ = Liquids, LAB = Tubes, racks and boxes, LID = Lids, latches and cases, TOL = Tools and fasteners, CAB = Cables and wire, SRT = Look-alike sorting, HOM = Home, desk and books, CLO = Clothing and hangers, PAK = Packing and wrapping, FIX = Replace and exchange.


## Purpose

1. One task name covers one real job that can be done in many correct ways. The description fixes what must be true, never how the operator does it.
2. These rules are for tasks created inside Verlet. A customer's tasks follow that customer's own rule set, kept as a separate group.

## Names and IDs

3. Task ID: a 3-letter code, a dash and a 3-digit number, then " · " and the task name. Example: LIQ-001 · Transfer red water into a 50 mL tube and close it.
4. Reverse ID: the same ID with R after the number. Example: LIQ-001R · Reset: Transfer red water into a 50 mL tube and close it.
5. Bunch (platform category): the group name, a 2-digit number and the family name, for example "Liquids 01 · Fill and close tubes". The reset bunch adds R: "Liquids 01R · Fill and close tubes".
6. Codes: LIQ liquids, LAB tubes racks and boxes, LID lids latches and cases, TOL tools and fasteners, CAB cables and wire, SRT look-alike sorting, HOM home desk and books, CLO clothing and hangers, PAK packing and wrapping, FIX replace and exchange. A new code is added only when no code fits.

## Instruction

7. One sentence in plain verbs that names the main items and the finished result. It never describes a method.

## Initial State

8. The Initial State is a table with three columns: Item, How it starts, Start zones. "How it starts" gives only what the job needs (empty, cap off, open, holding red water, loose) or says "any way". Start zones are separated by slashes, for example Supply / Staging.
9. A start pose (lying, standing, stacked, open side up, touching) is never written unless the job needs it. The operator chooses how items lie at the start.
10. An item that is used but never moved is marked (stays in place). An item on the bench that is not part of the job is marked (not used).

## Steps

11. At most 5 steps. Each step is one part of the job and says the item, what happens to it, where it goes, and the visible end, for example "until the cap stops turning".
12. Parts of a step are joined with commas or "and", never "then".
13. Steps never say how to grab, which gripper to use, or at what angle to work.
14. Each item's full name is used once in a step. After that, "it" is allowed when it can only mean one item.
15. No step repeats what another step already says. No redundancy and no repeated words across the description.

## Target State

16. One line for every item that moved or stayed: where it ends (zone or inside which item) and the result the job created on it (closed, filled, stapled, buttoned). A pose is written only when the job needs one, such as a cup that holds liquid standing upright.
17. When more than one ending is correct, every correct ending is listed, joined with "or".
18. Everything the operator may choose freely is written in a Free line (for example "any order", "spines facing any side", "which corner"), so QC knows not to judge it.

## QC check

19. One QC line per step, in the same order, checking only the result of that step.
20. QC never fails a video for the method, the grip, the angle, the start pose, the order of steps that are not marked "before", or anything in the Free line.
21. Pass: the Target State is seen, nothing fell, nothing spilled.
22. Fail lists concrete wrong results only, separated by semicolons, at least three, for example "the tube is open; the pipette is in its start zone; a book is outside the tray".

## Zones and variation

23. Zone runs: the operator chooses one start zone for each item from its list and records 5 to 10 episodes with those zones. Within a run, the way items are held, turned and placed changes every episode. Then the operator chooses new zones, different for at least two items, and starts the next run.
24. Within each 2-hour block, every zone on an item's list is used at least twice.
25. An item that moves ends in a zone different from where it started, unless it goes into a container. Inside a container it may face any direction and sit at any angle the container allows.
26. Zone lists include only zones the arms reach comfortably for that item, judged from its size and weight and the two-jaw 95 mm gripper.

## Words

27. Plain, simple English with short sentences. One name per item, taken from the Asset Pool when the item is there.
28. No colours unless two items would otherwise be confused. Use each item as it is. Liquids are "red water".
29. No position words (middle, top, bottom, left, right, beside, side by side, in a row) unless the job needs them.
30. Every "until" ends at something visible: until it stops, until the edges meet, until it is empty, until it is fully inside, a count.
31. Banned vague words: firmly, neatly, properly, all the way, around, about, some, as needed. Arms are never named.

## Safety and bench

32. Red water is standard; blue water is allowed for an episode and is never a separate task. Liquids never share a task with the power strip. Plastic before glass.
33. Only the big black nuts and bolts. Items inside boxes, bags or jars need light so they show on camera. Fans are not used.
34. A 15 mL tube goes into its rack before it is filled. Cryobox wells are named by their printed corner numbers (81-hole box: 1, 9, 73, 81; 25-hole box: 1, 5, 21, 25).

## Variation Sheets

35. Each family has a one-page Variation Sheet posted on every rig and read before the 2-hour block: the correct ways to start, to do the job and to end, the zone runs, what QC never judges, and common mistakes. A task with many more ways than its family gets its own sheet.

## Managing the rules

36. Every rule has a number, a version and a date. A new or changed rule is checked against every other rule before it is saved; any clash is resolved first.
37. When a rule changes, every description written under an older version is flagged for review.

## Reality

38. Every task uses the tool people really use for that job. Notes name the real tool, say whether it is in stock and whether it is easy to buy. If the real tool is hard to get, an improvised tool may be used, marked Improvised with the reason.
39. QC checks only that the job was really done (stapled, closed, filled) and that nothing fell or spilled. How the operator did it never matters.

## Order

40. The order of steps is free, except where the job itself forces it (paper is gathered before it is stapled; a tube is filled before it is closed). Those steps say "before" or "after".

## Materials

41. A task that uses up material (paper, staples, tape, tissue, water) says in its Notes what is used up and how much per episode. Material not in stock is listed under Needs.

## Reverse

42. The reset starts from the end of the forward episode and ends in a valid start: every moved item back in one of its listed start zones, not the zone it just ended in. If the job cannot be undone with real tools, the Notes say "No reverse" and why.

## Platform

43. A job already on the Verlet platform is not written again as a forward task; it may appear only as a reverse.


The master copy of these rules lives in the Verlet Task Agent app (Rules screen). When a rule changes there, export again and replace this file.
