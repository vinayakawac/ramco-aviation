/**
 * engine.js — the detached engine on its stand, plus the four nested configuration
 * levels the source page draws as `#lvl1`–`#lvl4` over its turbofan cross-section.
 *
 * Level 1  the whole engine — the unit that arrives and leaves
 * Level 2  modules — where the work is scoped
 * Level 3  sub-assemblies and components
 * Level 4  life-limited parts, drawn in flag orange because that is where the money sits
 *
 * The cross-section proportions come straight from the source SVG (L599–628): a 748-wide
 * envelope, fan at the left, core spool through the middle, exhaust cone at the right,
 * with the three LLP discs at x = 470 / 502 / 534.
 */

import * as THREE from 'three';
import { mat, PALETTE } from './materials.js';

/** Source SVG x-coordinates mapped into metres along the engine axis. */
const SVG_X0 = 96;
const SVG_X1 = 812;
const ENGINE_LEN = 6.2;
const toZ = (svgX) => ((svgX - SVG_X0) / (SVG_X1 - SVG_X0)) * ENGINE_LEN - ENGINE_LEN / 2;

/** Nacelle outer profile, [z, radius], derived from the source cross-section curve. */
const COWL = [
  [-0.02, 0.62],
  [0.28, 1.02],
  [1.1, 1.24],
  [3.4, 1.26],
  [4.8, 1.06],
  [5.6, 0.72],
  [6.2, 0.5],
];

function lathe(profile, material, segments = 30) {
  const pts = profile.map(([z, r]) => new THREE.Vector2(Math.max(r, 0.01), z));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, -ENGINE_LEN / 2);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** The fan face — bladed disc at the intake. */
function fanStage() {
  const g = new THREE.Group();
  g.name = 'fan';

  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat.metal());
  hub.position.z = toZ(132);
  g.add(hub);

  const bladeGeo = new THREE.BoxGeometry(0.055, 0.86, 0.2);
  const blades = new THREE.InstancedMesh(bladeGeo, mat.metal(), 22);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    pos.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, toZ(132));
    q.setFromEuler(new THREE.Euler(0, 0, a + 0.45));
    m.compose(pos, q, scl);
    blades.setMatrixAt(i, m);
  }
  blades.instanceMatrix.needsUpdate = true;
  blades.name = 'fan-blades';
  g.add(blades);

  return g;
}

/** Core spool: compressor drum tapering into the turbine section. */
function core() {
  const g = new THREE.Group();
  g.name = 'core';

  const drum = lathe(
    [
      [toZ(210) + ENGINE_LEN / 2, 0.34],
      [toZ(470) + ENGINE_LEN / 2, 0.5],
      [toZ(560) + ENGINE_LEN / 2, 0.44],
      [toZ(620) + ENGINE_LEN / 2, 0.3],
    ],
    mat.dark(),
    22
  );
  g.add(drum);

  // Compressor / turbine stages, echoing the source's stage tick marks.
  const stageZ = [250, 278, 306, 334, 470, 502, 534];
  const stageGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.05, 20);
  stageGeo.rotateX(Math.PI / 2);
  stageZ.forEach((x, i) => {
    const disc = new THREE.Mesh(stageGeo, mat.metal());
    disc.position.z = toZ(x);
    disc.name = `stage-${i}`;
    g.add(disc);
  });

  return g;
}

function exhaust() {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.9, 20), mat.dark());
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = toZ(700);
  cone.name = 'exhaust';
  return cone;
}

/**
 * The engine stand it sits on while it is in the shop.
 * Built in the engine's own frame: the engine axis is the origin, the shop floor is
 * FLOOR_Y below it, and the top rails stop just clear of the cowl.
 */
const FLOOR_Y = -3.4;
const RAIL_Y = -1.75; // just below the cowl's lowest point

function stand() {
  const g = new THREE.Group();
  g.name = 'engine-stand';

  // Longitudinal rails running under the engine.
  const railGeo = new THREE.BoxGeometry(0.18, 0.18, 5.6);
  for (const x of [-1.25, 1.25]) {
    const rail = new THREE.Mesh(railGeo, mat.metal());
    rail.position.set(x, RAIL_Y, 0);
    g.add(rail);
  }

  // Cross members and the cradles the engine rests in.
  const crossGeo = new THREE.BoxGeometry(2.7, 0.16, 0.16);
  const cradleGeo = new THREE.BoxGeometry(0.3, 0.5, 0.5);
  for (const z of [-1.9, 1.9]) {
    const cross = new THREE.Mesh(crossGeo, mat.metal());
    cross.position.set(0, RAIL_Y, z);
    g.add(cross);

    for (const x of [-0.85, 0.85]) {
      const cradle = new THREE.Mesh(cradleGeo, mat.metal());
      cradle.position.set(x, RAIL_Y + 0.34, z);
      g.add(cradle);
    }
  }

  // Legs down to the floor, on castors.
  const legLen = RAIL_Y - FLOOR_Y - 0.4;
  const legGeo = new THREE.BoxGeometry(0.18, legLen, 0.18);
  const castorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12);
  castorGeo.rotateZ(Math.PI / 2);

  for (const x of [-1.25, 1.25]) {
    for (const z of [-2.3, 2.3]) {
      const leg = new THREE.Mesh(legGeo, mat.metal());
      leg.position.set(x, RAIL_Y - legLen / 2, z);
      leg.castShadow = true;
      g.add(leg);

      const c = new THREE.Mesh(castorGeo, mat.rubber());
      c.position.set(x, FLOOR_Y + 0.2, z);
      g.add(c);
    }
  }

  return g;
}

/** Wireframe box drawn around a region, matching the source's dashed level overlays. */
function levelBox(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(edges, mat.annotation(color, 0.95));
  const fill = new THREE.Mesh(geo, mat.annotationFill(color, 0.07));
  const g = new THREE.Group();
  g.add(line, fill);
  return g;
}

/** The four nested configuration levels, hidden until the ladder stations run. */
function levels() {
  const g = new THREE.Group();
  g.name = 'levels';

  // L1 — the whole engine.
  const l1 = levelBox(3.0, 3.0, ENGINE_LEN + 0.5, PALETTE.signal);
  l1.name = 'lvl1';

  // L2 — the module band where work is scoped.
  const l2 = levelBox(1.9, 1.9, toZ(630) - toZ(200), PALETTE.signal);
  l2.position.z = (toZ(630) + toZ(200)) / 2;
  l2.name = 'lvl2';

  // L3 — a sub-assembly within the module.
  const l3 = levelBox(1.5, 1.5, toZ(350) - toZ(240), PALETTE.signal);
  l3.position.z = (toZ(350) + toZ(240)) / 2;
  l3.name = 'lvl3';

  // L4 — life-limited parts, in flag orange. Three discs, as the source marks them.
  const l4 = new THREE.Group();
  l4.name = 'lvl4';
  [470, 502, 534].forEach((x) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.035, 8, 32),
      mat.glow(PALETTE.flag, 0.95)
    );
    ring.position.z = toZ(x);
    l4.add(ring);
  });

  [l1, l2, l3, l4].forEach((l) => {
    l.visible = false;
    g.add(l);
  });

  return g;
}

/**
 * @returns {THREE.Group} engine assembly, axis along Z, sitting on its stand.
 */
export function createEngine() {
  const g = new THREE.Group();
  g.name = 'engine-assembly';

  const cowl = lathe(COWL, mat.skin());
  cowl.name = 'cowl';

  const shell = new THREE.Group();
  shell.name = 'engine-shell';
  shell.add(cowl, fanStage(), core(), exhaust());

  g.add(shell, levels(), stand());

  g.userData = {
    shell,
    levels: g.getObjectByName('levels'),
    cowl,
  };

  return g;
}

/**
 * Show configuration level `i` (0-based), or -1 for none.
 * Deeper levels also fade the cowl so the camera can see inside — the 3D equivalent
 * of the source's cross-section drawing.
 */
export function setLadderLevel(engine, i) {
  const { levels: lv, cowl } = engine.userData;
  lv.children.forEach((c, k) => {
    c.visible = k === i;
  });

  const transparent = i >= 1;
  cowl.material = transparent ? mat.annotationFill(PALETTE.skin, 0.22) : mat.skin();
}
