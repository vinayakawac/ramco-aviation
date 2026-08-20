# Third-party assets

## `models/a320.glb`

| | |
|---|---|
| Source | [Flightradar24/fr24-3d-models](https://github.com/Flightradar24/fr24-3d-models) |
| Original model | [FGMEMBERS/A320-family](https://github.com/FGMEMBERS/A320-family), via the [FlightGear](http://www.flightgear.org/) project |
| Licence | **GPLv2** |
| Shipped size | 431 kB (glTF 2.0 + Draco) |
| Length | 38.3 m nose-to-tail |

### Read this before publishing

The licence is **GPLv2 — copyleft, not attribution-only.** Serving this `.glb` to a
browser distributes it, so publishing this page distributes the model. In practice:

- the model stays under GPLv2 downstream
- the credits above have to travel with it
- the **source form** must remain available — the untouched glTF 1.0 downloads are kept
  at `../../ramco-3d/assets/models/raw/`, alongside the conversion script that produced
  this file (`ramco-3d/tools/build-models.mjs`, `npm run models:build`)

Whether the surrounding scene code counts as a derived work or as mere aggregation is a
genuine judgement call and is **not settled here.** If this page ships under a client's
name, get that cleared first.

If the answer is no, the loader is model-agnostic: replace the entry in `AIRFRAMES` in
`src/scene/airframeModel.js` with a differently-licensed airframe and nothing else needs
to change. The procedural airframe in `src/scene/aircraft.js` is written by us and is
already the fallback whenever the model fails to load.

## `public/draco/`

Draco decoder, copied from three.js's own distribution (Apache-2.0). Kept local so the
page never reaches for a CDN.
