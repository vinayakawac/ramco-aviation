// Lighting presets for AIRCRAFT-001 realistic mode (product.md §24) plus the blueprint
// background. A procedural room environment gives the paint its reflections without
// any texture download.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { LightingPreset } from './AircraftState';
import type { QualityProfile } from '../core/quality';
import { createLogger } from '../core/logger';

interface Preset { sky: number; ground: number; sun: number; sunIntensity: number; ambient: number; sunDir: [number, number, number]; envIntensity: number; fog?: number }

const PRESETS: Record<LightingPreset, Preset> = {
  STUDIO:   { sky: 0x6f7b8a, ground: 0x9aa4ae, sun: 0xffffff, sunIntensity: 2.6, ambient: 0.35, sunDir: [3, 6, 4], envIntensity: 1.0 },
  DAYLIGHT: { sky: 0x5e97d6, ground: 0x7f8b99, sun: 0xfff4e0, sunIntensity: 3.2, ambient: 0.45, sunDir: [4, 8, 2], envIntensity: 1.1 },
  DUSK:     { sky: 0x3b3f6b, ground: 0x4a3a3a, sun: 0xffa060, sunIntensity: 1.8, ambient: 0.25, sunDir: [-6, 2, 3], envIntensity: 0.55, fog: 0x3b3f6b },
  NIGHT:    { sky: 0x070a14, ground: 0x0b0e18, sun: 0x8fa8ff, sunIntensity: 0.5, ambient: 0.12, sunDir: [2, 6, -3], envIntensity: 0.2, fog: 0x070a14 },
  AIRPORT:  { sky: 0x12161f, ground: 0x1a1d24, sun: 0xffe2b0, sunIntensity: 1.6, ambient: 0.2, sunDir: [-4, 5, -4], envIntensity: 0.35, fog: 0x12161f },
};

export class AircraftLighting {
  private sun: THREE.DirectionalLight;
  private fill: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private ground: THREE.Mesh;
  private log = createLogger('Lighting');
  private envMap: THREE.Texture;

  constructor(private scene: THREE.Scene, renderer: THREE.WebGLRenderer, quality: QualityProfile, groundY: number, groundRadius: number) {
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    const s = groundRadius * 1.1;
    // shadow frustum covers the aircraft (~40 m), not the whole ground disc
    const sh = Math.min(s, 30 * 0.25 * 1.6);
    Object.assign(this.sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, near: 0.1, far: groundRadius * 8 });
    this.fill = new THREE.DirectionalLight(0xffffff, 0.6);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    scene.add(this.sun, this.sun.target, this.fill, this.hemi);

    // ground disc receives the shadow; hidden in blueprint mode
    const g = new THREE.CircleGeometry(groundRadius, 64);
    g.rotateX(-Math.PI / 2);
    this.ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.95, metalness: 0 }));
    this.ground.position.y = groundY - 0.002;
    this.ground.receiveShadow = true;
    this.ground.name = 'GROUND';
    scene.add(this.ground);

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = this.envMap;
    this.apply('STUDIO');
  }

  apply(preset: LightingPreset): void {
    const p = PRESETS[preset];
    this.scene.background = new THREE.Color(p.sky);
    this.scene.fog = p.fog ? new THREE.Fog(p.fog, 40, 160) : null;
    this.sun.color.set(p.sun);
    this.sun.intensity = p.sunIntensity;
    this.sun.position.set(...p.sunDir).multiplyScalar(6);
    this.fill.position.set(-p.sunDir[0], p.sunDir[1] * 0.5, -p.sunDir[2]).multiplyScalar(6);
    this.fill.intensity = p.ambient * 1.2;
    this.hemi.color.set(p.sky);
    this.hemi.groundColor.set(p.ground);
    this.hemi.intensity = p.ambient;
    (this.ground.material as THREE.MeshStandardMaterial).color.set(p.ground);
    this.scene.environmentIntensity = p.envIntensity;
    this.ground.visible = true;
    this.log.info('preset', { preset });
  }

  /** Blueprint mode: dark engineering blue, no ground, flat environment. */
  applyBlueprint(): void {
    this.scene.background = new THREE.Color(0x0e2340);
    this.scene.fog = null;
    this.ground.visible = false;
    this.scene.environmentIntensity = 0.0;
    this.hemi.intensity = 0.9;
    this.sun.intensity = 0.8;
    this.log.info('preset', { preset: 'BLUEPRINT' });
  }

  get groundMesh(): THREE.Mesh { return this.ground; }
}
