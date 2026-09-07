# Insights — AIRCRAFT-001

## 2026-09-07 — Spec and reference review

- The reference sheets are AI-generated composites. Their printed numbers are not reliable: seating
  (158 vs spec ~180) and wheelbase (13.6 vs spec 13.0) already disagree with `product.md`. Spec wins
  every time (§45). Use the sheets for silhouette and proportion only.
- The spec's Z-up frame vs Three.js Y-up is the one structural decision that would be painful to
  reverse later. Decided: author in spec axes under `AIRCRAFT-001`, rotate once at `AIRCRAFT_ROOT`.
  Tests run in the spec frame so the numbers in `product.md` §5 apply verbatim.
- No Blender in the loop. Procedural Three.js geometry is the master; GLB is an export. This keeps
  the "one geometry source of truth" rule (§Rule 1) trivially true and makes symmetry a code
  guarantee (mirror by scale −1 on Y with corrected winding) rather than a modeling discipline.
- Sibling projects `../ramco-3d` and `../ramco-plane` already use Vite 7 + three 0.180. Matching
  them avoids a second toolchain in the same repo.
- Parent `.gitignore` excludes `logs/`. Runtime logs and rendered comparison frames stay local;
  gate results are recorded in `worklog.md` so the history is still in git.

## 2026-09-07 — Build day 1 (Phase A + B + interior + modes)

- **The spec's coordinate frame is left-handed.** X forward, Y starboard, Z up cannot be rotated into
  Three.js. First renders showed the "LEFT" camera looking at the starboard side, and the cargo doors
  on the port side. Fixed by declaring +Y = port and relabelling; recorded in CLAUDE.md §3. Lesson: check
  the handedness of any frame given as three named axes before writing geometry.
- **Closures don't survive mirroring or export.** Animation hooks were first written as `set(fraction)`
  closures on userData. Mirrored right-hand copies lost them (JSON clone) and a GLB would have too.
  Replaced with declarative hinge/spin metadata (`axis`, `deg`, `channel`, `from/to`, `translate`) that
  `mirrorObjectY` can reflect analytically: reflected rotation = (axis with −y, −angle).
- **White-on-white is invisible.** The default studio background was near the paint colour, so the wing
  upper surfaces vanished in top views and looked like sticks. Darker neutral backgrounds fixed it; the
  geometry was right all along. Always judge silhouettes on a contrasting background.
- **Edge overlays need `matrixWorldAutoUpdate = false`.** Copying `matrixWorld` each frame is undone by
  the scene's own update pass unless auto-update is off; blueprint edges rendered in the unrotated spec
  frame until this was set.
- **Hidden browser panes freeze requestAnimationFrame and shrink the canvas to 0×0.** Canonical renders
  now go through a fixed 1600×900 offscreen target with an OutputPass, which is also the right design
  for deterministic view comparisons. A stale-frame timer keeps state advancing in hidden panes.
- Subagents (Sonnet) built engine, landing gear and interior modules against a written contract; the
  contract changed mid-flight and they adapted. Two of three caught a geometry bug themselves by testing.
- Triangle count at the 1440p tier: ~23 k for the whole aircraft including a 180-seat instanced cabin.
  Budget headroom is large; detail can be added where the reference sheets justify it.
