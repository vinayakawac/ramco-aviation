# Airframe models — provenance and licence

## Where these came from

All three GLB files originate from **[Flightradar24/fr24-3d-models](https://github.com/Flightradar24/fr24-3d-models)**,
which in turn credits the **[FlightGear project](http://www.flightgear.org/)** and the
**[FGMEMBERS](https://github.com/FGMEMBERS)** repository as the source of the models.

| File | Upstream | Original aircraft model |
|---|---|---|
| `a320.glb` | `models/a320.glb` | [FGMEMBERS/A320-family](https://github.com/FGMEMBERS/A320-family) |
| `b738.glb` | `models/b738.glb` | [FGMEMBERS/737-800](https://github.com/FGMEMBERS/737-800) |
| `b739.glb` | `models/b739.glb` | [FGMEMBERS/737NG](https://github.com/FGMEMBERS/737NG) |

## Licence — read before shipping this publicly

The upstream repository is **GPLv2**. That is copyleft, not attribution-only.

Serving a `.glb` to a browser distributes it, so publishing this page distributes these
models. Practically that means the model files stay under GPLv2 downstream, the credits
above travel with them, and the source form has to remain available — which is why
`raw/` is kept in the tree rather than deleted after conversion.

Whether the surrounding scene code counts as a derived work or as mere aggregation is a
genuine judgement call and is **not settled here**. If this page goes out under a client's
name, get that cleared first. If the answer is no, the loader is model-agnostic — see
`AIRFRAMES` in `src/scene/airframeModel.js` — so a differently-licensed airframe can be
dropped in without touching the rig.

## Directory layout

```
raw/      untouched downloads, glTF 1.0 — the source form, keep them
gltf2/    upgraded to glTF 2.0, uncompressed — what tools/measure-airframe.mjs reads
*.glb     glTF 2.0 + Draco — what the page actually ships
```

`raw/` and `gltf2/` are build inputs and are never fetched by the page.

## Rebuilding

The downloads are glTF **1.0**. three's `GLTFLoader` rejects that version outright
("Legacy glTF detected"), so every file has to be upgraded before it will load at all.

```bash
npm run models:build
```

That produces both derived directories. To re-derive the axis conventions in `AIRFRAMES`
after adding a model:

```bash
npm run models:measure
```

## Why a320 is the default

| | a320 | b738 | b739 |
|---|---|---|---|
| Raw download | 1172 kB | 2944 kB | 881 kB |
| Shipped (Draco) | **431 kB** | 672 kB | 635 kB |
| Nodes | 31 | 134 | 1 |
| Length | 38.3 m | 39.4 m | 40.6 m |

`b739` is the smallest download but the largest shipped file: it is a single merged mesh
with 94 materials and no part names, so it compresses badly and cannot be animated at all.
`a320` is the smallest shipped file, is within centimetres of the procedural airframe's
38 m, and keeps its engines as separate nodes.

`b738` has by far the richest hierarchy — named flaps, ailerons, elevators, doors, gear and
reversers — and is the one to switch to if the station animations ever need to drive
control surfaces on the real geometry rather than the procedural stand-ins.

## Known gaps

None of these models include landing gear. The procedural gear from `aircraft.js` carries
the aircraft, which is why `airframeModel.js` aligns the loaded model by its fuselage
centreline rather than sitting its bounding box on the ground.
