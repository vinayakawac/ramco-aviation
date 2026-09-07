// Click-to-select components (product.md §39–40). Raycasts the aircraft, walks up to
// the nearest node carrying component metadata, highlights it with an emissive overlay
// material and reports the metadata to the UI. The rest of the aircraft stays visible.
import * as THREE from 'three';
import type { ComponentMeta } from '../aircraft/AircraftSpec';
import { createLogger } from '../core/logger';

export interface SelectionInfo extends ComponentMeta { node: THREE.Object3D }

export class AircraftSelection {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private highlighted: Array<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }> = [];
  private highlightMat: THREE.MeshStandardMaterial;
  private log = createLogger('Selection');
  private downAt: { x: number; y: number } | null = null;

  constructor(private aircraft: THREE.Object3D, private dom: HTMLElement, private getCamera: () => THREE.Camera, private onSelect: (info: SelectionInfo | null) => void) {
    this.highlightMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff8a00, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.2, name: 'Highlight' });
    dom.addEventListener('pointerdown', (e) => { this.downAt = { x: e.clientX, y: e.clientY }; });
    dom.addEventListener('pointerup', (e) => this.onPointerUp(e));
  }

  /** Find the metadata-bearing ancestor for a hit object. */
  static resolve(obj: THREE.Object3D, stopAt: THREE.Object3D): THREE.Object3D | null {
    let p: THREE.Object3D | null = obj;
    while (p && p !== stopAt) {
      if (p.userData.component && p.userData.selectable !== false) return p;
      p = p.parent;
    }
    return null;
  }

  private onPointerUp(e: PointerEvent): void {
    // ignore drags (orbit) — only treat short clicks as selection
    if (!this.downAt || Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 6) return;
    const r = this.dom.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.getCamera());
    const hits = this.raycaster.intersectObject(this.aircraft, true).filter((h) => h.object.visible && isVisibleChain(h.object));
    const target = hits.length ? AircraftSelection.resolve(hits[0].object, this.aircraft) : null;
    this.select(target);
  }

  select(target: THREE.Object3D | null): void {
    this.clear();
    if (!target) { this.onSelect(null); return; }
    // highlight the whole component subtree (a pivot group or a mesh)
    target.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { this.highlighted.push({ mesh, material: mesh.material }); mesh.material = this.highlightMat; }
    });
    const ud = target.userData as ComponentMeta;
    this.log.info('selected', { component: ud.component, system: ud.system });
    this.onSelect({ ...ud, node: target });
  }

  /** Select by component id (used by the systems list / URL). */
  selectByComponent(component: string): void {
    let found: THREE.Object3D | null = null;
    this.aircraft.traverse((o) => { if (!found && o.userData.component === component && o.userData.selectable !== false && !(o as THREE.Mesh).isMesh) found = o; });
    if (!found) this.aircraft.traverse((o) => { if (!found && o.userData.component === component) found = o; });
    this.select(found);
  }

  clear(): void {
    for (const h of this.highlighted) h.mesh.material = h.material;
    this.highlighted = [];
  }

  /** Re-apply highlight materials after a render-mode swap replaced materials. */
  reapply(): void {
    for (const h of this.highlighted) h.mesh.material = this.highlightMat;
  }
}

function isVisibleChain(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o;
  while (p) { if (!p.visible) return false; p = p.parent; }
  return true;
}
