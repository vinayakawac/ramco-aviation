# ramco-x

Static marketing page for Ramco Aviation - dark theme, x.ai-inflected editorial layout.
Three sections: hero, platform module explorer, contact.

No build step. Open `index.html`, or serve the folder:

    python -m http.server 5187 --directory ramco-x

Registered in `.claude/launch.json` as the `ramco-x` preview config.

## Files
- `index.html` - markup, copy, and the `three` importmap
- `styles.css` - tokens (`:root`), layout, reveal transitions, explorer chrome
- `main.js` - sticky nav, scroll reveal, stat count-up, email validation
- `explorer.js` - the section 02 platform explorer (Three.js)
- `zones.js` - the seven zones: copy, camera framing, callout anchors

## Platform explorer

`zones.js` holds the seven zones and is the single source for the left rail, the
right readout, the camera framing and the callouts. Editing one entry moves all
four together.

Callout labels are zone titles, never aircraft part names. On the airframe all
seven markers are placed where that zone lives, so the aircraft reads as a map of
the platform; each marker is clickable and jumps to its zone. Only the active
zone names itself, because seven titles at once collide at most camera angles;
the rest name themselves on hover. On the engine and stores stages only the zone
that owns the subject is marked.

Zone copy is lifted from `ramco-3d/src/data/ramco.js`, which copies
`ramco-aviation_1.html` verbatim. Nothing in the readout is invented: the only
derived value is the capability count, which is `items.length`.

### One space

Everything stands on a single polished floor at true relative scale, all present
at once. Nothing is hidden between zones; the camera travels across the floor
from one subject to the next, so the other two stay visible in the background.
Working units are metres.

| Subject | Zones | Stands at | Source |
|---|---|---|---|
| `airframe` | 1, 2, 3, 5, 6 | origin | `b738.glb` |
| `engine` | 4 | (32, -7) | meshes lifted out of `b738.glb`, on a generated cradle |
| `stores` | 7 | (-32, 5) | generated racking, cartons and transit cases |

The floor is a `Reflector` with the reflection faded out radially, well before
its edges could enter frame. Bay markings — a scored grid, bay outlines, corner
ticks and centrelines — are painted into a canvas after placement, sized off each
subject's own footprint. They are not decoration: without a surface the eye can
find, a mirror reads as a hole and everything standing on it looks like it is
floating.

The engine is isolated by selecting meshes whose bounding-box centre falls in the
starboard powerplant region, then rejecting anything too wide or too long to be
nacelle. The swept panel above the nacelle is the pylon, which belongs to the
QEC unit and is kept deliberately.

Lighting is a three-point rig plus a studio environment generated as an equirect
canvas: dark cyclorama, a key softbox high and forward, a cooler fill behind, and
floor bounce. The softbox is the highlight that travels across the metal as the
subject turns.

Camera targets and callouts are expressed in **aircraft space** - `x` nose-ward,
`y` up, `z` starboard, each a fraction of the subject's half-extent. Every
subject reports its own axes, so the same numbers mean the same thing whichever
one is on stage. For the airframe the mapping is worked out at load time (glTF is
Y-up, the longer of X/Z is the fuselage, and the end carrying the fin is the
tail), so swapping in a different aircraft does not require re-deriving anything
by hand. The airframe callout positions were read off `b738.glb`'s own node
positions (`No2engfancase`, `cargodoorF`, `vstab`, `apuexht`, ...) rather than
guessed.

Surface detail - panel lines, rivet runs, roughness breakup - and the studio
environment are generated into canvases at runtime, because the model ships
with flat white materials and a single unusable texture.

The scene renders only while the viewport is on screen, and falls back to the
rail and readout alone if WebGL or the model is unavailable.

## Vendored

`vendor/` holds three.js, GLTFLoader, DRACOLoader and the Draco decoder, copied
from `ramco-plane/node_modules` so the folder stays dependency-free.
`assets/models/b738.glb` is copied from `ramco-3d/assets/models`.

## Known gaps
- The signup form is client-side only; no endpoint is wired.
- The hero stat figures are still placeholders. The explorer readout no longer
  contains any invented number.
