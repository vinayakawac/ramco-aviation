/**
 * airframeModel.js — the real airframe, swapped in over the procedural one.
 *
 * Ported from the walkthrough build (`ramco-3d/src/scene/airframeModel.js`), trimmed to
 * the single aircraft this page ships and retuned for a studio product shot rather than
 * a hangar walkthrough.
 *
 * The stage boots with `createAircraft()`'s hand-built shell so there is never a frame
 * without an aeroplane in it. This loads the real airframe in the background and, if it
 * arrives, replaces only the `airframe` sub-group.
 *
 * Source: github.com/Flightradar24/fr24-3d-models — models from FlightGear / FGMEMBERS,
 * **GPLv2**. That is copyleft, not attribution-only, and serving a .glb distributes it.
 * See assets/CREDITS.md before this page goes anywhere public.
 *
 * The upstream files are glTF 1.0, which three's GLTFLoader rejects outright; the .glb
 * here was upgraded to 2.0 and Draco-compressed by `ramco-3d`'s `npm run models:build`,
 * which also keeps the untouched downloads as the GPL source form.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { PALETTE } from './materials.js';

import A320_URL from '../../assets/models/a320.glb?url';
import B738_URL from '../../assets/models/b738.glb?url';
import B739_URL from '../../assets/models/b739.glb?url';

/**
 * All three airframes, so plane.html can switch between them for inspection. The main
 * scroll page still boots the A320 only — the other two are fetched on demand, when the
 * inspector asks for them, so the landing path stays a single 431 kB model.
 *
 * `up` and `nose` are the file's own axis convention *before* normalisation — measured,
 * not assumed, because the three come from different FlightGear authors and do not agree.
 * All three carry their fin on the positive end, so every one of them needs turning around.
 *
 * `label` is what the inspector's switcher shows.
 */
export const AIRFRAMES = {
  a320: { url: A320_URL, up: [0, 1, 0], nose: [0, 0, -1], len: 38.3, label: 'A320' },
  b738: { url: B738_URL, up: [0, 0, 1], nose: [-1, 0, 0], len: 39.4, label: '737-800' },
  b739: { url: B739_URL, up: [0, 1, 0], nose: [0, 0, -1], len: 40.6, label: '737NG' },
};

export const DEFAULT_AIRFRAME = 'a320';

let loader = null;

function getLoader() {
  if (loader) return loader;
  const draco = new DRACOLoader();
  // Decoder lives in public/draco, copied from three's own build, so the page never
  // reaches for a CDN. BASE_URL keeps it correct under vite's relative `base`.
  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
  draco.setDecoderConfig({ type: 'wasm' });
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

/**
 * Rotate the loaded scene into this scene's convention: Y up, nose along +Z.
 *
 * Built as a basis change rather than a table of Euler angles, because the up-axis and
 * heading corrections interact — rotating a Z-up model about its own Y is not a heading
 * change. We want R with R·nose = +Z and R·up = +Y; the matrix whose *rows* are the
 * orthonormal set (side, up, nose) does exactly that, so build it as columns and
 * transpose.
 */
function orient(root, up, nose) {
  const n = new THREE.Vector3(...nose).normalize();
  const u = new THREE.Vector3(...up).normalize();
  const side = new THREE.Vector3().crossVectors(u, n).normalize();
  u.crossVectors(n, side).normalize();

  const m = new THREE.Matrix4().makeBasis(side, u, n).transpose();
  root.quaternion.setFromRotationMatrix(m);
}

/**
 * Height of the fuselage centreline for an already-oriented model.
 *
 * The model has no landing gear — its lowest geometry is the engine nacelles — so
 * sitting the bounding box on y = 0 would hang the aircraft wrong. This page floats the
 * aircraft anyway, and it rotates about its own centre, so the centreline is what has to
 * land on the origin or the whole thing wobbles as it turns.
 *
 * Sampled near the centreline plane and away from both ends: that excludes the wings and
 * engines (well off-axis), the fin (on-axis but aft) and the nose taper. What is left is
 * barrel fuselage, whose vertical midpoint is the centreline.
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

  return hits > 50 ? (lo + hi) / 2 : null;
}

/** Scale to `length` metres nose-to-tail and centre it on its own fuselage centreline. */
function normalise(root, length) {
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (!(size.z > 0)) return; // degenerate model — leave it rather than divide by zero

  root.scale.setScalar(length / size.z);

  root.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(root);
  const centre = new THREE.Vector3();
  scaled.getCenter(centre);
  root.position.x -= centre.x;
  root.position.z -= centre.z;

  const belly = fuselageCentre(root);
  root.position.y -= belly ?? centre.y;
}

/**
 * Pull the FlightGear materials into the page's studio palette.
 *
 * The source model carries an airline livery and flat FlightGear shading. The walkthrough
 * build keeps more of it, because a hangar wants a real-looking aeroplane. Here the whole
 * design is one object under one warm key against a void, so the livery is pushed almost
 * all the way out and the surface is given enough metalness to pick up the environment
 * map — that reflection is what stops it reading as a flat cut-out.
 */
function restyle(root) {
  const skin = new THREE.Color(PALETTE.skin);

  root.traverse((o) => {
    if (!o.isMesh) return;

    o.castShadow = true;
    o.receiveShadow = true;

    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m) continue;
      m.roughness = 0.38;
      m.metalness = 0.16;
      m.side = THREE.FrontSide;
      m.envMapIntensity = 1;
      // Untextured surfaces go to the painted skin outright; textured ones keep their
      // map for the panel lines but lose almost all of the livery colour.
      if (!m.map) m.color.copy(skin);
      else m.color.lerp(skin, 0.85);
    }
  });
}


/**
 * Measure the landmarks the callouts point at, instead of hand-guessing coordinates.
 *
 * A reference-frame contract beats offset roulette: the model is already normalised to
 * 38 m nose-on-+Z with the fuselage centreline on y = 0, so every annotated feature can
 * be read straight off the geometry. Swap the airframe and the dots follow it, rather
 * than drifting off into empty space the way literal numbers do.
 *
 * Each landmark is one pass over the vertices, filtered to the region that can only
 * contain the feature: the fin is the highest point aft, the nacelle the lowest point
 * off-axis and forward of the wing root, the sharklet the outermost point in x.
 */
export function measureLandmarks(shell) {
  shell.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(shell);
  const size = box.getSize(new THREE.Vector3());
  const halfSpan = size.x / 2;

  const v = new THREE.Vector3();
  const best = {
    fin: { y: -Infinity, p: null },
    tip: { x: -Infinity, p: null },
    nacelle: { y: Infinity, p: null },
    belly: { y: Infinity, p: null },
  };

  shell.traverse((o) => {
    const pos = o.isMesh && o.geometry?.attributes?.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);

      // Fin: tallest thing in the aft quarter, on or near the centreline.
      if (v.z < box.min.z + size.z * 0.28 && Math.abs(v.x) < halfSpan * 0.1 && v.y > best.fin.y) {
        best.fin = { y: v.y, p: v.clone() };
      }
      // Sharklet: outermost point in x, on the starboard side.
      if (v.x > best.tip.x) best.tip = { x: v.x, p: v.clone() };
      // Nacelle: the model has no gear, so the lowest off-axis geometry is an engine.
      // Restricted to starboard, because that is the side the engine shot flies past.
      if (v.x > halfSpan * 0.15 && v.x < halfSpan * 0.55 && v.y < best.nacelle.y) {
        best.nacelle = { y: v.y, p: v.clone() };
      }
      // Belly: lowest point on the centreline, around the wing box.
      if (Math.abs(v.x) < halfSpan * 0.08 && Math.abs(v.z) < size.z * 0.2 && v.y < best.belly.y) {
        best.belly = { y: v.y, p: v.clone() };
      }
    }
  });

  const nacelle = best.nacelle.p;
  const tip = best.tip.p;
  const fin = best.fin.p;
  const belly = best.belly.p;

  return {
    // Just aft of the nose cap, at window height: the flight deck.
    deck: [0, size.y * 0.1, box.max.z * 0.82],
    // Forward of the wing on the centreline, where a stand's steps would meet the door.
    stand: [0, -size.y * 0.12, box.max.z * 0.34],
    // Outboard wing, pulled a touch inboard of the very tip so the dot sits on structure.
    sharklet: tip ? [tip.x * 0.94, tip.y, tip.z] : [halfSpan * 0.9, 0, -1.5],
    // Fan face: the intake lip is forward of the nacelle's lowest point.
    nacelle: nacelle ? [nacelle.x, nacelle.y * 0.86, nacelle.z + size.z * 0.02] : [7, -2.4, 4.8],
    // Planform shots look straight down the centreline, so the mark goes on the wing box.
    centre: [0, 0, -size.z * 0.05],
    // Fin, marked below the tip so the label never has to reach off the top of the frame.
    fin: fin ? [0, fin.y * 0.82, fin.z + size.z * 0.04] : [0, 6.4, -15.2],
    // Belly holds, between the wing root and the keel.
    hold: belly ? [halfSpan * 0.12, belly.y, belly.z + size.z * 0.08] : [2.4, -2.6, 3.2],
  };
}

/**
 * Load the airframe, normalised and restyled.
 *
 * @param {string} [key] key into AIRFRAMES
 * @param {number} [length] target nose-to-tail length in metres
 * @returns {Promise<THREE.Group>} group named 'airframe', centreline on y = 0, nose +Z
 */
export async function loadAirframe(key = DEFAULT_AIRFRAME, length = 38) {
  const spec = AIRFRAMES[key];
  if (!spec) throw new Error(`unknown airframe "${key}"`);

  const gltf = await getLoader().loadAsync(spec.url);

  // Orientation goes on the loaded scene; the wrapper is what normalise() scales and
  // shifts, so the two never fight over the same transform.
  const inner = gltf.scene;
  orient(inner, spec.up, spec.nose);

  const shell = new THREE.Group();
  shell.name = 'airframe';
  shell.add(inner);

  normalise(shell, length);
  restyle(shell);
  shell.userData.landmarks = measureLandmarks(shell);

  return shell;
}
