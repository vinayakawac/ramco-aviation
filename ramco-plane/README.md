# Ramco Aviation — three-chapter product page

A second treatment of the same source data, styled after the scroll-scrubbed product
pages Lusion builds (oryzo.ai): a warm near-black void, heavy cream display caps, one
amber accent, dotted hairlines, mono micro-labels pinned into the corners, and a single
3D subject that turns through a full revolution as you scroll.

Three chapters, as asked:

| Chapter  | Beats | Carries |
|----------|-------|---------|
| Intro    | 2     | Hero headline, lede, the four stats, the trust strip, the problem standfirst |
| Platform | 7     | All seven `ZONES` — one beat each, with its pain line, items and source link |
| Results  | 1     | The five `METERS`, the `$6M` stat, the three G2 reviews, customers, CTA |

## Running it

```bash
npm run dev
```

Then http://localhost:5179/

## How it is put together

- `src/data/ramco.js` — the content, lifted verbatim from `ramco-aviation_1.html`.
  Shared with the `ramco-3d` build; neither page invents a claim.
- `src/ui/chapters.js` — beats. Each owns a slice of scroll, a block of DOM and a pose.
- `src/scene/stage.js` — the studio: one aircraft, a warm key, a cool fill, a hard rim,
  and Three's built-in `RoomEnvironment` prefiltered for reflections. No external assets.
- `src/scene/aircraft.js` / `materials.js` — the airframe from the walkthrough build,
  retinted to a single warm neutral so it reads as one object under studio light.
- `src/main.js` — scroll → pose blending, nav state, telemetry, meter animation.

The subject rotates rather than the camera, which keeps the rim light consistent through
the whole revolution.

## Degradation

- **No WebGL** — the canvas is dropped, the beats unpin, and the page reads as a plain
  document. Every string is still present.
- **Reduced motion** — pose blending is disabled, so scrolling cuts between beats instead
  of easing, and counters resolve instantly.
- **Narrow viewports** — the subject stands off further and sinks, so copy always wins.

## Not included

No CC0 GLTF models are fetched here either; the airframe is code-generated. The `ANNOT`
strings in `chapters.js` (`LLP → build value` and so on) restate claims already on the
source page — none introduces a new one.
