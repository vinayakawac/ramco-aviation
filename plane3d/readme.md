# ASTRA Aircraft Atlas — AIRCRAFT-001

Interactive Three.js website presenting one canonical narrowbody aircraft (AIRCRAFT-001) from every
angle: realistic and blueprint render modes, selectable systems, cutaway and exploded views,
articulated gear, doors and control surfaces, and a modeled cockpit and cabin.

## Documents

- `product.md` — production specification (source of truth).
- `CLAUDE.md` — project rules for agents; project section first, global rules below.
- `worklog.md` — task list and progress. `insights.md` — reviews and lessons.

## Reference sheets

Fourteen PNG sheets in the project root (orthographic, 3/4, component and interior references).
See `CLAUDE.md` §1 for their priority order and adjudicated conflicts.

## Stack

Vite, TypeScript, three (r180+), Vitest. Procedural geometry exported to GLB. Not yet scaffolded;
see `worklog.md` STEP 01.
