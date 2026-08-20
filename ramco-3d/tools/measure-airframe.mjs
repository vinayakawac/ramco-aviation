/**
 * measure-airframe.mjs — work out a GLB's axis convention so airframeModel.js can fix it.
 *
 * The FlightGear-derived models come from different authors and disagree about which way
 * is up and which way the nose points. Rather than eyeball each one, measure:
 *
 *   long axis  = the longest bounding-box dimension (the fuselage)
 *   wide axis  = the longer of the two remaining (the wingspan)
 *   up axis    = whatever is left
 *   tail       = the end of the long axis where the vertical fin is, the fin being the
 *                furthest point along the up axis
 *
 * The fin test needs the *signed* extreme, not distance from the centre — on a model whose
 * origin sits mid-fuselage the landing gear hangs as far below as the fin rises above.
 *
 * Usage: node tools/measure-airframe.mjs assets/models/raw/*.glb
 * Note the *raw* files: this reads accessors directly and does not decode Draco.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const COMPONENT = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};

const AXIS = 'XYZ';

/** @returns {{json: object, bin: Buffer}} the two chunks of a GLB. */
function readGlb(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLength = buf.readUInt32LE(12);
  return {
    json: JSON.parse(buf.slice(20, 20 + jsonLength).toString('utf8')),
    bin: buf.slice(20 + jsonLength + 8),
  };
}

/** Every POSITION vertex in the file, untransformed. */
function positions({ json, bin }) {
  const out = [];
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives) {
      const index = prim.attributes.POSITION;
      if (index == null) continue;
      const acc = json.accessors[index];
      const view = json.bufferViews[acc.bufferView];
      const Type = COMPONENT[acc.componentType];
      const offset = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
      const data = new Type(bin.buffer, bin.byteOffset + offset, acc.count * 3);
      for (let i = 0; i < data.length; i += 3) out.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return out;
}

for (const file of process.argv.slice(2)) {
  const pts = positions(readGlb(file));
  if (!pts.length) {
    console.log(`${basename(file)}: no readable POSITION data (Draco-compressed?)`);
    continue;
  }

  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < lo[i]) lo[i] = p[i];
      if (p[i] > hi[i]) hi[i] = p[i];
    }
  }
  const size = hi.map((v, i) => v - lo[i]);

  const long = size.indexOf(Math.max(...size));
  const rest = [0, 1, 2].filter((i) => i !== long);
  const wide = size[rest[0]] > size[rest[1]] ? rest[0] : rest[1];
  const up = rest.find((i) => i !== wide);

  let finUp = -Infinity;
  let finLong = 0;
  for (const p of pts) {
    if (p[up] > finUp) {
      finUp = p[up];
      finLong = p[long];
    }
  }

  const mid = (lo[long] + hi[long]) / 2;
  const noseSign = finLong > mid ? -1 : 1;

  const vec = (axis, sign) => [0, 0, 0].map((_, i) => (i === axis ? sign : 0));

  console.log(
    `${basename(file).padEnd(10)} ` +
      `len=${size[long].toFixed(1)}m span=${size[wide].toFixed(1)}m ht=${size[up].toFixed(1)}m  ` +
      `long=${AXIS[long]} up=${AXIS[up]}  fin at ${finLong > mid ? '+' : '-'}${AXIS[long]}\n` +
      `           up: [${vec(up, 1)}], nose: [${vec(long, noseSign)}]`
  );
}
