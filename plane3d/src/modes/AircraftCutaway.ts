// Cutaway mode (product.md §41): one vertical clipping plane parallel to the fuselage
// axis removes the port-side SKIN (fuselage shell, windows, cabin shells) so the cabin is
// visible in place while wings, engines and gear stay whole. `depth` 0..1 slides the plane
// from the port skin (nothing cut) past the centreline. No second aircraft exists.
import * as THREE from 'three';
import { FUSELAGE, UNIT_SCALE } from '../aircraft/AircraftSpec';
import type { MaterialSet } from '../aircraft/AircraftMaterials';
import { createLogger } from '../core/logger';

export class AircraftCutaway {
  /** World frame: spec +Y (port) maps to world −Z. Points with z < −constant are clipped. */
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private log = createLogger('Cutaway');
  private applied = false;

  constructor(private materials: MaterialSet) {}

  /** Materials that belong to the shell being cut open. */
  private clipped(): THREE.Material[] {
    const m = this.materials;
    return [m.paintSkin, m.windowGlass, m.cabinPlastic, m.carpet];
  }

  enable(depth: number): void {
    for (const m of this.clipped()) {
      m.clippingPlanes = [this.plane];
      m.clipShadows = true;
      m.side = THREE.DoubleSide; // show the inside face of the skin at the cut
      m.needsUpdate = true;
    }
    this.applied = true;
    this.setDepth(depth);
    this.log.info('enabled', { depth });
  }

  setDepth(depth: number): void {
    const r = FUSELAGE.radius * UNIT_SCALE;
    // depth 0 → plane at the port skin (+r), depth 1 → 0.35 r past the centreline
    this.plane.constant = r * (1 - 1.35 * THREE.MathUtils.clamp(depth, 0, 1));
  }

  disable(): void {
    if (!this.applied) return;
    for (const m of this.clipped()) {
      m.clippingPlanes = [];
      m.clipShadows = false;
      m.side = THREE.FrontSide;
      m.needsUpdate = true;
    }
    this.applied = false;
    this.log.info('disabled');
  }
}
