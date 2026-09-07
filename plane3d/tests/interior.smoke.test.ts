// Smoke test for the Interior part builder (src/aircraft/interior/Interior.ts).
// Validates the returned group's name, that the passenger seat instance count hits
// MASTER.seating (180), that every non-instanced mesh's world-space vertices stay
// inside the constant-radius fuselage cylinder bound (product.md's simplified
// containment volume for the interior), and the overall triangle budget.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildInterior } from '../src/aircraft/interior/Interior';
import { CABIN, FUSELAGE, MASTER, m } from '../src/aircraft/AircraftSpec';
import { createMaterials } from '../src/aircraft/AircraftMaterials';
import { QUALITY_PROFILES } from '../src/core/quality';
import { createLogger } from '../src/core/logger';
import { countTriangles } from '../src/core/geometry';
import type { PartContext } from '../src/aircraft/parts/PartContext';

describe('buildInterior', () => {
  const ctx: PartContext = {
    mat: createMaterials(),
    quality: QUALITY_PROFILES.T1440,
    m,
    log: createLogger('test'),
  };

  const root = buildInterior(ctx);
  root.updateMatrixWorld(true);

  it('is named INTERIOR', () => {
    expect(root.name).toBe('INTERIOR');
  });

  it('has exactly 180 passenger seats (sum of SEAT_CUSHION instance counts)', () => {
    let total = 0;
    root.traverse((o) => {
      const inst = o as unknown as THREE.InstancedMesh;
      if (inst.isInstancedMesh && o.name === 'SEAT_CUSHION') total += inst.count;
    });
    expect(total).toBe(MASTER.seating); // 180
  });

  it('keeps every non-instanced mesh vertex inside the fuselage cylinder bound', () => {
    const radiusBound = m(FUSELAGE.radius) + 1e-3;
    const xMin = m(CABIN.endX) - 1e-3;
    const xMax = m(CABIN.cockpit.startX) + 1e-3;

    let checked = 0;
    const v = new THREE.Vector3();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const inst = o as unknown as THREE.InstancedMesh;
      if (inst.isInstancedMesh) return; // instanced seats are excluded per task spec

      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        const radial = Math.sqrt(v.y * v.y + v.z * v.z);
        expect(radial).toBeLessThanOrEqual(radiusBound);
        expect(v.x).toBeGreaterThanOrEqual(xMin);
        expect(v.x).toBeLessThanOrEqual(xMax);
        checked++;
      }
    });
    expect(checked).toBeGreaterThan(0);
  });

  it('stays under the 40,000 triangle budget', () => {
    const triangles = countTriangles(root);
    expect(triangles).toBeLessThan(40_000);
  });
});
