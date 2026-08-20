/**
 * props.js — everything around the aircraft: ground support equipment, the parts store,
 * the component bench, jacks, and the holding-point compliance signage.
 *
 * The GSE and the store shelving follow the source page's own `#gse` and `#store` SVG
 * groups: a low tug with a raised mast, and a three-shelf rack of labelled bins.
 */

import * as THREE from 'three';
import { mat, PALETTE } from './materials.js';
import { createLabel } from './label.js';
import * as D from '../data/ramco.js';

/** Tug / ground power unit — the source's `#gse` group in three dimensions. */
export function createGSE() {
  const g = new THREE.Group();
  g.name = 'gse';

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 4.4), mat.crate());
  body.position.y = 1.1;
  body.castShadow = true;
  g.add(body);

  // The raised mast with its control head.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.7, 8), mat.dark());
  mast.position.set(0, 2.5, -1.5);
  g.add(mast);

  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.62, 0.42), mat.crate());
  head.position.set(0, 3.4, -1.5);
  g.add(head);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.42), mat.glow(PALETTE.signal2, 0.85));
  screen.position.set(0, 3.4, -1.72);
  screen.rotation.y = Math.PI;
  screen.name = 'gse-screen';
  g.add(screen);

  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.4, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const x of [-1.3, 1.3]) {
    for (const z of [-1.5, 1.5]) {
      const w = new THREE.Mesh(wheelGeo, mat.rubber());
      w.position.set(x, 0.52, z);
      g.add(w);
    }
  }

  // Tow bar reaching toward the nose gear.
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 3.4), mat.metal());
  bar.position.set(0, 0.7, 3.6);
  g.add(bar);

  return g;
}

/** Parts store: shelving bays with instanced bins, plus a pallet on the floor. */
export function createStore() {
  const g = new THREE.Group();
  g.name = 'store';

  const BAYS = 3;
  const SHELVES = 3;

  const uprightGeo = new THREE.BoxGeometry(0.16, 5.2, 0.16);
  const shelfGeo = new THREE.BoxGeometry(3.8, 0.12, 1.5);

  for (let b = 0; b < BAYS; b++) {
    const z = (b - 1) * 4.2;
    for (const x of [-1.9, 1.9]) {
      for (const zz of [-0.75, 0.75]) {
        const up = new THREE.Mesh(uprightGeo, mat.metal());
        up.position.set(x, 2.6, z + zz);
        g.add(up);
      }
    }
    for (let s = 0; s < SHELVES; s++) {
      const shelf = new THREE.Mesh(shelfGeo, mat.metal());
      shelf.position.set(0, 0.7 + s * 1.7, z);
      shelf.receiveShadow = true;
      g.add(shelf);
    }
  }

  // Bins, instanced across every shelf position.
  const binGeo = new THREE.BoxGeometry(0.72, 0.5, 0.9);
  const perShelf = 4;
  const total = BAYS * SHELVES * perShelf;
  const bins = new THREE.InstancedMesh(binGeo, mat.crate(), total);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let b = 0; b < BAYS; b++) {
    for (let s = 0; s < SHELVES; s++) {
      for (let k = 0; k < perShelf; k++) {
        // Leave a deterministic gap here and there — a real store is never full.
        if ((b * 7 + s * 3 + k) % 5 === 0) {
          i++;
          continue;
        }
        m.makeTranslation(-1.35 + k * 0.9, 1.01 + s * 1.7, (b - 1) * 4.2);
        bins.setMatrixAt(i++, m);
      }
    }
  }
  bins.count = total;
  bins.instanceMatrix.needsUpdate = true;
  bins.name = 'store-bins';
  g.add(bins);

  return g;
}

/**
 * Demand pulse — a bead that runs from the store to the bench, standing for
 * "one-touch demand-to-procurement" driven off the maintenance plan.
 */
export function createDemandPulse(from, to) {
  const g = new THREE.Group();
  g.name = 'demand-pulse';
  g.visible = false;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(...from),
    new THREE.Vector3((from[0] + to[0]) / 2, 5.5, (from[2] + to[2]) / 2),
    new THREE.Vector3(...to),
  ]);

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 40, 0.05, 6, false),
    mat.annotationFill(PALETTE.signal2, 0.4)
  );
  g.add(tube);

  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat.glow(PALETTE.signal2, 1));
  bead.name = 'bead';
  g.add(bead);

  g.userData = { curve };
  return g;
}

/** Component bench — where LRUs land between removal and ARC release. */
export function createBench() {
  const g = new THREE.Group();
  g.name = 'bench';

  const top = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 1.9), mat.metal());
  top.position.y = 1.0;
  top.receiveShadow = true;
  g.add(top);

  const legGeo = new THREE.BoxGeometry(0.14, 1.0, 0.14);
  for (const x of [-2.4, 2.4]) {
    for (const z of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(legGeo, mat.metal());
      leg.position.set(x, 0.5, z);
      g.add(leg);
    }
  }

  // A couple of components in work.
  const partA = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.7, 14), mat.dark());
  partA.position.set(-1.3, 1.43, 0);
  g.add(partA);

  const partB = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), mat.crate());
  partB.position.set(1.2, 1.33, 0.1);
  g.add(partB);

  return g;
}

/** Maintenance jacks under the wings and nose, for the hangar-check station. */
export function createJacks() {
  const g = new THREE.Group();
  g.name = 'jacks';

  const positions = [
    [-9, 0, 2],
    [9, 0, 2],
    [0, 0, 15],
  ];

  positions.forEach((p) => {
    const jack = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.3, 12), mat.metal());
    base.position.y = 0.15;
    jack.add(base);
    const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.4, 10), mat.metal());
    ram.position.y = 1.9;
    jack.add(ram);
    jack.position.set(...p);
    g.add(jack);
  });

  return g;
}

/**
 * Holding-point signage carrying the compliance groups — the regulatory gate you pass
 * through on the way to the runway.
 */
export function createSignage() {
  const g = new THREE.Group();
  g.name = 'signage';
  g.visible = false;

  D.COMPLIANCE.groups.forEach((grp, i) => {
    const board = new THREE.Group();

    const face = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.7, 0.2), mat.structure());
    board.add(face);

    const plate = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.35), mat.glow(PALETTE.signal, 0.92));
    plate.position.z = 0.12;
    board.add(plate);

    // Airfield signage carries the regulatory group it stands for, in the mandatory
    // white-on-red/blue convention aerodrome signs already use.
    const title = createLabel(grp.title.replace(/&amp;/g, '&'), {
      worldWidth: 5.6,
      aspect: 9,
      width: 620,
      height: 70,
      font: '600 42px Archivo, sans-serif',
      color: '#ffffff',
    });
    title.position.set(0, 0.42, 0.14);
    board.add(title);

    const body = createLabel(grp.body.replace(/&amp;/g, '&'), {
      worldWidth: 5.6,
      aspect: 5.6,
      width: 620,
      height: 110,
      font: '400 26px IBM Plex Mono, monospace',
      color: '#cfe3e8',
    });
    body.position.set(0, -0.28, 0.14);
    board.add(body);

    const legGeo = new THREE.BoxGeometry(0.14, 1.3, 0.14);
    for (const x of [-2.4, 2.4]) {
      const leg = new THREE.Mesh(legGeo, mat.metal());
      leg.position.set(x, -1.5, 0);
      board.add(leg);
    }

    board.position.set(46, 3.1, 214 + i * 16);
    board.rotation.y = -Math.PI / 2;
    board.name = `sign-${i}`;
    g.add(board);
  });

  return g;
}
