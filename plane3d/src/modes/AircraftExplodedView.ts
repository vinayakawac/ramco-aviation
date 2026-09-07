// Exploded view (product.md §26): each top-level component eases toward the
// deterministic offset stored in userData.explodedOffset by the builder.
import * as THREE from 'three';
import { createLogger } from '../core/logger';

export class AircraftExplodedView {
  private t = 0;
  private target = 0;
  private log = createLogger('Exploded');

  constructor(private aircraft: THREE.Object3D) {}

  set(exploded: boolean): void {
    this.target = exploded ? 1 : 0;
    this.log.info('exploded', { exploded });
  }

  /** Advance the transition; returns true while moving. */
  update(dt: number): boolean {
    if (Math.abs(this.target - this.t) < 1e-4) return false;
    this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt / 1.2);
    const k = this.t < 0.5 ? 2 * this.t * this.t : 1 - Math.pow(-2 * this.t + 2, 2) / 2;
    for (const c of this.aircraft.children) {
      const off = c.userData.explodedOffset as number[] | undefined;
      const rest = c.userData.restPosition as number[] | undefined;
      if (!off || !rest) continue;
      c.position.set(rest[0] + off[0] * k, rest[1] + off[1] * k, rest[2] + off[2] * k);
    }
    return true;
  }

  get fraction(): number { return this.t; }
}
