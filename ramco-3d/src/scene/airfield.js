/**
 * airfield.js — ground, apron, taxiway, runway and lighting.
 *
 * Laid out to match the flight path in stations/index.js: the hangar opens onto an apron
 * at z ≈ 30–90, a taxiway runs out to x ≈ 34 and north to the holding point at z ≈ 250,
 * then turns onto a runway centred on x = 0 running from z = 290 to z = 1200.
 */

import * as THREE from 'three';
import { mat, PALETTE } from './materials.js';

export const FIELD = {
  runwayStart: 288,
  runwayEnd: 1200,
  runwayHalfWidth: 23,
  taxiHalfWidth: 11,
  apronEnd: 96,
};

/** A flat painted strip on the ground, `y` a hair above the surface to avoid z-fighting. */
function strip(w, d, material, y = 0.03) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

function ground() {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({
    color: PALETTE.grass,
    roughness: 1,
  }));
  g.rotation.x = -Math.PI / 2;
  g.position.y = -0.05;
  g.receiveShadow = true;
  g.name = 'ground';
  return g;
}

function apron() {
  const g = new THREE.Group();
  g.name = 'apron';
  const slab = strip(150, FIELD.apronEnd + 40, mat.concrete(), 0.0);
  slab.position.z = FIELD.apronEnd / 2 - 10;
  g.add(slab);
  return g;
}

function taxiway() {
  const g = new THREE.Group();
  g.name = 'taxiway';

  // Out from the apron, then north to the holding point.
  const legA = strip(70, FIELD.taxiHalfWidth * 2, mat.tarmac(), 0.01);
  legA.position.set(16, 0.01, 104);
  legA.rotation.z = Math.PI / 2;
  g.add(legA);

  const legB = strip(FIELD.taxiHalfWidth * 2, 190, mat.tarmac(), 0.01);
  legB.position.set(34, 0.01, 178);
  g.add(legB);

  const legC = strip(80, FIELD.taxiHalfWidth * 2, mat.tarmac(), 0.01);
  legC.position.set(6, 0.01, 276);
  legC.rotation.z = Math.PI / 2;
  g.add(legC);

  // Taxiway centreline, in the yellow every apron uses.
  const centre = new THREE.Group();
  centre.name = 'taxi-centreline';
  const dashGeo = new THREE.PlaneGeometry(0.4, 3);
  dashGeo.rotateX(-Math.PI / 2);
  const dashes = new THREE.InstancedMesh(dashGeo, mat.paint(0xd8b23c), 60);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let z = 120; z < 250 && i < 60; z += 7) m.makeTranslation(34, 0.03, z), dashes.setMatrixAt(i++, m);
  for (let x = 16; x < 34 && i < 60; x += 7) m.makeTranslation(x, 0.03, 104), dashes.setMatrixAt(i++, m);
  dashes.count = i;
  dashes.instanceMatrix.needsUpdate = true;
  centre.add(dashes);
  g.add(centre);

  return g;
}

function runway() {
  const g = new THREE.Group();
  g.name = 'runway';

  const len = FIELD.runwayEnd - FIELD.runwayStart;
  const surf = strip(FIELD.runwayHalfWidth * 2, len, mat.tarmac(), 0.01);
  surf.position.z = FIELD.runwayStart + len / 2;
  g.add(surf);

  // Centreline dashes, 30 m stripe / 20 m gap.
  const dashGeo = new THREE.PlaneGeometry(0.9, 18);
  dashGeo.rotateX(-Math.PI / 2);
  const n = Math.floor(len / 32);
  const dashes = new THREE.InstancedMesh(dashGeo, mat.paint(), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(0, 0.035, FIELD.runwayStart + 20 + i * 32);
    dashes.setMatrixAt(i, m);
  }
  dashes.instanceMatrix.needsUpdate = true;
  g.add(dashes);

  // Threshold bars.
  const barGeo = new THREE.PlaneGeometry(1.5, 24);
  barGeo.rotateX(-Math.PI / 2);
  const bars = new THREE.InstancedMesh(barGeo, mat.paint(), 12);
  for (let i = 0; i < 12; i++) {
    const x = (i - 5.5) * 2.9;
    m.makeTranslation(x, 0.035, FIELD.runwayStart + 16);
    bars.setMatrixAt(i, m);
  }
  bars.instanceMatrix.needsUpdate = true;
  g.add(bars);

  // Edge lights, both sides, instanced.
  const lampGeo = new THREE.SphereGeometry(0.34, 8, 6);
  const count = Math.floor(len / 30) * 2;
  const lamps = new THREE.InstancedMesh(lampGeo, mat.glow(0xdfe9ff, 0.85), count);
  let k = 0;
  for (let z = FIELD.runwayStart; z < FIELD.runwayEnd && k < count; z += 30) {
    for (const s of [-1, 1]) {
      m.makeTranslation(s * (FIELD.runwayHalfWidth + 1.2), 0.3, z);
      lamps.setMatrixAt(k++, m);
    }
  }
  lamps.count = k;
  lamps.instanceMatrix.needsUpdate = true;
  lamps.name = 'runway-lights';
  g.add(lamps);

  return g;
}

/** Distant treeline / terrain so the horizon isn't empty during the climb. */
function horizon() {
  const g = new THREE.Group();
  g.name = 'horizon';

  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  const count = 120;
  const inst = new THREE.InstancedMesh(
    blockGeo,
    new THREE.MeshStandardMaterial({ color: 0x3c4a3c, roughness: 1 }),
    count
  );
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const q = new THREE.Quaternion();
  // Deterministic pseudo-random placement — no Math.random, so the scene is reproducible.
  for (let i = 0; i < count; i++) {
    const a = (i * 2.399963) % (Math.PI * 2);
    const r = 1100 + ((i * 137) % 1400);
    pos.set(Math.cos(a) * r, 4, 500 + Math.sin(a) * r);
    scl.set(60 + ((i * 53) % 140), 8 + ((i * 29) % 16), 60 + ((i * 71) % 120));
    m.compose(pos, q, scl);
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);

  return g;
}

export function createAirfield() {
  const g = new THREE.Group();
  g.name = 'airfield';
  g.add(ground(), apron(), taxiway(), runway(), horizon());
  return g;
}
