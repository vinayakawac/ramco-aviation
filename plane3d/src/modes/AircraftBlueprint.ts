// Blueprint mode (product.md §23, §42): the SAME meshes rendered as thin light technical
// lines on engineering blue, with edge overlays and dimension guides derived from the
// measured model. Toggling only swaps materials and adds/removes overlay objects.
import * as THREE from 'three';
import { MASTER, UNIT_SCALE } from '../aircraft/AircraftSpec';
import { createLogger } from '../core/logger';

export class AircraftBlueprint {
  private saved = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private edges = new THREE.Group();
  private dims = new THREE.Group();
  private faceMat: THREE.MeshBasicMaterial;
  private lineMat: THREE.LineBasicMaterial;
  private dimMat: THREE.LineBasicMaterial;
  private log = createLogger('Blueprint');
  enabled = false;

  constructor(private aircraft: THREE.Object3D, private overlayParent: THREE.Object3D) {
    // faces slightly lighter than the background so smooth silhouettes (fuselage) still read
    this.faceMat = new THREE.MeshBasicMaterial({ color: 0x1a3768, transparent: true, opacity: 0.8, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, name: 'BlueprintFace' });
    this.lineMat = new THREE.LineBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.85, name: 'BlueprintLine' });
    this.dimMat = new THREE.LineBasicMaterial({ color: 0x7fd0ff, name: 'BlueprintDim' });
    this.edges.name = 'BLUEPRINT_EDGES';
    this.dims.name = 'BLUEPRINT_DIMENSIONS';
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.aircraft.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      this.saved.set(mesh, mesh.material);
      mesh.material = this.faceMat;
      // edge overlay follows the mesh's world transform each frame via matrixWorld sharing
      if ((mesh as unknown as THREE.InstancedMesh).isInstancedMesh) return; // windows: faces only
      const eg = new THREE.EdgesGeometry(mesh.geometry, 28);
      const lines = new THREE.LineSegments(eg, this.lineMat);
      lines.name = `EDGES_${mesh.name}`;
      lines.matrixAutoUpdate = false;
      lines.matrixWorldAutoUpdate = false; // we copy the mesh's world matrix each frame
      lines.userData.follow = mesh;
      this.edges.add(lines);
    });
    this.buildDimensions();
    this.overlayParent.add(this.edges, this.dims);
    this.log.info('enabled', { edgeSets: this.edges.children.length });
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    for (const [mesh, mat] of this.saved) mesh.material = mat;
    this.saved.clear();
    for (const l of this.edges.children as THREE.LineSegments[]) l.geometry.dispose();
    this.edges.clear();
    this.dims.clear();
    this.overlayParent.remove(this.edges, this.dims);
    this.log.info('disabled');
  }

  /** Keep edge overlays glued to their (possibly animating) meshes. */
  update(): void {
    if (!this.enabled) return;
    for (const l of this.edges.children) {
      const follow = l.userData.follow as THREE.Mesh;
      l.matrixWorld.copy(follow.matrixWorld);
      l.visible = follow.visible && isVisibleChain(follow);
    }
  }

  /** Dimension guides in world space from the actual bounding box (length, span, height). */
  private buildDimensions(): void {
    this.dims.clear();
    const box = new THREE.Box3().setFromObject(this.aircraft);
    const min = box.min, max = box.max;
    const pad = 0.35;
    const add = (pts: THREE.Vector3[]) => this.dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.dimMat));
    // length along world X, drawn below the aircraft
    add([new THREE.Vector3(min.x, min.y - pad, max.z + pad), new THREE.Vector3(max.x, min.y - pad, max.z + pad)]);
    add([new THREE.Vector3(min.x, min.y - pad * 0.6, max.z + pad), new THREE.Vector3(min.x, min.y - pad * 1.4, max.z + pad)]);
    add([new THREE.Vector3(max.x, min.y - pad * 0.6, max.z + pad), new THREE.Vector3(max.x, min.y - pad * 1.4, max.z + pad)]);
    // span along world Z, drawn ahead of the nose
    add([new THREE.Vector3(max.x + pad, min.y - pad, min.z), new THREE.Vector3(max.x + pad, min.y - pad, max.z)]);
    // height along world Y, drawn behind the tail
    add([new THREE.Vector3(min.x - pad, min.y, max.z + pad), new THREE.Vector3(min.x - pad, max.y, max.z + pad)]);
    // reference axes at the origin (nose datum)
    const o = this.aircraft.getWorldPosition(new THREE.Vector3());
    add([o, o.clone().add(new THREE.Vector3(1, 0, 0))]);
    add([o, o.clone().add(new THREE.Vector3(0, 1, 0))]);
    add([o, o.clone().add(new THREE.Vector3(0, 0, -1))]);
    this.dims.userData.readout = {
      length: `${((max.x - min.x) / UNIT_SCALE).toFixed(2)} m (spec ${MASTER.length})`,
      span: `${((max.z - min.z) / UNIT_SCALE).toFixed(2)} m (spec ${MASTER.wingspan})`,
      height: `${((max.y - min.y) / UNIT_SCALE).toFixed(2)} m (spec ${MASTER.height})`,
    };
  }

  get readout(): Record<string, string> | undefined { return this.dims.userData.readout; }
}

function isVisibleChain(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o;
  while (p) { if (!p.visible) return false; p = p.parent; }
  return true;
}
