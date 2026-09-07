# Insights — ASTRA Aircraft Atlas / AIRCRAFT-001

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
