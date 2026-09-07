// System visualisation (product.md §25): selecting a system dims everything else and
// tints the meshes whose metadata belongs to that system. Purely a material layer over
// the one mesh hierarchy; nothing is duplicated.
import * as THREE from 'three';
import { SYSTEMS, type SystemId } from '../aircraft/AircraftSpec';
import { createLogger } from '../core/logger';

export class AircraftSystems {
  private saved = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private tint: THREE.MeshStandardMaterial;
  private ghost: THREE.MeshStandardMaterial;
  private log = createLogger('Systems');
  active: SystemId | null = null;

  constructor(private aircraft: THREE.Object3D) {
    this.tint = new THREE.MeshStandardMaterial({ color: 0x1fa8ff, emissive: 0x0d6fbf, emissiveIntensity: 0.5, roughness: 0.45, name: 'SystemTint' });
    this.ghost = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.9, name: 'SystemGhost' });
  }

  /** Resolve the system of a mesh from itself or its nearest metadata-bearing ancestor. */
  static systemOf(o: THREE.Object3D, stopAt: THREE.Object3D): SystemId | null {
    let p: THREE.Object3D | null = o;
    while (p && p !== stopAt) { if (p.userData.system) return p.userData.system as SystemId; p = p.parent; }
    return null;
  }

  apply(system: SystemId | null): void {
    this.clear();
    this.active = system;
    if (!system) return;
    let count = 0;
    this.aircraft.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const sys = AircraftSystems.systemOf(o, this.aircraft);
      this.saved.set(mesh, mesh.material);
      if (sys === system) { mesh.material = this.tint; count++; } else mesh.material = this.ghost;
    });
    this.log.info('system', { system, label: SYSTEMS[system].label, meshes: count });
  }

  clear(): void {
    for (const [mesh, mat] of this.saved) mesh.material = mat;
    this.saved.clear();
    this.active = null;
  }

  /** Materials were swapped underneath us (render mode change): rebuild the overlay. */
  refresh(): void { const s = this.active; this.clear(); this.apply(s); }
}
