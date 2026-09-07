# AIRCRAFT-001

Interactive Three.js website presenting one canonical single-aisle twin-turbofan aircraft from every
angle: realistic and blueprint render modes, selectable systems, cutaway and exploded views, articulated
landing gear, doors and flight controls, and a modeled cockpit, cabin and cargo hold. The aircraft is
built procedurally in code from the specification in `product.md`; there is no external model file.

## Run

```bash
npm install
npm run dev        # Vite dev server (logs mirrored to logs/)
npm test           # Vitest: dimensions, symmetry, metadata, articulation, budgets
npm run build      # type-check + production bundle in dist/
```

URL flags on the dev server:

| Flag | Effect |
| --- | --- |
| `?quality=T1080` / `T1440` / `T2160` | Force a quality tier (default: picked from physical pixel width) |
| `?renders=1` | Render all 14 canonical views to `logs/renders/<date>/` and continue |
| `?renders=1&blueprint=1` | Same, then repeat in blueprint mode |

## Documents

- `product.md` — production specification (source of truth).
- `CLAUDE.md` — project rules for agents: spec authority, adjudicated conflicts, coordinate frame, scale.
- `worklog.md` — task list and progress. `insights.md` — reviews and lessons.
- Fourteen reference PNG sheets in the project root (orthographic, 3/4, component, interior).

## Architecture (one module per responsibility, product.md §48)

```
src/
  core/        logger.ts (structured JSON logs → logs/), quality.ts (1080p/1440p/4K tiers), geometry.ts
  aircraft/    AircraftSpec.ts   canonical meters, stations, node names, systems, metadata
               AircraftMaterials.ts  shared physically based palette (white/navy livery)
               AircraftBuilder.ts    assembles parts, mirrors starboard → port, measures the model
               AircraftLoader.ts     GLB export (GLTFExporter) and import
               parts/   Fuselage, Wing, Tail, Engine, LandingGear, PartContext (builder contract + hinges)
               interior/ Interior (flight deck, 180 instanced seats, galleys, lavatories, cargo)
  modes/       AircraftScene, AircraftCameras, AircraftLighting, AircraftAnimations, AircraftSelection,
               AircraftSystems, AircraftBlueprint, AircraftCutaway, AircraftExplodedView,
               AircraftVisibility, AircraftState (explicit state store, product.md §49)
  ui/          AircraftUI (DOM control panel; talks only to the state store)
  main.ts      boot, state → module wiring, render loop, canonical render capture
tests/         aircraft.test.ts (Gate 2 dimensions, symmetry, articulation) + per-part smoke tests
```

### Coordinate frame and scale

Geometry is authored in the spec frame: +X forward, +Y port, +Z up, origin at the nose tip on the
fuselage centerline. One parent group rotates the whole aircraft into Three.js Y-up world space. Spec
meters are converted through `m()` with a unit scale of 0.25, so the aircraft is about 9.9 scene units
long while every proportion matches the specification exactly. See `CLAUDE.md` §3 for why +Y is port.

### Animation model

Hinges and spins are declarative metadata on pivot nodes (`userData.hinge`, `userData.spin`) rather
than closures, so they survive mirroring, cloning and GLB export. `applyChannel(root, channel, value)`
drives them; channels include `gear`, `flaps`, `slats`, `spoilers`, `aileron`, `elevator`, `rudder`,
`doors`, `cargoDoors`, `reverser`, `engine` (fan spin) and `wheelSpin`.

### Quality tiers

| Tier | Physical width | Pixel ratio cap | Segment scale | Shadow map | Triangle budget |
| --- | --- | --- | --- | --- | --- |
| T1080 | ≤ 1920 px | 1.0 | 0.6 | 1024 | 150 k |
| T1440 | ≤ 2560 px | 1.5 | 1.0 | 2048 | 300 k |
| T2160 | > 2560 px | 2.0 | 1.5 | 4096 | 600 k |

The whole aircraft including the cabin is ~23 k triangles at T1440.

## Validation

`npm test` enforces: overall length 39.5 m, wingspan 35.8 m, height 12.5 m, wheelbase 13.0 m and
fuselage diameter 3.95 m (all within 1–1.5 %); left/right bounding boxes mirror exactly; every mesh
carries `{aircraft, component, system, ata, label, selectable}`; gear retracts on its pivots and clears
the ground; flaps drop on both wings; the triangle budget holds; no file carries the retired branding.
Canonical view renders are written to `logs/renders/<date>/` for comparison against the reference sheets.
