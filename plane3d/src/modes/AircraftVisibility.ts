// Visibility layers (product.md §38): EXTERIOR_ONLY / INTERIOR / CUTAWAY / FULL are
// show-hide and opacity states over the same hierarchy.
import * as THREE from 'three';
import { NODE } from '../aircraft/AircraftSpec';
import type { MaterialSet } from '../aircraft/AircraftMaterials';
import type { VisibilityState } from './AircraftState';
import { createLogger } from '../core/logger';

const SKIN_NODES = ['RADOME', 'FORWARD_FUSELAGE', 'CENTER_FUSELAGE', 'AFT_FUSELAGE', 'BELLY_FAIRING'];

export class AircraftVisibility {
  private log = createLogger('Visibility');
  private ghostSkin: THREE.MeshPhysicalMaterial;
  private ghostCabin: THREE.MeshStandardMaterial;
  private ghosted: THREE.Mesh[] = [];
  private ghostedCabin: THREE.Mesh[] = [];

  constructor(private aircraft: THREE.Object3D, materials: MaterialSet) {
    this.ghostSkin = materials.paintSkin.clone();
    this.ghostSkin.transparent = true;
    this.ghostSkin.opacity = 0.22;
    this.ghostSkin.depthWrite = false;
    this.ghostSkin.side = THREE.DoubleSide;
    this.ghostSkin.name = 'AircraftPaint_Ghost';
    // cabin ceiling, sidewalls and bins would otherwise hide the seats in INTERIOR mode
    this.ghostCabin = materials.cabinPlastic.clone();
    this.ghostCabin.transparent = true;
    this.ghostCabin.opacity = 0.3;
    this.ghostCabin.depthWrite = false;
    this.ghostCabin.side = THREE.DoubleSide;
    this.ghostCabin.name = 'CabinPlastic_Ghost';
  }

  apply(state: VisibilityState, materials: MaterialSet): void {
    const interior = this.aircraft.getObjectByName(NODE.INTERIOR);
    if (interior) interior.visible = state !== 'EXTERIOR_ONLY';
    // restore any ghosted skins first
    for (const m of this.ghosted) m.material = materials.paintSkin;
    for (const m of this.ghostedCabin) m.material = materials.cabinPlastic;
    this.ghosted = [];
    this.ghostedCabin = [];
    if (state === 'INTERIOR') {
      for (const n of SKIN_NODES) {
        const mesh = this.aircraft.getObjectByName(n) as THREE.Mesh | undefined;
        if (mesh) { mesh.material = this.ghostSkin; this.ghosted.push(mesh); }
      }
      interior?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.material === materials.cabinPlastic) { mesh.material = this.ghostCabin; this.ghostedCabin.push(mesh); }
      });
    }
    this.log.info('visibility', { state, interior: interior?.visible ?? false });
  }
}
