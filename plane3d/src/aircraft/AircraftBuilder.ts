// Assembles the AIRCRAFT-001 master model from the part builders.
//   AIRCRAFT_ROOT  (one fixed −90° X rotation: spec Z-up → Three.js Y-up)
//   └── AIRCRAFT-001 (spec frame; all tests measure here)
//       ├── FUSELAGE, WING_L, WING_R, ENGINE_L, ENGINE_R, TAIL_VERTICAL,
//       │   TAIL_HORIZONTAL_L/R, GEAR_NOSE, GEAR_MAIN_L/R, INTERIOR
// Frame: +X forward, +Y PORT, +Z up (see CLAUDE.md §3). Starboard parts are authored at −Y
// and mirrored by mirrorObjectY() to make the port parts, so symmetry is a code guarantee.
import * as THREE from 'three';
import { createLogger } from '../core/logger';
import { countTriangles, mirrorObjectY } from '../core/geometry';
import { QUALITY_PROFILES, type QualityProfile } from '../core/quality';
import { AIRCRAFT_ID, NODE, UNIT_SCALE, m } from './AircraftSpec';
import { createMaterials, type MaterialSet } from './AircraftMaterials';
import type { PartContext } from './parts/PartContext';
import { buildFuselage } from './parts/Fuselage';
import { buildWingRight } from './parts/Wing';
import { buildTailHorizontalRight, buildTailVertical } from './parts/Tail';
import { buildEngineRight } from './parts/Engine';
import { buildMainGearRight, buildNoseGear } from './parts/LandingGear';
import { buildInterior } from './interior/Interior';

export interface BuiltAircraft {
  /** Y-up world root; add this to the scene. */
  root: THREE.Group;
  /** Spec-frame aircraft group (X fwd, Y port, Z up; see CLAUDE.md §3). */
  aircraft: THREE.Group;
  materials: MaterialSet;
  quality: QualityProfile;
  triangles: number;
  /** Scene units per meter, for UI dimension readouts. */
  unitScale: number;
}

export interface BuildOptions {
  quality?: QualityProfile;
  /** Override interior build (defaults to quality.buildInterior). */
  interior?: boolean;
  materials?: MaterialSet;
}

/** Exploded-view offsets per top-level component (spec meters; deterministic, §26). */
const EXPLODED_OFFSETS: Record<string, [number, number, number]> = {
  FUSELAGE: [0, 0, 0],
  WING_L: [0, 6, -2.5],
  WING_R: [0, -6, -2.5],
  ENGINE_L: [-2, 4, -5],
  ENGINE_R: [-2, -4, -5],
  TAIL_VERTICAL: [-6, 0, 4],
  TAIL_HORIZONTAL_L: [-6, 4, 1],
  TAIL_HORIZONTAL_R: [-6, -4, 1],
  GEAR_NOSE: [3, 0, -5],
  GEAR_MAIN_L: [0, 3, -6],
  GEAR_MAIN_R: [0, -3, -6],
  INTERIOR: [0, 0, 7],
};

export function buildAircraft(opts: BuildOptions = {}): BuiltAircraft {
  const log = createLogger('AircraftBuilder');
  const quality = opts.quality ?? QUALITY_PROFILES.T1440;
  const materials = opts.materials ?? createMaterials();
  const ctx: PartContext = { mat: materials, quality, m, log: createLogger('Parts') };
  const t0 = performance.now?.() ?? Date.now();

  const aircraft = new THREE.Group();
  aircraft.name = AIRCRAFT_ID;
  aircraft.userData = { aircraft: AIRCRAFT_ID, unitScale: UNIT_SCALE, frame: 'X forward, Y port, Z up' };

  // symmetric pairs: build STARBOARD once (−Y), mirror to PORT (+Y)
  const pairs: Array<[string, () => THREE.Object3D]> = [
    [NODE.WING_R, () => buildWingRight(ctx)],
    [NODE.ENGINE_R, () => buildEngineRight(ctx)],
    [NODE.TAIL_HORIZONTAL_R, () => buildTailHorizontalRight(ctx)],
    [NODE.GEAR_MAIN_R, () => buildMainGearRight(ctx)],
  ];
  aircraft.add(buildFuselage(ctx));
  for (const [name, build] of pairs) {
    const stbd = build();
    if (stbd.name !== name) log.warn('part name mismatch', { expected: name, got: stbd.name });
    aircraft.add(stbd, mirrorObjectY(stbd));
  }
  aircraft.add(buildTailVertical(ctx));
  aircraft.add(buildNoseGear(ctx));
  // passenger doors: mirror the starboard doors to port (cargo doors stay starboard-only)
  const doors = aircraft.getObjectByName(NODE.DOORS);
  if (doors) {
    for (const d of [...doors.children]) if (d.name.endsWith('_R')) doors.add(mirrorObjectY(d));
  }
  // nose gear bay door: same treatment
  const bay = aircraft.getObjectByName('NOSE_BAY_DOOR_R');
  if (bay?.parent) bay.parent.add(mirrorObjectY(bay));
  if (opts.interior ?? quality.buildInterior) aircraft.add(buildInterior(ctx));

  // exploded-view targets stored as data (product.md §26)
  for (const child of aircraft.children) {
    const off = EXPLODED_OFFSETS[child.name];
    if (off) child.userData.explodedOffset = off.map((v) => m(v));
    child.userData.restPosition = child.position.toArray();
  }

  const root = new THREE.Group();
  root.name = NODE.ROOT;
  root.rotation.x = -Math.PI / 2; // spec Z-up → Three.js Y-up; the only rotation ever applied here
  root.add(aircraft);
  root.updateMatrixWorld(true);

  const triangles = countTriangles(aircraft);
  const ms = Math.round((performance.now?.() ?? Date.now()) - t0);
  log.info('aircraft built', { quality: quality.tier, triangles, budget: quality.triangleBudget, ms });
  if (triangles > quality.triangleBudget) log.warn('triangle budget exceeded', { triangles, budget: quality.triangleBudget });

  return { root, aircraft, materials, quality, triangles, unitScale: UNIT_SCALE };
}

/** Bounding box of the aircraft in the SPEC frame, converted back to meters. */
export function measureAircraft(aircraft: THREE.Object3D, exclude: string[] = []): { length: number; span: number; height: number; box: THREE.Box3 } {
  aircraft.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  aircraft.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    let p: THREE.Object3D | null = o;
    while (p && p !== aircraft) { if (exclude.includes(p.name)) return; p = p.parent; }
    const pos = mesh.geometry.attributes.position;
    const inst = (mesh as unknown as THREE.InstancedMesh).isInstancedMesh ? (mesh as unknown as THREE.InstancedMesh) : null;
    // spec-frame matrix = matrixWorld relative to the aircraft group
    const rel = new THREE.Matrix4().copy(aircraft.matrixWorld).invert().multiply(mesh.matrixWorld);
    const count = inst ? inst.count : 1;
    const im = new THREE.Matrix4();
    for (let k = 0; k < count; k++) {
      if (inst) inst.getMatrixAt(k, im);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        if (inst) v.applyMatrix4(im);
        v.applyMatrix4(rel);
        box.expandByPoint(v);
      }
    }
  });
  const size = box.getSize(new THREE.Vector3());
  return { length: size.x / UNIT_SCALE, span: size.y / UNIT_SCALE, height: size.z / UNIT_SCALE, box };
}
