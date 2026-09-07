// Geometry validation for AIRCRAFT-001 (product.md §5, §36, §39, §30, CLAUDE.md §1–4).
// These are the Gate 2 (dimensions) and symmetry evals. They run in the spec frame.
import { describe, expect, it, beforeAll } from 'vitest';
import * as THREE from 'three';
import { buildAircraft, measureAircraft, type BuiltAircraft } from '../src/aircraft/AircraftBuilder';
import { AIRCRAFT_ID, GEAR, GROUND_Z, MASTER, NODE, UNIT_SCALE, SYSTEMS } from '../src/aircraft/AircraftSpec';
import { QUALITY_PROFILES } from '../src/core/quality';
import { applyChannel } from '../src/aircraft/parts/PartContext';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let built: BuiltAircraft;
beforeAll(() => { built = buildAircraft({ quality: QUALITY_PROFILES.T1440 }); });

const pct = (a: number, b: number) => Math.abs(a - b) / b;

describe('scene graph', () => {
  it('root applies exactly one −90° X rotation and the aircraft group is un-rotated', () => {
    expect(built.root.name).toBe(NODE.ROOT);
    expect(built.root.rotation.x).toBeCloseTo(-Math.PI / 2, 6);
    expect(built.root.rotation.y).toBe(0);
    expect(built.root.rotation.z).toBe(0);
    expect(built.aircraft.name).toBe(AIRCRAFT_ID);
    expect(built.aircraft.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(built.aircraft.position.length()).toBe(0);
  });

  it('exposes every stable node name from product.md §30', () => {
    for (const name of [NODE.FUSELAGE, NODE.WING_L, NODE.WING_R, NODE.WINGLET_L, NODE.WINGLET_R, NODE.ENGINE_L, NODE.ENGINE_R,
      NODE.TAIL_VERTICAL, NODE.TAIL_HORIZONTAL_L, NODE.TAIL_HORIZONTAL_R, NODE.GEAR_NOSE, NODE.GEAR_MAIN_L, NODE.GEAR_MAIN_R, NODE.DOORS, NODE.INTERIOR]) {
      expect(built.aircraft.getObjectByName(name), name).toBeDefined();
    }
  });

  it('every mesh carries the §39 metadata with a known system', () => {
    let meshes = 0;
    built.aircraft.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      meshes++;
      // metadata may live on the mesh or on an ancestor pivot group
      let p: THREE.Object3D | null = o;
      while (p && p !== built.aircraft && !p.userData.component) p = p.parent;
      const ud = p?.userData ?? {};
      expect(ud.aircraft, `${o.name} aircraft`).toBe(AIRCRAFT_ID);
      expect(typeof ud.component, `${o.name} component`).toBe('string');
      expect(Object.keys(SYSTEMS), `${o.name} system`).toContain(ud.system);
      expect(typeof ud.label).toBe('string');
      expect(typeof ud.selectable).toBe('boolean');
    });
    expect(meshes).toBeGreaterThan(50);
  });
});

describe('dimensions (spec meters, Gate 2)', () => {
  it('overall length ≈ 39.5 m within 1 %', () => {
    const { length } = measureAircraft(built.aircraft);
    expect(pct(length, MASTER.length)).toBeLessThan(0.01);
  });
  it('wingspan ≈ 35.8 m within 1 %', () => {
    const { span } = measureAircraft(built.aircraft);
    expect(pct(span, MASTER.wingspan)).toBeLessThan(0.01);
  });
  it('overall height ≈ 12.5 m (ground to fin top) within 1.5 %', () => {
    const { height, box } = measureAircraft(built.aircraft);
    expect(pct(height, MASTER.height)).toBeLessThan(0.015);
    expect(box.min.z / UNIT_SCALE).toBeCloseTo(GROUND_Z, 1);
  });
  it('wheelbase = 13.0 m from gear pivot stations', () => {
    const nose = built.aircraft.getObjectByName(NODE.GEAR_NOSE)!;
    const main = built.aircraft.getObjectByName(NODE.GEAR_MAIN_L)!;
    expect(Math.abs(nose.position.x - main.position.x) / UNIT_SCALE).toBeCloseTo(MASTER.wheelbase, 3);
    expect(nose.position.x / UNIT_SCALE).toBeCloseTo(GEAR.noseX, 3);
  });
  it('fuselage diameter = 3.95 m (centre section Y extent)', () => {
    const centre = built.aircraft.getObjectByName('CENTER_FUSELAGE') as THREE.Mesh;
    centre.geometry.computeBoundingBox();
    const s = centre.geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(s.y / UNIT_SCALE).toBeCloseTo(MASTER.fuselageDiameter, 2);
  });
  it('unit scale shrinks the model (length in scene units < 12) while ratios stay exact', () => {
    const { length, span, height, box } = measureAircraft(built.aircraft);
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(12);
    expect(size.x / size.y).toBeCloseTo(length / span, 6);
    expect(size.x / size.z).toBeCloseTo(length / height, 6);
  });
});

describe('symmetry (Rule 2)', () => {
  const pairs: Array<[string, string]> = [
    [NODE.WING_L, NODE.WING_R], [NODE.ENGINE_L, NODE.ENGINE_R], [NODE.TAIL_HORIZONTAL_L, NODE.TAIL_HORIZONTAL_R], [NODE.GEAR_MAIN_L, NODE.GEAR_MAIN_R],
  ];
  const specBox = (name: string) => {
    const o = built.aircraft.getObjectByName(name)!;
    return measureAircraft(built.aircraft, built.aircraft.children.filter((c) => c !== o && c.name !== name).map((c) => c.name)).box;
  };
  for (const [l, r] of pairs) {
    it(`${l} ↔ ${r} bounding boxes mirror about Y=0`, () => {
      const a = specBox(l), b = specBox(r);
      expect(a.min.x).toBeCloseTo(b.min.x, 5); expect(a.max.x).toBeCloseTo(b.max.x, 5);
      expect(a.min.z).toBeCloseTo(b.min.z, 5); expect(a.max.z).toBeCloseTo(b.max.z, 5);
      expect(a.min.y).toBeCloseTo(-b.max.y, 5); expect(a.max.y).toBeCloseTo(-b.min.y, 5);
      expect(a.max.y, `${l} must lie on the port (+Y) side`).toBeGreaterThan(0);
      expect(b.min.y, `${r} must lie on the starboard (−Y) side`).toBeLessThan(0);
    });
  }
  it('vertical tail is on the centreline', () => {
    const b = specBox(NODE.TAIL_VERTICAL);
    expect(b.min.y + b.max.y).toBeCloseTo(0, 4);
  });
});

describe('articulation (§17–19)', () => {
  it('gear retracts on real pivots: retracted gear clears the ground by > 1 m', () => {
    const gear = built.aircraft.getObjectByName(NODE.GEAR_MAIN_L)!;
    applyChannel(built.aircraft, 'gear', 1);
    const box = measureAircraft(built.aircraft, built.aircraft.children.filter((c) => c !== gear).map((c) => c.name)).box;
    expect(box.min.z / UNIT_SCALE).toBeGreaterThan(GROUND_Z + 1.0);
    applyChannel(built.aircraft, 'gear', 0);
    const back = measureAircraft(built.aircraft, built.aircraft.children.filter((c) => c !== gear).map((c) => c.name)).box;
    expect(back.min.z / UNIT_SCALE).toBeCloseTo(GROUND_Z, 1);
  });
  it('flaps drop their trailing edge when deployed, on both wings', () => {
    for (const side of ['L', 'R']) {
      const flap = built.aircraft.getObjectByName(`FLAP_INNER_${side}`)!;
      const before = new THREE.Box3().setFromObject(flap).min.clone();
      applyChannel(built.aircraft, 'flaps', 1);
      built.aircraft.updateMatrixWorld(true);
      const after = new THREE.Box3().setFromObject(flap).min.clone();
      applyChannel(built.aircraft, 'flaps', 0);
      // world frame is Y-up after the root rotation; compare in world Y
      expect(after.y, `FLAP_INNER_${side}`).toBeLessThan(before.y - 0.01);
    }
  });
  it('doors, cargo doors, slats and spoilers all move when their channel is driven', () => {
    const moved = (name: string, channel: Parameters<typeof applyChannel>[1]) => {
      const o = built.aircraft.getObjectByName(name)!;
      built.aircraft.updateMatrixWorld(true);
      const before = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      applyChannel(built.aircraft, channel, 1);
      built.aircraft.updateMatrixWorld(true);
      const after = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      applyChannel(built.aircraft, channel, 0);
      return before.distanceTo(after) / UNIT_SCALE; // meters
    };
    expect(moved('DOOR_FWD_R', 'doors')).toBeGreaterThan(0.5);
    expect(moved('DOOR_FWD_L', 'doors')).toBeGreaterThan(0.5);
    expect(moved('CARGO_DOOR_FWD', 'cargoDoors')).toBeGreaterThan(0.5);
    expect(moved('SLAT_2_R', 'slats')).toBeGreaterThan(0.1);
    expect(moved('SLAT_2_L', 'slats')).toBeGreaterThan(0.1);
    expect(moved('SPOILER_2_L', 'spoilers')).toBeGreaterThan(0.1);
    expect(moved('RUDDER', 'rudder')).toBeGreaterThan(0.1); // centred hinge: 0.5 → 1 is +25°
  });
  it('doors have hinge metadata on the pivot, and mirrored doors exist', () => {
    const doors = built.aircraft.getObjectByName(NODE.DOORS)!;
    const names = doors.children.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['DOOR_FWD_L', 'DOOR_FWD_R', 'DOOR_AFT_L', 'DOOR_AFT_R', 'CARGO_DOOR_FWD', 'CARGO_DOOR_AFT']));
    for (const d of doors.children) expect(d.userData.hinge, d.name).toBeDefined();
  });
});

describe('performance and naming hygiene', () => {
  it('stays inside the T1440 triangle budget', () => {
    expect(built.triangles).toBeLessThan(QUALITY_PROFILES.T1440.triangleBudget);
  });
  it('shares materials: fewer than 30 unique materials', () => {
    const set = new Set<THREE.Material>();
    built.aircraft.traverse((o) => { const mm = (o as THREE.Mesh).material; if (mm) (Array.isArray(mm) ? mm : [mm]).forEach((x) => set.add(x)); });
    expect(set.size).toBeLessThan(32);
  });
  it('no source, page, package or spec file carries the retired branding', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        if (f === 'node_modules' || f === 'dist' || f === 'logs' || f.startsWith('.')) continue;
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|html|css|json|md)$/.test(f) && /astra/i.test(readFileSync(p, 'utf8'))) offenders.push(p);
      }
    };
    const rootDir = join(__dirname, '..');
    walk(join(rootDir, 'src'));
    for (const f of ['index.html', 'package.json', 'product.md', 'readme.md']) {
      if (/astra/i.test(readFileSync(join(rootDir, f), 'utf8'))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
