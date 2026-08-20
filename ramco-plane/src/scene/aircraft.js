/**
 * aircraft.js — the hero airframe, generated in code.
 *
 * Proportions follow the source page's own aircraft artwork (the fuselage curve, wing
 * planform, nacelle and tail in the coverage-map SVG), scaled to a ~38 m narrowbody.
 * Nose points along +Z, so the flight path can drive position and heading directly.
 *
 * Named sub-groups (`gear`, `engines`, `surfaces`, `lru`) are exposed so station state
 * can animate them: gear retracts on climb, LRU positions pulse at the component station.
 */

import * as THREE from 'three';
import { mat, PALETTE } from './materials.js';

const LEN = 38;

/**
 * Fuselage radius profile: [distance from the tail, radius].
 * z = 0 is the tail cone tip, z = LEN is the nose. A narrowbody holds a constant
 * 2 m section through the cabin, tapers over roughly 7 m into the nose, and runs a
 * longer upswept cone aft — not the symmetric spindle a naive lathe produces.
 */
const PROFILE = [
  [0.0, 0.28],
  [1.4, 0.66],
  [3.2, 1.08],
  [5.4, 1.46],
  [7.8, 1.76],
  [10.4, 1.93],
  [12.5, 2.0],
  [28.5, 2.0],
  [30.8, 1.96],
  [32.8, 1.84],
  [34.6, 1.6],
  [36.2, 1.22],
  [37.4, 0.72],
  [38.0, 0.26],
];

function fuselage() {
  const pts = PROFILE.map(([z, r]) => new THREE.Vector2(Math.max(r, 0.02), z));
  const geo = new THREE.LatheGeometry(pts, 40);
  // Lathe spins around +Y; rotate so the body axis runs along +Z with the nose forward.
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, -LEN / 2);
  const mesh = new THREE.Mesh(geo, mat.skin());
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = 'fuselage';
  return mesh;
}

/** Build a swept lifting surface from a planform outline, laid flat in XZ. */
function surface(outline, thickness, material) {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.4,
    bevelSize: thickness * 0.5,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thickness / 2, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/**
 * Planforms are given for the STARBOARD side, spanwise along +x.
 * `surface()` maps shape-y to -z, so a POSITIVE shape-y is aft: the tip coordinates
 * are larger than the root's, which is what makes the wing sweep back rather than
 * forward. The port side is the same geometry mirrored in x.
 *
 * Root chord 6.7 m, tip chord 2.1 m, 16.8 m semi-span, leading edge swept ~26°.
 */
const WING = [
  [0, -3.3], // root leading edge
  [16.8, 4.9], // tip leading edge
  [16.8, 7.0], // tip trailing edge
  [5.6, 3.9], // trailing-edge kink
  [0, 3.4], // root trailing edge
];

const HSTAB = [
  [0, -1.7],
  [6.6, 2.4],
  [6.6, 3.5],
  [0, 2.1],
];

const DIHEDRAL = 0.088; // ~5°

/**
 * Build a mirrored pair from one starboard planform.
 * Scale is applied before rotation, so the mirrored half needs the opposite
 * dihedral angle to lift its tip rather than drop it.
 */
function surfacePair(outline, thickness, material, { x, y, z, dihedral = 0 }) {
  const g = new THREE.Group();

  const stbd = surface(outline, thickness, material);
  stbd.position.set(x, y, z);
  stbd.rotation.z = dihedral;

  const port = surface(outline, thickness, material);
  port.position.set(-x, y, z);
  port.scale.x = -1;
  port.rotation.z = -dihedral;

  g.add(stbd, port);
  return g;
}

function wings() {
  const g = new THREE.Group();
  g.name = 'wings';
  // Low-wing mounting: the root sits at the bottom of the fuselage section.
  g.add(surfacePair(WING, 0.52, mat.skin2(), { x: 1.85, y: -1.2, z: 1.0, dihedral: DIHEDRAL }));
  return g;
}

function tail() {
  const g = new THREE.Group();
  g.name = 'tail';

  g.add(surfacePair(HSTAB, 0.34, mat.skin2(), { x: 1.15, y: 0.75, z: -15.2, dihedral: 0.05 }));

  // Vertical fin: same planform trick, stood upright.
  const finShape = new THREE.Shape();
  [
    [0, 2.4],
    [7.2, -3.4],
    [7.2, -5.0],
    [0, -3.1],
  ].forEach(([x, y], i) => (i ? finShape.lineTo(x, y) : finShape.moveTo(x, y)));
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.2,
    bevelSegments: 2,
  });
  finGeo.rotateZ(-Math.PI / 2);
  finGeo.rotateY(Math.PI / 2);
  const fin = new THREE.Mesh(finGeo, mat.skin2());
  fin.position.set(0, 1.7, -14.6);
  fin.castShadow = true;
  g.add(fin);

  return g;
}

/** Turbofan nacelle hung on a pylon. */
function nacelle(side) {
  const g = new THREE.Group();
  g.name = `nacelle-${side > 0 ? 'stbd' : 'port'}`;

  const cowlPts = [
    [0.0, 1.32],
    [0.5, 1.62],
    [1.6, 1.72],
    [4.2, 1.66],
    [5.4, 1.44],
    [5.8, 1.2],
  ].map(([z, r]) => new THREE.Vector2(r, z));
  const cowl = new THREE.Mesh(new THREE.LatheGeometry(cowlPts, 28), mat.skin());
  cowl.geometry.rotateX(Math.PI / 2);
  cowl.geometry.translate(0, 0, -2.9);
  cowl.castShadow = true;
  g.add(cowl);

  // Intake lip darkens into the fan face — reads as an engine even at distance.
  const fan = new THREE.Mesh(new THREE.CircleGeometry(1.28, 26), mat.dark());
  fan.position.z = 2.75;
  g.add(fan);

  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 16), mat.metal());
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 3.1;
  g.add(spinner);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.7, 1.5, 20), mat.dark());
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.z = -3.3;
  g.add(exhaust);

  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.9, 3.2), mat.skin2());
  pylon.position.set(0, 1.5, -0.6);
  g.add(pylon);

  g.position.set(side * 7.2, -2.0, 2.6);
  return g;
}

/** One gear leg: strut plus paired wheels. */
function gearLeg({ x, z, legLen, wheelR, pairs }) {
  const g = new THREE.Group();

  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, legLen, 12), mat.metal());
  strut.position.y = -legLen / 2;
  g.add(strut);

  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.42, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < pairs; i++) {
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, mat.rubber());
      w.position.set(s * 0.42, -legLen + wheelR, (i - (pairs - 1) / 2) * 1.05);
      w.castShadow = true;
      g.add(w);
    }
  }

  g.position.set(x, -1.7, z);
  return g;
}

function landingGear() {
  const g = new THREE.Group();
  g.name = 'gear';
  g.add(gearLeg({ x: 0, z: 14.0, legLen: 2.5, wheelR: 0.55, pairs: 1 }));
  g.add(gearLeg({ x: -3.4, z: -1.2, legLen: 2.4, wheelR: 0.68, pairs: 2 }));
  g.add(gearLeg({ x: 3.4, z: -1.2, legLen: 2.4, wheelR: 0.68, pairs: 2 }));
  return g;
}

/** Windows, cockpit glass and the door outlines that make the scale legible. */
function detailing() {
  const g = new THREE.Group();
  g.name = 'detail';

  // Cabin windows as one instanced run down each side.
  const winGeo = new THREE.BoxGeometry(0.1, 0.34, 0.24);
  const count = 22;
  const inst = new THREE.InstancedMesh(winGeo, mat.glass(), count * 2);
  const m = new THREE.Matrix4();
  let i = 0;
  for (const s of [-1, 1]) {
    for (let k = 0; k < count; k++) {
      const z = 8.6 - k * 0.85;
      m.makeTranslation(s * 1.93, 0.62, z);
      inst.setMatrixAt(i++, m);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);

  // Flight-deck glazing.
  const wind = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 12, 0, Math.PI * 2, 0, 0.6), mat.glass());
  wind.rotation.x = Math.PI / 2.3;
  wind.position.set(0, 0.8, 15.4);
  g.add(wind);

  // Radome, capping the nose taper so it reads blunt rather than pointed.
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 14), mat.dark());
  nose.position.set(0, -0.12, 17.9);
  nose.scale.set(1, 0.92, 1.4);
  g.add(nose);

  return g;
}

/**
 * Representative removable positions (LRUs) — the equipment bay, both main gear bays
 * and the APU, matching the callouts the source page marks on the airframe.
 * Kept as a named group so the component station can pulse them.
 */
function lruMarkers() {
  const g = new THREE.Group();
  g.name = 'lru';
  g.visible = false;

  const spots = [
    { p: [0, -1.9, 6.2], r: 1.5, label: 'equipment bay' },
    { p: [-3.3, -3.9, -0.6], r: 1.2, label: 'main gear' },
    { p: [3.3, -3.9, -0.6], r: 1.2, label: 'main gear' },
    { p: [0, 0.4, -17.8], r: 1.1, label: 'APU' },
  ];

  spots.forEach(({ p, r }) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.78, r, 32),
      mat.annotationFill(PALETTE.signal2, 0.5)
    );
    ring.position.set(...p);
    ring.userData.baseScale = 1;
    g.add(ring);
  });

  return g;
}

/**
 * A minimal flight deck, seen only from inside: glareshield, window posts, and the EFB
 * mounted where the crew actually uses it. Hidden until the Flight Operations station.
 */
function cockpit() {
  const g = new THREE.Group();
  g.name = 'cockpit';
  g.visible = false;

  const dark = new THREE.MeshStandardMaterial({ color: 0x161e23, roughness: 0.9 });

  // Sized against the fuselage section at the nose: the deck is only ~2.8 m across,
  // and the eyepoint (see the deck station's camera key) sits just aft of the posts.
  const shield = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.22, 1.1), dark);
  shield.position.set(0, 2.26, 17.85);
  g.add(shield);

  // Windscreen posts and header — the frame the runway is seen through.
  const postGeo = new THREE.BoxGeometry(0.13, 1.35, 0.13);
  for (const x of [-1.32, 0, 1.32]) {
    const post = new THREE.Mesh(postGeo, dark);
    post.position.set(x, 3.06, 18.3);
    g.add(post);
  }

  const header = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.26, 0.55), dark);
  header.position.set(0, 3.78, 18.15);
  g.add(header);

  const sillGeo = new THREE.BoxGeometry(2.9, 0.14, 0.5);
  const sill = new THREE.Mesh(sillGeo, dark);
  sill.position.set(0, 2.42, 18.2);
  g.add(sill);

  // Outer window posts close the frame at the sides.
  const outerGeo = new THREE.BoxGeometry(0.16, 1.35, 0.5);
  for (const x of [-1.5, 1.5]) {
    const post = new THREE.Mesh(outerGeo, dark);
    post.position.set(x, 3.06, 18.15);
    g.add(post);
  }

  // Fly Anywhere — the EFB on its side mount, lit because it works offline.
  const efb = new THREE.Group();
  efb.name = 'efb';
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.6, 0.04), dark);
  efb.add(bezel);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.53),
    mat.glow(PALETTE.signal2, 0.95)
  );
  screen.position.z = 0.03;
  efb.add(screen);
  efb.position.set(-0.98, 2.52, 17.5);
  efb.rotation.set(-0.35, 0.42, 0);
  g.add(efb);

  return g;
}

/**
 * @returns {THREE.Group} aircraft, nose along +Z, wheels on y = -4.1 relative to origin.
 */
export function createAircraft() {
  const air = new THREE.Group();
  air.name = 'aircraft';

  const shell = new THREE.Group();
  shell.name = 'airframe';
  shell.add(fuselage(), wings(), tail(), detailing());
  shell.add(nacelle(-1), nacelle(1));

  air.add(shell);
  air.add(landingGear());
  air.add(lruMarkers());
  air.add(cockpit());

  // Sit the wheels on the ground plane.
  air.position.y = 4.1;

  air.userData = {
    airframe: shell,
    gear: air.getObjectByName('gear'),
    lru: air.getObjectByName('lru'),
    cockpit: air.getObjectByName('cockpit'),
    length: LEN,
  };

  return air;
}

/** Highlight treatment matching the source's `#airframe.lit` rule. */
export function setAirframeLit(aircraft, lit) {
  const target = lit ? 0xcfe3e8 : PALETTE.skin;
  aircraft.userData.airframe.traverse((o) => {
    if (o.isMesh && o.material === mat.skin()) o.material.color.setHex(target);
  });
}
