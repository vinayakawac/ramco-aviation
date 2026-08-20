/**
 * overlays.js — the annotation layer.
 *
 * The source page draws three dashed overlays over its aircraft (`#hangarShell`,
 * `#envelope`, `#stand`) and toggles them per callout. These are their 3D equivalents,
 * kept deliberately as line work in signal blue so they read as annotation over the
 * scene rather than as part of it.
 */

import * as THREE from 'three';
import { mat, PALETTE } from './materials.js';
import { HANGAR } from './hangar.js';

/** Dashed line geometry needs per-vertex distances; this computes them. */
function dashed(points, color = PALETTE.signal2, dashSize = 1.2, gapSize = 0.9) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color,
    dashSize,
    gapSize,
    transparent: true,
    opacity: 0.95,
  });
  const line = new THREE.Line(geo, material);
  line.computeLineDistances();
  return line;
}

/** Closed dashed loop through a list of [x,y,z] points. */
function dashedLoop(pts, color, dashSize, gapSize) {
  const v = pts.map((p) => new THREE.Vector3(...p));
  v.push(v[0].clone());
  return dashed(v, color, dashSize, gapSize);
}

/**
 * `#hangarShell` — the dashed arch the source draws to say "this whole event is a
 * hangar event". Traced around the hangar's own cross-section.
 */
export function createHangarShell() {
  const g = new THREE.Group();
  g.name = 'ov-hangarShell';
  g.visible = false;

  const w = HANGAR.halfWidth - 1.4;
  const wall = HANGAR.wallHeight;
  const crown = HANGAR.crown - 1.2;

  const arch = [];
  arch.push(new THREE.Vector3(-w, 0.2, 0));
  arch.push(new THREE.Vector3(-w, wall, 0));
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-w, wall, 0),
    new THREE.Vector3(0, crown + 3, 0),
    new THREE.Vector3(w, wall, 0)
  );
  curve.getPoints(28).forEach((p) => arch.push(p));
  arch.push(new THREE.Vector3(w, 0.2, 0));

  for (const z of [-HANGAR.depth + 2, HANGAR.depth - 2]) {
    const ring = dashed(arch.map((p) => new THREE.Vector3(p.x, p.y, z)));
    g.add(ring);
  }

  // Longitudinal ties so it reads as a volume, not two hoops.
  for (const x of [-w, 0, w]) {
    const y = x === 0 ? crown + 3 : wall;
    g.add(
      dashed([
        new THREE.Vector3(x, y, -HANGAR.depth + 2),
        new THREE.Vector3(x, y, HANGAR.depth - 2),
      ])
    );
  }

  return g;
}

/**
 * `#envelope` — the box drawn around the whole airframe when the aircraft is being
 * treated as a technical record rather than a machine.
 */
export function createEnvelope() {
  const g = new THREE.Group();
  g.name = 'ov-envelope';
  g.visible = false;

  const box = new THREE.BoxGeometry(38, 13, 42);
  const edges = new THREE.EdgesGeometry(box);
  const pos = edges.attributes.position;
  for (let i = 0; i < pos.count; i += 2) {
    g.add(
      dashed([
        new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)),
        new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)),
      ])
    );
  }
  g.position.y = 2.6;

  return g;
}

/**
 * `#stand` — the painted stand markings the aircraft parks on for a line turn.
 */
export function createStandMarks() {
  const g = new THREE.Group();
  g.name = 'ov-stand';
  g.visible = false;

  // Lead-in line and stop bar, in the source's dashed signal blue.
  g.add(dashed([new THREE.Vector3(0, 0.06, -26), new THREE.Vector3(0, 0.06, 30)], PALETTE.signal2, 2, 1.4));
  g.add(dashed([new THREE.Vector3(-9, 0.06, 16), new THREE.Vector3(9, 0.06, 16)], PALETTE.signal2, 1.4, 1));
  g.add(
    dashedLoop(
      [
        [-22, 0.06, -24],
        [22, 0.06, -24],
        [22, 0.06, 26],
        [-22, 0.06, 26],
      ],
      PALETTE.signal2,
      1.6,
      1.2
    )
  );

  return g;
}

/**
 * As-Built / Allowable / Actual — the three configurations Ramco tracks separately,
 * shown as offset ghost outlines of the same airframe.
 */
export function createConfigGhosts(aircraftShell) {
  const g = new THREE.Group();
  g.name = 'ov-ghosts';
  g.visible = false;

  const offsets = [
    { z: -7, color: PALETTE.signal, opacity: 0.16 },
    { z: -14, color: PALETTE.signal2, opacity: 0.11 },
    { z: -21, color: PALETTE.flag, opacity: 0.08 },
  ];

  offsets.forEach(({ z, color, opacity }) => {
    const ghost = aircraftShell.clone(true);
    ghost.traverse((o) => {
      if (o.isMesh || o.isInstancedMesh) {
        o.material = mat.annotationFill(color, opacity);
        o.castShadow = o.receiveShadow = false;
      }
    });
    ghost.position.set(0, 0, z);
    g.add(ghost);
  });

  return g;
}

/**
 * Speed tape — the five published outcome meters, drawn as bars beside the runway
 * that fill as the takeoff roll builds.
 */
export function createSpeedTape(meters) {
  const g = new THREE.Group();
  g.name = 'ov-speedtape';
  g.visible = false;

  meters.forEach((m, i) => {
    const bar = new THREE.Group();

    const track = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 30), mat.annotationFill(PALETTE.signal, 0.2));
    bar.add(track);

    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 30), mat.glow(PALETTE.signal2, 0.9));
    fill.name = 'fill';
    fill.userData.target = m.v / 100;
    fill.scale.z = 0.001;
    bar.add(fill);

    bar.position.set(-FIELD_EDGE, 1.2 + i * 1.6, 360 + i * 46);
    g.add(bar);
  });

  return g;
}

const FIELD_EDGE = 30;

/** Set every dashed overlay's visibility from the active station's `overlay` flag. */
export function applyOverlay(overlays, key) {
  Object.entries(overlays).forEach(([name, obj]) => {
    if (obj) obj.visible = name === key;
  });
}
