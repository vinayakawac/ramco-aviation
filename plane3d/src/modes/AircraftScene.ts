// Renderer + scene shell for AIRCRAFT-001. Owns the WebGL renderer, resize handling
// and the quality tier (1080p / 1440p / 4K) that caps pixel ratio and shadow size.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { pickQualityTier, QUALITY_PROFILES, type QualityProfile } from '../core/quality';
import { createLogger } from '../core/logger';

export class AircraftScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly quality: QualityProfile;
  private log = createLogger('Scene');
  private resizeCb: Array<(w: number, h: number) => void> = [];

  constructor(readonly canvas: HTMLCanvasElement, qualityOverride?: string | null) {
    // a pane can report a zero-width window before its first layout; fall back to the screen
    const cssWidth = window.innerWidth > 100 ? window.innerWidth : window.screen.width;
    const tier = pickQualityTier(cssWidth, window.devicePixelRatio, qualityOverride);
    this.quality = QUALITY_PROFILES[tier];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true; // cutaway mode
    this.log.info('renderer ready', {
      tier, pixelRatio: this.renderer.getPixelRatio(), physicalWidth: Math.round(cssWidth * window.devicePixelRatio), shadowMap: this.quality.shadowMapSize,
    });
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  onResize(cb: (w: number, h: number) => void): void { this.resizeCb.push(cb); }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    for (const cb of this.resizeCb) cb(w, h);
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  /** PNG data URL of the current frame (used for canonical render captures). */
  snapshot(): string {
    return this.renderer.domElement.toDataURL('image/png');
  }

  /**
   * Deterministic offscreen render at a fixed pixel size, independent of the window.
   * Tone mapping and sRGB output are applied by an OutputPass so the PNG matches the
   * on-screen look. Used for the canonical view comparison sheets (product.md §22, §33).
   */
  renderToPNG(camera: THREE.Camera, width: number, height: number): string {
    const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.UnsignedByteType, samples: this.quality.antialias ? 4 : 0, depthBuffer: true });
    const composer = new EffectComposer(this.renderer, target);
    composer.renderToScreen = false;
    composer.setSize(width, height);
    composer.addPass(new RenderPass(this.scene, camera));
    composer.addPass(new OutputPass());
    // match the camera's aspect to the capture size, then restore it
    const aspect = width / height;
    let restore: () => void = () => undefined;
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pc = camera as THREE.PerspectiveCamera;
      const old = pc.aspect; pc.aspect = aspect; pc.updateProjectionMatrix();
      restore = () => { pc.aspect = old; pc.updateProjectionMatrix(); };
    } else if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      const oc = camera as THREE.OrthographicCamera;
      const { left, right } = oc;
      const halfH = (oc.top - oc.bottom) / 2;
      oc.left = -halfH * aspect; oc.right = halfH * aspect; oc.updateProjectionMatrix();
      restore = () => { oc.left = left; oc.right = right; oc.updateProjectionMatrix(); };
    }
    composer.render();
    restore();
    const pixels = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(composer.readBuffer, 0, 0, width, height, pixels);
    this.renderer.setRenderTarget(null);
    // WebGL rows are bottom-up; flip into a 2D canvas for PNG encoding
    const out = document.createElement('canvas');
    out.width = width; out.height = height;
    const ctx2d = out.getContext('2d')!;
    const img = ctx2d.createImageData(width, height);
    const row = width * 4;
    for (let y = 0; y < height; y++) img.data.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);
    ctx2d.putImageData(img, 0, 0);
    composer.dispose();
    target.dispose();
    return out.toDataURL('image/png');
  }
}
