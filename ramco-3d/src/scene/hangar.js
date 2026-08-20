/**
 * hangar.js — the maintenance hangar: arched shell, sliding doors, roof trusses, work lights.
 *
 * The arch profile follows the source page's hangar overlay path (`#hangarShell`,
 * a flat-sided box with a barrel-arched crown), scaled so a 38 m airframe fits with
 * working clearance around it.
 */

import * as THREE from 'three';
import { mat, PALETTE } from './materials.js';

/** Uniform upsize of the whole shell. 1 = the original 38 m-airframe fit. */
export const HANGAR_SCALE = 1.5;

const S = HANGAR_SCALE;

export const HANGAR = {
  halfWidth: 34 * S,
  depth: 46 * S, // extends from z = -DEPTH to z = +DEPTH
  wallHeight: 12 * S,
  crown: 21 * S,
};

/** The arch cross-section, as a closed 2D shape in XY. */
function archShape(inset = 0) {
  const w = HANGAR.halfWidth - inset;
  const wall = HANGAR.wallHeight - inset * 0.4;
  const crown = HANGAR.crown - inset;
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.lineTo(-w, wall);
  s.quadraticCurveTo(-w * 0.62, crown, 0, crown);
  s.quadraticCurveTo(w * 0.62, crown, w, wall);
  s.lineTo(w, 0);
  s.lineTo(w, -0.6);
  s.lineTo(-w, -0.6);
  s.closePath();
  return s;
}

function shell() {
  const outer = archShape(0);
  const inner = archShape(0.9);
  outer.holes.push(new THREE.Path(inner.getPoints(64).reverse()));

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: HANGAR.depth * 2,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geo.translate(0, 0, -HANGAR.depth);

  const mesh = new THREE.Mesh(geo, mat.structure());
  mesh.name = 'hangar-shell';
  mesh.receiveShadow = true;
  return mesh;
}

/** Back wall, so the camera looking aft doesn't see straight through. */
function backWall() {
  const geo = new THREE.ShapeGeometry(archShape(0.9), 24);
  const wall = new THREE.Mesh(geo, mat.structure());
  wall.position.z = -HANGAR.depth;
  wall.name = 'hangar-back';
  return wall;
}

/** Roof trusses, instanced across the depth. Currently not added to the scene. */
function trusses() {
  const g = new THREE.Group();
  g.name = 'trusses';
  const barGeo = new THREE.BoxGeometry(HANGAR.halfWidth * 2 - 2.2, 0.34, 0.34);
  const count = 9;
  const inst = new THREE.InstancedMesh(barGeo, mat.structure(), count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const z = -HANGAR.depth + 3 + (i * (HANGAR.depth * 2 - 6)) / (count - 1);
    m.makeTranslation(0, HANGAR.wallHeight + 1.4, z);
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);
  return g;
}

/**
 * Two sliding door leaves at the front face. `openness` 0 = shut, 1 = fully parted.
 */
function doors() {
  const g = new THREE.Group();
  g.name = 'doors';

  const leafW = HANGAR.halfWidth;
  const leafGeo = new THREE.BoxGeometry(leafW, HANGAR.wallHeight + 6 * S, 0.7);
  // Ribbed face: a few horizontal rails read as a real door at grazing angles.
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    const panel = new THREE.Mesh(leafGeo, mat.structure());
    panel.castShadow = true;
    leaf.add(panel);

    const railGeo = new THREE.BoxGeometry(leafW - 0.4, 0.22, 0.9);
    for (let i = 0; i < 5; i++) {
      const rail = new THREE.Mesh(railGeo, mat.metal());
      rail.position.y = (-6 + i * 3.4) * S;
      leaf.add(rail);
    }

    leaf.position.set((side * leafW) / 2, (HANGAR.wallHeight + 6 * S) / 2 - 0.6, HANGAR.depth);
    leaf.userData.side = side;
    leaf.userData.shut = leaf.position.x;
    g.add(leaf);
  }

  return g;
}

/** Overhead work lights — the thing that snaps on in the cold open. */
function workLights() {
  const g = new THREE.Group();
  g.name = 'worklights';

  const positions = [
    [-18 * S, HANGAR.wallHeight + 2.2 * S, -18 * S],
    [18 * S, HANGAR.wallHeight + 2.2 * S, -18 * S],
    [-18 * S, HANGAR.wallHeight + 2.2 * S, 4 * S],
    [18 * S, HANGAR.wallHeight + 2.2 * S, 4 * S],
    [0, HANGAR.crown - 1.5 * S, -6 * S],
  ];

  positions.forEach((p, i) => {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 0.6, 12), mat.structure());
    housing.position.set(...p);
    g.add(housing);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.86, 16), mat.glow(0xfff3dc, 0.9));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(p[0], p[1] - 0.32, p[2]);
    lens.name = `lens-${i}`;
    g.add(lens);

    const light = new THREE.PointLight(0xffe9c4, 0, 60 * S, 2);
    light.position.set(p[0], p[1] - 1, p[2]);
    light.name = `wl-${i}`;
    g.add(light);
  });

  return g;
}

/** Floor: polished concrete with painted bay markings. */
function floor() {
  const g = new THREE.Group();
  g.name = 'hangar-floor';

  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(HANGAR.halfWidth * 2, HANGAR.depth * 2),
    mat.concrete()
  );
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = 0.01;
  slab.receiveShadow = true;
  g.add(slab);

  // Bay outline in signal blue — the hangar's own "work package" boundary.
  const bay = new THREE.Mesh(
    new THREE.PlaneGeometry(46 * S, 46 * S),
    mat.annotationFill(PALETTE.signal2, 0.06)
  );
  bay.rotation.x = -Math.PI / 2;
  bay.position.set(0, 0.02, -2 * S);
  g.add(bay);

  return g;
}

export function createHangar() {
  const g = new THREE.Group();
  g.name = 'hangar';
  // Ceiling trusses are off for now — re-add `trusses()` here to bring the bars back.
  g.add(shell(), backWall(), floor(), doors(), workLights());

  g.userData = {
    doors: g.getObjectByName('doors'),
    lights: g.getObjectByName('worklights'),
  };

  return g;
}

/** @param {number} t 0 = shut, 1 = fully open. */
export function setDoors(hangar, t) {
  hangar.userData.doors.children.forEach((leaf) => {
    const travel = HANGAR.halfWidth * 0.98 * t;
    leaf.position.x = leaf.userData.shut + leaf.userData.side * travel;
  });
}

/** @param {number} level 0 → 1 work-light intensity. */
export function setWorkLights(hangar, level) {
  hangar.userData.lights.children.forEach((o) => {
    if (o.isPointLight) o.intensity = level * 2600;
    if (o.name?.startsWith('lens')) o.material.opacity = 0.15 + level * 0.8;
  });
}
