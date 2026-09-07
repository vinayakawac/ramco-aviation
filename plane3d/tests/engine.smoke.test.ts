// Smoke test for the Engine part builder (src/aircraft/parts/Engine.ts).
// Validates the returned group's name, gross bounding-box dimensions in scene
// units, its lateral placement, and the triangle budget from product.md/task spec.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildEngineRight } from '../src/aircraft/parts/Engine';
import { ENGINE, m } from '../src/aircraft/AircraftSpec';
import { createMaterials } from '../src/aircraft/AircraftMaterials';
import { QUALITY_PROFILES } from '../src/core/quality';
import { createLogger } from '../src/core/logger';
import { countTriangles } from '../src/core/geometry';
import type { PartContext } from '../src/aircraft/parts/PartContext';

describe('buildEngineRight', () => {
  const ctx: PartContext = {
    mat: createMaterials(),
    quality: QUALITY_PROFILES.T1440,
    m,
    log: createLogger('test'),
  };

  it('builds a correctly named, positioned, and budgeted ENGINE_R group', () => {
    const group = buildEngineRight(ctx);
    expect(group.name).toBe('ENGINE_R');

    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Overall length ~= nacelle + core (plus a small exhaust nozzle overhang),
    // so allow generous (20%) tolerance rather than an exact match.
    const expectedLength = m(ENGINE.nacelleLength + ENGINE.coreLength);
    expect(size.x).toBeGreaterThan(expectedLength * 0.8);
    expect(size.x).toBeLessThan(expectedLength * 1.2);

    // Centred laterally on the left engine station within 0.3 spec-meters.
    expect(Math.abs(center.y - -m(ENGINE.y))).toBeLessThan(m(0.3));

    const triangles = countTriangles(group);
    expect(triangles).toBeLessThan(9000);
  });
});
