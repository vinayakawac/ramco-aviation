# Third-party assets

## `models/a320.glb`, `models/b738.glb`, `models/b739.glb`

All three come from the same upstream and carry the same licence. `plane.html` lets the
viewer switch between them; `a320.glb` is the only one the scroll page itself loads.

| File | Original model | Shipped size | Length |
|---|---|---|---|
| `a320.glb` | [FGMEMBERS/A320-family](https://github.com/FGMEMBERS/A320-family) | 431 kB | 38.3 m |
| `b738.glb` | [FGMEMBERS/737-800](https://github.com/FGMEMBERS/737-800) | 672 kB | 39.4 m |
| `b739.glb` | [FGMEMBERS/737NG](https://github.com/FGMEMBERS/737NG) | 635 kB | 40.6 m |

| | |
|---|---|
| Source | [Flightradar24/fr24-3d-models](https://github.com/Flightradar24/fr24-3d-models) |
| Upstream project | [FlightGear](http://www.flightgear.org/) / [FGMEMBERS](https://github.com/FGMEMBERS) |
| Licence | **GPLv2** |

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
