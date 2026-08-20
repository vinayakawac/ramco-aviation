/**
 * stage.js — a product-shot stage: one aircraft, studio lighting, no environment.
 *
 * Unlike a walkthrough, nothing here is a place. The airframe floats in a warm void and
 * the camera orbits it on a rig, so scroll reads as turning the object in your hands.
 * A hangar-lit opening state crossfades into that void as the first chapter ends.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadAirframe, DEFAULT_AIRFRAME } from './airframeModel.js';

const VOID = 0x17110e;
const HANGAR_TONE = 0x2b2019;

const lerp = THREE.MathUtils.lerp;

export class Stage {
  /** @param {THREE.WebGLRenderer} renderer needed to prefilter the environment map */
  constructor(renderer) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(HANGAR_TONE);

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.5, 3000);

    /* --- the subject --- */
    this.aircraft = new THREE.Group();
    this.aircraft.name = 'aircraft';
    this.aircraft.position.set(0, 0, 0);

    this.pivot = new THREE.Group();
    this.pivot.add(this.aircraft);
    this.scene.add(this.pivot);

    // Load the high-fidelity airframe model directly
    this.loadAirframe();

    this._lights();
    this._environment(renderer);

    this._target = new THREE.Vector3();
    this._focus = new THREE.Vector3();
    this.pose = { yaw: 0, pitch: 0, roll: 0, dist: 60, height: 6, side: 0, tilt: 0, drop: 0, shiftX: 0, shiftY: 0, focus: [0, 0, 0], dark: 0 };
    this.landmarks = null;
    this.bias = 0;
    this.viewW = 1;
    this.viewH = 1;
  }

  /**
   * Load and mount the A320 airframe cleanly.
   */
  async loadAirframe(key = DEFAULT_AIRFRAME) {
    try {
      const shell = await loadAirframe(key, 38);
      // Ensure aircraft group is completely empty before adding
      while (this.aircraft.children.length > 0) {
        const obj = this.aircraft.children[0];
        this.aircraft.remove(obj);
        obj.traverse?.((o) => {
          o.geometry?.dispose();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
            else o.material.dispose();
          }
        });
      }
      this.aircraft.add(shell);
      this.aircraft.userData.airframe = shell;
      // Measured feature positions, for the callouts to anchor against.
      this.landmarks = shell.userData.landmarks ?? null;
      this.modelLoaded = true;
      return true;
    } catch (err) {
      console.error('[ramco-oryzo] airframe model failed to load', err);
      return false;
    }
  }

  /**
   * Three ships a procedural studio interior — no asset to download, no licence to
   * track — and prefiltering it gives the skin and the polished metal something real
   * to reflect. Without it the airframe reads as a flat tan cut-out.
   */
  _environment(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = env.texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
  }

  _lights() {
    const s = this.scene;

    // Warm key from high front-left — the amber rim the whole palette is built around.
    this.key = new THREE.DirectionalLight(0xffcb92, 3.2);
    this.key.position.set(-60, 55, 70);
    s.add(this.key);

    // Cool fill so the shadow side doesn't go dead.
    this.fill = new THREE.DirectionalLight(0x9fc4d8, 0.85);
    this.fill.position.set(70, 20, -40);
    s.add(this.fill);

    // Hard rim from behind, which is what separates the airframe from the void.
    this.rim = new THREE.DirectionalLight(0xffd9a8, 2.4);
    this.rim.position.set(30, 12, -90);
    s.add(this.rim);

    this.ambient = new THREE.HemisphereLight(0xcfa578, 0x1b1410, 0.5);
    s.add(this.ambient);
  }

  /** Blend toward a beat pose. `k` is the eased progress between two beats. */
  applyPose(a, b, k) {
    const p = this.pose;
    p.yaw = lerp(a.yaw, b.yaw, k);
    p.pitch = lerp(a.pitch, b.pitch, k);
    p.roll = lerp(a.roll ?? 0, b.roll ?? 0, k);
    p.dist = lerp(a.dist, b.dist, k);
    p.height = lerp(a.height, b.height, k);
    p.dark = lerp(a.dark, b.dark, k);
    p.drop = lerp(a.drop ?? 0, b.drop ?? 0, k);
    p.shiftX = lerp(a.shiftX ?? 0, b.shiftX ?? 0, k);
    p.shiftY = lerp(a.shiftY ?? 0, b.shiftY ?? 0, k);
    p.side = lerp(a.side ?? 0, b.side ?? 0, k);
    p.tilt = lerp(a.tilt ?? 0, b.tilt ?? 0, k);

    const aFocus = a.focus ?? [0, 0, 0];
    const bFocus = b.focus ?? [0, 0, 0];
    this._focus.set(
      lerp(aFocus[0], bFocus[0], k),
      lerp(aFocus[1], bFocus[1], k),
      lerp(aFocus[2], bFocus[2], k)
    );

    // Turn the subject: yaw on pivot rig, pitch & roll on aircraft
    this.pivot.rotation.y = p.yaw;
    this.aircraft.rotation.x = p.pitch;
    this.aircraft.rotation.z = p.roll;

    // Recalculate transform matrix for accurate focal point targeting
    this.pivot.updateMatrixWorld(true);
    this.aircraft.updateMatrixWorld(true);

    const worldFocus = this._focus.clone();
    this.aircraft.localToWorld(worldFocus);

    // Narrow viewports put the copy over the whole frame, so the subject stands off
    // further and sits lower — present as atmosphere rather than competing with text.
    const narrow = this.viewW < 760;
    const dist = narrow ? p.dist * 1.45 : p.dist;
    const height = narrow ? p.height * 0.7 + 2 : p.height;

    // The rig is an orbit about the focused feature: the subject's own yaw/pitch/roll do
    // the turning, so the camera only has to stand off along +Z, rise by `height`, and
    // step sideways by `side`. It then looks *at* the feature — which is the whole point
    // of `focus`, and what makes a nose shot frame the nose rather than the fuselage.
    this.camera.position.set(
      worldFocus.x + (p.side ?? 0),
      worldFocus.y + height,
      worldFocus.z + dist
    );

    // `tilt` lets a shot aim slightly past the feature (positive = look higher up), which
    // is how you keep a tall subject like the fin off the top edge without moving the rig.
    this._target.set(worldFocus.x, worldFocus.y + (p.tilt ?? 0), worldFocus.z);
    this.camera.lookAt(this._target);

    // Environment fade: hangar tone → void.
    this.scene.background.setHex(HANGAR_TONE).lerp(new THREE.Color(VOID), p.dark);
    this.ambient.intensity = lerp(0.85, 0.42, p.dark);
    this.fill.intensity = lerp(1.5, 0.7, p.dark);
    this.rim.intensity = lerp(1.1, 2.6, p.dark);
    this.scene.environmentIntensity = lerp(0.75, 0.4, p.dark);

    this._applyBias();
  }

  /**
   * Push the subject off-centre so the text columns get clean space.
   * shiftX shifts the aircraft rightward in screen space into the open right corridor.
   */
  _applyBias() {
    const w = this.viewW;
    const h = this.viewH;
    if (w < 1080) {
      if (this.camera.view?.enabled) this.camera.clearViewOffset();
      return;
    }
    const shiftXPixels = (this.pose.shiftX ?? 0) * w;
    const shiftYPixels = (this.pose.shiftY ?? 0) * h;
    this.camera.setViewOffset(w, h, -shiftXPixels, -shiftYPixels - h * 0.04, w, h);
  }

  /** Idle drift, so a paused page still breathes. */
  tick(t) {
    const sink = this.viewW < 760 ? -10 : 0;
    this.pivot.position.y = (this.pose.drop ?? 0) + sink + Math.sin(t * 0.6) * 0.6;
  }

  resize(w, h) {
    this.viewW = w;
    this.viewH = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Project a 3D point in aircraft local coordinate space into 2D viewport pixel coordinates.
   * @param {[number, number, number]} localPos
   * @returns {{ x: number, y: number, visible: boolean } | null}
   */
  projectToScreen(localPos) {
    if (!this.aircraft || !this.camera) return null;
    const v = new THREE.Vector3(...localPos);
    this.aircraft.localToWorld(v);
    const p = v.clone().project(this.camera);

    // If point is behind camera or excessively off-screen, flag as not visible
    if (p.z > 1.0) return null;

    const x = (p.x * 0.5 + 0.5) * this.viewW;
    const y = (-p.y * 0.5 + 0.5) * this.viewH;
    const visible = p.x >= -0.95 && p.x <= 0.95 && p.y >= -0.95 && p.y <= 0.95;

    return { x, y, visible };
  }
}
