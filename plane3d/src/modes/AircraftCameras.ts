// Canonical cameras for AIRCRAFT-001 (product.md §21–22). Every view is derived from
// the aircraft's spec frame (azimuth about the vertical axis, elevation) and framed
// from the measured bounding box, so the cameras never drift from the model.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CANONICAL_VIEWS, type CanonicalView } from '../aircraft/AircraftSpec';
import { DEG } from '../core/geometry';
import { createLogger } from '../core/logger';

export class AircraftCameras {
  readonly perspective: THREE.PerspectiveCamera;
  readonly orthographic: THREE.OrthographicCamera;
  readonly controls: OrbitControls;
  private active: THREE.Camera;
  private log = createLogger('Cameras');
  private centre = new THREE.Vector3();
  private radius = 1;
  private worldBox = new THREE.Box3();
  private flight: { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; ortho: boolean } | null = null;

  constructor(private root: THREE.Object3D, domElement: HTMLElement, aspect: number) {
    this.perspective = new THREE.PerspectiveCamera(35, aspect, 0.05, 500);
    this.orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 500);
    this.active = this.perspective;
    this.controls = new OrbitControls(this.perspective, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.98;
    this.refit();
  }

  get camera(): THREE.Camera { return this.active; }

  /** Recompute the framing sphere from the current world-space bounds (call after geometry changes). */
  refit(): void {
    this.root.updateMatrixWorld(true);
    this.worldBox.setFromObject(this.root);
    this.worldBox.getCenter(this.centre);
    this.radius = this.worldBox.getSize(new THREE.Vector3()).length() / 2;
    this.controls.target.copy(this.centre);
    this.controls.minDistance = this.radius * 0.15;
    this.controls.maxDistance = this.radius * 8;
  }

  setAspect(aspect: number): void {
    this.perspective.aspect = aspect;
    this.perspective.updateProjectionMatrix();
    this.updateOrtho(aspect);
  }

  private updateOrtho(aspect: number): void {
    const h = this.radius * 0.62; // sphere radius over-estimates the visible extent
    this.orthographic.left = -h * aspect; this.orthographic.right = h * aspect;
    this.orthographic.top = h; this.orthographic.bottom = -h;
    this.orthographic.updateProjectionMatrix();
  }

  /**
   * World-space direction for a spec-frame azimuth/elevation. Spec: +X forward, +Y port, +Z up.
   * World (Y-up) after the root rotation: forward = +X, up = +Y, port = −Z.
   * Azimuth 0 = camera ahead of the nose, +90 = camera on the port side.
   */
  private direction(azDeg: number, elDeg: number): THREE.Vector3 {
    const az = azDeg * DEG, el = elDeg * DEG;
    // spec frame direction from centre toward camera
    const spec = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el));
    // spec (x, y, z) → world (x, z, −y)
    return new THREE.Vector3(spec.x, spec.z, -spec.y).normalize();
  }

  /** Fly to a canonical view. Orthographic views switch camera type. */
  goTo(view: CanonicalView, animate = true): void {
    const def = CANONICAL_VIEWS[view];
    const dir = this.direction(def.az, def.el);
    // the bounding sphere over-estimates the visible extent; 0.62 fills the frame without clipping
    const dist = def.ortho ? this.radius * 3 : (this.radius / Math.sin((this.perspective.fov / 2) * DEG)) * 0.62;
    const to = this.centre.clone().add(dir.multiplyScalar(dist));
    this.log.info('view', { view, ortho: def.ortho });
    if (def.ortho) {
      this.active = this.orthographic;
      this.updateOrtho(this.perspective.aspect);
    } else {
      this.active = this.perspective;
    }
    this.controls.object = this.active as THREE.PerspectiveCamera;
    this.active.up.set(0, 1, 0);
    // top/bottom views need a stable up vector: look along the fuselage
    if (view === 'TOP' || view === 'BOTTOM') this.active.up.set(1, 0, 0);
    if (!animate) {
      this.active.position.copy(to);
      this.controls.target.copy(this.centre);
      this.controls.update();
      return;
    }
    this.flight = { from: this.active.position.clone(), to, t: 0, dur: 0.9, ortho: def.ortho };
  }

  /** Per-frame update; returns true while a flight is in progress. */
  update(dt: number): boolean {
    if (this.flight) {
      const f = this.flight;
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = f.t < 0.5 ? 4 * f.t ** 3 : 1 - Math.pow(-2 * f.t + 2, 3) / 2;
      this.active.position.lerpVectors(f.from, f.to, k);
      this.controls.target.copy(this.centre);
      if (f.t >= 1) this.flight = null;
      this.controls.update();
      return true;
    }
    this.controls.update();
    return false;
  }

  /** Called when the user drags: leave canonical mode. */
  onUserInteraction(cb: () => void): void {
    this.controls.addEventListener('start', cb);
  }
}
