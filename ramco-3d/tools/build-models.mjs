/**
 * build-models.mjs — turn the raw Flightradar24 downloads into files three can load.
 *
 * Two things are wrong with the downloads as shipped:
 *
 *   1. They are glTF *1.0*. The repo predates glTF 2.0 and three's GLTFLoader refuses
 *      1.0 outright ("Legacy glTF detected"), so every file has to be upgraded.
 *   2. They are uncompressed, and a scroll-driven page should not spend a megabyte per
 *      airframe when Draco gets it to a third of that.
 *
 * Pipeline, per model:
 *   assets/models/raw/x.glb   (untouched download, glTF 1.0)
 *     -> assets/models/gltf2/x.glb   (glTF 2.0, uncompressed — what measure-airframe reads,
 *                                     since that tool walks accessors and cannot decode Draco)
 *     -> assets/models/x.glb         (glTF 2.0 + Draco — what the page ships)
 *
 * Provenance: github.com/Flightradar24/fr24-3d-models, GPLv2, models originating from the
 * FlightGear project and FGMEMBERS. Keep raw/ in the tree so the upstream files stay
 * available alongside the derived ones, as GPLv2 expects.
 *
 * Usage: npm run models:build
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pkg from 'gltf-pipeline';

const { processGltf, glbToGltf, gltfToGlb } = pkg;

const MODELS = ['a320', 'b738', 'b739'];
const RAW = 'assets/models/raw';
const PLAIN = 'assets/models/gltf2';
const OUT = 'assets/models';

mkdirSync(PLAIN, { recursive: true });

for (const name of MODELS) {
  const src = join(RAW, `${name}.glb`);
  if (!existsSync(src)) {
    console.error(`missing ${src} — download it from the fr24-3d-models repo first`);
    process.exitCode = 1;
    continue;
  }

  const raw = readFileSync(src);

  // Each pass re-reads from the raw bytes. gltf-pipeline consumes the resources it
  // attaches during a read, so a parsed document cannot be fed through twice.
  const plain = await gltfToGlb((await glbToGltf(raw)).gltf);
  writeFileSync(join(PLAIN, `${name}.glb`), plain.glb);

  const { gltf } = await glbToGltf(raw);
  const draco = await processGltf(gltf, { dracoOptions: { compressionLevel: 7 } });
  const packed = await gltfToGlb(draco.gltf);
  writeFileSync(join(OUT, `${name}.glb`), packed.glb);

  const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
  console.log(
    `${name.padEnd(6)} raw ${kb(raw.length).padStart(8)} -> ` +
      `2.0 ${kb(plain.glb.length).padStart(8)} -> draco ${kb(packed.glb.length).padStart(8)}`
  );
}
