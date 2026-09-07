# Worklog — AIRCRAFT-001

## 2026-09-07

- [x] Reviewed `product.md` (55 sections) and all 14 reference sheets.
- [x] Restructured `CLAUDE.md`: project rules first, spec authority, locked dimensions, adjudicated
      reference conflicts, stack, coordinate-frame decision, build order, architecture.
- [x] Created `worklog.md`, `insights.md`, `readme.md`.
- [x] STEP 01 — Scaffold Vite + TS + three + Vitest; dimension/symmetry/naming/articulation tests (27 passing).
- [x] STEP 02–05 — Phase A: fuselage (4 lathes, one profile), wings with kink/dihedral/twist, tail, engines, gear.
- [x] STEP 06 — 14 canonical views ×2 modes rendered to `logs/renders/2026-09-07/`; Gate 2 (dimensions) passes in tests; Gate 1 silhouette reviewed (see insights).
- [x] STEP 07–11 — Phase B: 90 cabin windows, 8 passenger/exit doors + 2 cargo doors on hinges, slats/flaps/spoilers/ailerons/elevators/rudder on hinges, engine fan/spinner/reverser/core, articulated gear with bay doors, white/navy livery.
- [x] STEP 12–14 — Interior: flight deck (5 displays, pedestal, seats, side sticks), 180 instanced seats, bins, galleys, 3 lavatories, cargo hold with ULDs.
- [x] STEP 15–20 — 14 selectable systems, channel animations, canonical cameras, blueprint (edges + dimension guides), cutaway (clipping plane), exploded view, 5 lighting presets, 3 quality tiers.
- [x] STEP 22–23 — GLB export via GLTFExporter (UI button) and GLTFLoader import path.
- [ ] STEP 21/24/25 — Phase C detail pass against reference sheets (panel lines, nacelle detail, cockpit detail), tier profiling on real 4K hardware, freeze master.
- [ ] Known gaps: cheatline is a surface band (no painted texture); cabin has no PSU strip; nav-light colours not yet side-specific.

### Verification log (2026-09-07, end of day)

- `npm test`: 28/28 passing (dimensions, symmetry, metadata, articulation of gear/flaps/slats/spoilers/doors/cargo/rudder, budgets, branding).
- Canonical renders: 14 views × realistic + blueprint in `logs/renders/2026-09-07/`; LEFT/RIGHT/TOP/BOTTOM
  orientation matches the reference sheets after the frame adjudication (CLAUDE.md §3).
- Mode captures reviewed: interior ghost, cutaway (skin-only clip), exploded, system highlight, blueprint, gear up,
  doors + cargo doors open, flaps/slats/spoilers extended.
- Gate 1 (silhouette) reviewed by eye against `aircraft.png` / `exterior-3_4-view.png`: fuselage, fin, wing planform,
  engine placement and gear read correctly. Phase C candidates: nacelle inlet lip shape, wing-root fairing blend,
  finer cockpit glazing frames, painted cheatline texture.
