# PROJECT: ASTRA Aircraft Atlas — AIRCRAFT-001 (Three.js website)

Read this section first. It overrides the general rules further below when they conflict.

## 1. Spec authority

`product.md` is the canonical production specification for AIRCRAFT-001. Every geometry, material,
camera, animation, and UI decision must trace back to it. When anything disagrees, resolve in this order:

1. `product.md` canonical dimensions and rules (§2, §5, §52)
2. Orthographic reference sheets (`left-right-view.png`, `top-view.png`, `front-back-view.png`, `bottom-view.png`)
3. Multi-angle sheets (`general-arrangement.png`, `aircraft.png`, `exterior-3_4-view.png`)
4. Component sheets (`engine-detail.png`, `wing-detail.png`, `landing-gear.png`, `door-and-exit.png`, `cockpit-detail.png`, `interior-reference.png`)
5. Photorealistic renders inside those sheets

Never distort the model to match one image. Never treat text printed on an image as truth (§45).

### Locked master dimensions (meters)

| Property | Value |
| --- | --- |
| Overall length | 39.5 |
| Overall height | 12.5 |
| Wingspan | 35.8 |
| Wheelbase | 13.0 |
| Nose to main gear | 12.6 |
| Fuselage diameter | 3.95 |
| Engines | Twin turbofan, underwing |
| Seating | ~180 single-aisle |
| Livery | White fuselage, navy tail, navy winglets, navy fuselage accent |

### Known reference conflicts (already adjudicated — do not re-open)

- `general-arrangement.png` and `aircraft.png` print "158 (2-class)" seating and 2.14 m cabin height. Spec says ~180. Spec wins.
- `left-right-view.png` right-side render prints "13.6 m" wheelbase. Spec says 13.0. Spec wins.
- `general-arrangement.png` shows a "4.14 m" cross-section height. Treat as fuselage outer height incl. belly fairing; fuselage diameter stays 3.95.

## 2. Stack (decided)

- Vite + TypeScript + `three` (ES modules, r180+ APIs). Matches sibling projects `../ramco-3d` and `../ramco-plane`.
- Vitest for unit tests. Geometry validation tests (dimensions, symmetry, node names, metadata) are written before the geometry they check.
- No DCC tool (Blender etc.) is available in this environment. The aircraft is built procedurally in code
  (lathe/extrude/shape geometry with shared materials) and exported to `.glb` via `GLTFExporter`. The
  procedural build IS the master model; the GLB is a deployment artifact derived from it.
- Structured logging via a small `src/core/logger.ts`; browser logs are mirrored to `logs/` through a dev
  endpoint. `logs/` is git-ignored by the parent repo; that is intended.

## 3. Coordinate frame (decided — surfaced tradeoff)

`product.md` §4 uses X=forward, Y=starboard, Z=up. Three.js is Y-up. Resolution:

- All aircraft geometry lives under a group named `AIRCRAFT-001` and is authored in spec axes
  (X forward, Y starboard, Z up). Dimension and symmetry tests run in this frame.
- A single parent group `AIRCRAFT_ROOT` applies one fixed rotation (−90° about X) to place the aircraft in
  Three.js Y-up world space. Nothing else ever rotates the root.
- Origin: on the fuselage centerline at the nose tip. Because +X is forward, the nose sits at X = 0 and the
  tail cone ends at X = −39.5. Z = 0 is the fuselage centerline, not the ground. Never move the origin.

## 4. Scene graph and metadata

Node names are stable selectors and must follow `product.md` §6 and §30 exactly
(`FUSELAGE`, `WING_L`, `WING_R`, `WINGLET_L`, `ENGINE_L`, `TAIL_VERTICAL`, `GEAR_NOSE`, `GEAR_MAIN_L`, ...).
Every selectable mesh carries `userData = { aircraft, component, system, ata, label, selectable }` (§39).
Left/right parts come from one source geometry mirrored in code; never hand-author both sides (§Rule 2).
Hinges, gear pivots and door pivots are real pivot groups at the physical hinge; never scale or rotate about
a geometric center (§17–19).

## 5. Build order and quality gates

Follow `product.md` §54 strictly. Phase A blockout (fuselage, nose, tail cone, stabilizers, wings, winglets,
nacelles, gear positions) must pass Gate 1 (silhouette) and Gate 2 (dimensions) in all ten canonical views
before any Phase B or C detail is added. Canonical view renders go to `logs/renders/<iso-date>/` and are
compared against the reference sheets after every major geometry change (§33).

Definition of Done is `product.md` §51. Do not mark a gate passed without a test or a rendered comparison.

## 6. Architecture

One module per responsibility, as `product.md` §48 lists: `AircraftLoader`, `AircraftScene`,
`AircraftMaterials`, `AircraftAnimations`, `AircraftSystems`, `AircraftSelection`, `AircraftCameras`,
`AircraftBlueprint`, `AircraftCutaway`, `AircraftExplodedView`, `AircraftLighting`, `AircraftUI`.
Explicit state object per §49. Blueprint, realistic, cutaway and exploded modes are rendering/visibility
layers over the same mesh hierarchy; never a second aircraft.

## 7. Project files and git

- `readme.md` — software documentation. `insights.md` — reviews and lessons. `worklog.md` — tasks and progress.
- Git root is the parent `ramco-aviation` repo (remote `origin` on GitHub). Commit and push after every
  meaningful change with a short imperative message.

---

# GENERAL AGENT RULES (global, apply to every project)

Never use Fable 5 as subagents

Never assume Explicitly surface confusion and tradeoffs

Deliver only high quality code with complete edge-case handlingTouch only what is required Clean up solely your own changes

Define explicit success criteria first Iterate until verified

Avoid mistakes Correct any immediately and transparently

write evals first, Test all code using appropriate strategies - unit integration edge cases

Prioritize quality over speed Optimize only after quality is locked in

Be strictly logical in every decision
Decompose tasks and delegate to subagents using a lower model than the parent Explicitly pin the model on every dispatch don't use haiku

Use git comprehensively on every project and push after every meaningful change

Maintain insights.md store your reviews, readme.md store software documentation, worklog.md for tasks and progress

Comment every code change in brief

Make structured logging a core part of the architecture Store all logs in a logs/ directory

No bruteforce methods unless necessary

## Plugin installs (marketplace-first)

This file is the global agent rules for RUSHYOP, stored in the marketplace repo
RUSHYOP/rushy-claude-plugins (local: /Users/admin/Codes-2/Agentic-setup)

Do not install plugins only into Claude/Grok/Cursor
Always add plugins via:
  ```bash
  cd /Users/admin/Codes-2/Agentic-setup
  ./scripts/add-plugin.sh <name> <owner/repo|url> [--path subdir] --sync --commit --push
  ```
Tools must reference only this marketplace (@rushy / RUSHYOP/rushy-claude-plugins)
See AGENTS.md in this repo for the full marketplace workflow
# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.
