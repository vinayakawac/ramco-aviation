/**
 * airframeModel.js — optional GLB airframe, swapped in over the procedural one.
 *
 * The scene boots with `createAircraft()`'s hand-built shell so there is never a frame
 * without an aeroplane in it. This module loads a real airframe in the background and,
 * if it arrives, replaces *only* the `airframe` sub-group. The procedural gear, LRU
 * markers and cockpit stay exactly where they were, so every station animation that
 * reaches into `userData` keeps working.
 *
 * Source: github.com/Flightradar24/fr24-3d-models (GPLv2, models from FlightGear /
 * FGMEMBERS). The repo ships glTF *1.0*, which three's GLTFLoader rejects outright, so
 * the files in assets/models were upgraded to 2.0 and Draco-compressed offline — see
 * `npm run models:build`. assets/models/raw holds the untouched downloads.
 *
 * Fit note: a320.glb measures 38.27 m along +Z, Y-up — within a few centimetres of the
 * procedural LEN of 38, and the same axis convention. It is scaled to LEN anyway so a
 * different airframe can be dropped in without touching the rig.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { PALETTE } from './materials.js';

import A320_URL from '../../assets/models/a320.glb?url';
import B738_URL from '../../assets/models/b738.glb?url';
import B739_URL from '../../assets/models/b739.glb?url';

/**
 * The three downloaded airframes.
 *
 * `up` and `nose` describe each file's own axis convention *before* normalisation. Both
 * were measured rather than assumed — the models come from different FlightGear authors
 * and do not agree with each other. The measurement (see tools/measure-airframe.mjs) finds
 * the long axis by bounding box, then locates the vertical fin as the highest point on the
 * airframe; the fin end is the tail. On all three the fin sits on the *positive* end, so
 * every one of them needs turning around.
 *
 * `parts` is the node count, and it is the reason a320 is the default. b739 is the
 * smallest raw download but the *largest* after Draco (635 kB against a320's 431 kB),
 * because it is a single merged mesh with 94 materials and no part names — it compresses
 * badly and cannot be animated at all. a320 is the smallest shipped file and still has its
 * engines as separate nodes.
 */
export const AIRFRAMES = {
  a320: { url: A320_URL, up: [0, 1, 0], nose: [0, 0, -1], parts: 31, len: 38.3 },
  b738: { url: B738_URL, up: [0, 0, 1], nose: [-1, 0, 0], parts: 134, len: 39.4 },
  b739: { url: B739_URL, up: [0, 1, 0], nose: [0, 0, -1], parts: 1, len: 40.6 },
};

/** Which one the scene actually flies. */
export const DEFAULT_AIRFRAME = 'a320';

let loader = null;

function getLoader() {
  if (loader) return loader;
  const draco = new DRACOLoader();
  // Decoder lives in public/draco — copied from three's own build so the page never
  // reaches for a CDN. BASE_URL keeps it correct under vite's relative `base`.
  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
  draco.setDecoderConfig({ type: 'wasm' });
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

/**
 * Rotate the loaded scene into the scene's convention: Y up, nose along +Z — what the
 * procedural airframe uses, and therefore what the rig's heading assumes.
 *
 * Built as a basis change rather than a table of Euler angles, because the up-axis and
 * heading corrections interact: rotating a Z-up model about its own Y is not a heading
 * change, and getting the two into the right order by hand is easy to get subtly wrong.
 *
 * We want a rotation R with R·nose = +Z and R·up = +Y. With an orthonormal set
 * (side, up, nose), the matrix whose *rows* are those vectors does exactly that, so we
 * build it as columns via makeBasis and transpose.
 *
 * @param {THREE.Object3D} root object to rotate
 * @param {number[]} up the model's up axis, in its own frame
 * @param {number[]} nose the model's nose direction, in its own frame
 */
function orient(root, up, nose) {
  const n = new THREE.Vector3(...nose).normalize();
  const u = new THREE.Vector3(...up).normalize();
  // Re-orthogonalise: measured axes are axis-aligned here, but this keeps the basis valid
  // if a future model needs a nose vector that is not exactly square to its up vector.
  const side = new THREE.Vector3().crossVectors(u, n).normalize();
  u.crossVectors(n, side).normalize();

  const m = new THREE.Matrix4().makeBasis(side, u, n).transpose();
  root.quaternion.setFromRotationMatrix(m);
}

/**
 * Height of the fuselage centreline, in world units, for an already-oriented model.
 *
 * Needed because none of these airframes model their landing gear — on a320 the lowest
 * geometry is the engine nacelles. Sitting the bounding box on the ground therefore parks
 * the engines on the tarmac with the belly just above it. The procedural gear is what
 * holds the aircraft up, and it is built around a fuselage centreline at local y = 0, so
 * that is what the loaded model has to be aligned to.
 *
 * Measured from vertices near the centreline plane and away from both ends: that excludes
 * the wings and engines (well off-axis), the fin (on-axis but aft) and the nose taper.
 * What is left is barrel fuselage, whose vertical midpoint is the centreline.
 *
 * @param {THREE.Object3D} root oriented, scaled model
 * @returns {number|null} centreline height, or null if too little geometry qualified
 */
function fuselageCentre(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  const nearAxis = size.x * 0.12;
  const zLo = box.min.z + size.z * 0.3;
  const zHi = box.min.z + size.z * 0.7;

  const v = new THREE.Vector3();
  let lo = Infinity;
  let hi = -Infinity;
  let hits = 0;

  root.traverse((o) => {
    const pos = o.isMesh && o.geometry?.attributes?.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.z < zLo || v.z > zHi || Math.abs(v.x) > nearAxis) continue;
      if (v.y < lo) lo = v.y;
      if (v.y > hi) hi = v.y;
      hits++;
    }
  });

  // A merged-mesh model with an odd layout could leave us with nothing usable.
  return hits > 50 ? (lo + hi) / 2 : null;
}

/**
 * Scale to `length` metres nose-to-tail and seat the model the way the procedural
 * airframe sits: centred on the long axis, fuselage centreline on local y = 0. The
 * aircraft group's own +4.1 lift then puts the procedural wheels on the ground.
 *
 * @param {THREE.Object3D} root
 * @param {number} length target nose-to-tail length in metres
 */
function normalise(root, length) {
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (!(size.z > 0)) return; // degenerate model — leave it alone rather than divide by 0

  root.scale.setScalar(length / size.z);

  root.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(root);
  const centre = new THREE.Vector3();
  scaled.getCenter(centre);
  root.position.x -= centre.x;
  root.position.z -= centre.z;

  // Fall back to the bounding-box centre if the fuselage could not be isolated. That is
  // wrong by a little rather than by the whole gear height, which is how the bottom-of-box
  // alignment failed.
  const belly = fuselageCentre(root);
  root.position.y -= belly ?? centre.y;
}

/**
 * Pull the FlightGear materials back towards the page's palette.
 *
 * The source models carry airline liveries and flat FlightGear shading that fight the
 * line-art look. Rather than strip the textures — they carry the panel lines the
 * procedural shell fakes — desaturate towards the skin tone and give everything sane
 * PBR response.
 * @param {THREE.Object3D} root
 */
function restyle(root) {
  const skin = new THREE.Color(PALETTE.skin);

  root.traverse((o) => {
    if (!o.isMesh) return;

    o.castShadow = true;
    o.receiveShadow = true;

    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m) continue;
      m.roughness = m.roughness ?? 0.45;
      m.metalness = 0.05;
      m.side = THREE.FrontSide;
      // Untextured surfaces go to the painted skin colour outright; textured ones keep
      // their map but get the tint pulled most of the way to it.
      if (!m.map) m.color.copy(skin);
      else m.color.lerp(skin, 0.55);

      // Let setAirframeLit() drive these the way it drives the procedural mat.skin().
      m.userData.airframeSkin = true;
      m.userData.baseColor = m.color.clone();
    }
  });
}

/**
 * Load one of the airframes in AIRFRAMES, normalised and restyled.
 *
 * @param {string} [key] key into AIRFRAMES
 * @param {number} [length] target nose-to-tail length in metres
 * @returns {Promise<THREE.Group>} group named 'airframe', wheels on y = 0, nose on +Z
 */
export async function loadAirframe(key = DEFAULT_AIRFRAME, length = 38) {
  const spec = AIRFRAMES[key];
  if (!spec) throw new Error(`unknown airframe "${key}"`);

  const gltf = await getLoader().loadAsync(spec.url);

  // The orientation goes on the loaded scene; the wrapper is what normalise() then scales
  // and shifts, so the two never fight over the same transform.
  const inner = gltf.scene;
  orient(inner, spec.up, spec.nose);

  const shell = new THREE.Group();
  shell.name = 'airframe';
  shell.add(inner);

  normalise(shell, length);
  restyle(shell);

  return shell;
}
