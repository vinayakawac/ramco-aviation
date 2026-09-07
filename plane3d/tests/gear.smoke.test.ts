// Smoke tests for LandingGear.ts (product.md §17-19, §32, §51 Definition of Done).
// Verifies: names, ground contact when extended, lateral placement of the main leg,
// and that the 'gear' animation channel actually lifts the gear into the belly.
// Uses PartContext's declarative hinge API (setHinge/applyChannel) rather than a
// closure-based registerAnim — that contract changed mid-implementation (see
// LandingGear.ts's top-of-file note) and this test targets the current one.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createMaterials } from '../src/aircraft/AircraftMaterials';
import { QUALITY_PROFILES } from '../src/core/quality';
import { createLogger } from '../src/core/logger';
import { m, GEAR, GROUND_Z } from '../src/aircraft/AircraftSpec';
import { applyChannel, type PartContext } from '../src/aircraft/parts/PartContext';
import { buildNoseGear, buildMainGearRight } from '../src/aircraft/parts/LandingGear';

function makeCtx(): PartContext {
  return { mat: createMaterials(), quality: QUALITY_PROFILES.T1440, m, log: createLogger('test') };
}

function worldBox(obj: THREE.Object3D): THREE.Box3 {
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

describe('LandingGear', () => {
  it('nose gear: name, ground contact, and retraction lift', () => {
    const ctx = makeCtx();
    const nose = buildNoseGear(ctx);
    expect(nose.name).toBe('GEAR_NOSE');

    const extendedBox = worldBox(nose);
    expect(extendedBox.min.z).toBeCloseTo(m(GROUND_Z), 1);
    expect(Math.abs(extendedBox.min.z - m(GROUND_Z))).toBeLessThan(m(0.02) + 1e-6);

    expect(nose.userData.hinge).toBeDefined();
    expect(nose.userData.hinge.channel).toBe('gear');
    applyChannel(nose, 'gear', 1);
    const retractedBox = worldBox(nose);
    expect(retractedBox.min.z).toBeGreaterThan(m(GROUND_Z + 1.0));
  });

  it('main gear left: name, ground contact, lateral placement, and retraction lift', () => {
    const ctx = makeCtx();
    const main = buildMainGearRight(ctx);
    expect(main.name).toBe('GEAR_MAIN_R');

    const extendedBox = worldBox(main);
    expect(Math.abs(extendedBox.min.z - m(GROUND_Z))).toBeLessThan(m(0.02) + 1e-6);

    const centerY = (extendedBox.min.y + extendedBox.max.y) / 2;
    expect(Math.abs(centerY - -m(GEAR.mainY))).toBeLessThan(m(0.4));

    expect(main.userData.hinge).toBeDefined();
    expect(main.userData.hinge.channel).toBe('gear');
    applyChannel(main, 'gear', 1);
    const retractedBox = worldBox(main);
    expect(retractedBox.min.z).toBeGreaterThan(m(GROUND_Z + 1.0));
  });
});
