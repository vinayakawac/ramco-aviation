/**
 * rig.js — the flight path and the camera that follows it.
 *
 * Two things are interpolated from scroll progress:
 *   1. the aircraft's position and heading along a Catmull-Rom spline through PATH_POINTS
 *   2. the camera, which blends between per-station keyframes
 *
 * Station keyframes come in two flavours. Absolute keys (`pos`/`look`) are world-space and
 * used inside the hangar, where the aircraft is parked and only the camera moves. Relative
 * keys (`rel`/`look`) are expressed in the aircraft's own frame, so a shot stays locked to
 * the airframe while it taxis, rolls and climbs.
 */

import * as THREE from 'three';
import { PATH_POINTS, WINDOWS } from '../stations/index.js';

const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

export class Rig {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {THREE.Object3D} aircraft
   */
  constructor(camera, aircraft) {
    this.camera = camera;
    this.aircraft = aircraft;

    this.curve = new THREE.CatmullRomCurve3(
      PATH_POINTS.map((p) => new THREE.Vector3(...p)),
      false,
      'catmullrom',
      0.25
    );

    // Scratch vectors, reused every frame so the loop allocates nothing.
    this._pos = new THREE.Vector3();
    this._ahead = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._camLook = new THREE.Vector3();
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._ka = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this._kb = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

    this.groundY = 4.1; // wheels-on-ground offset for the aircraft group
    this.bias = 0; // lateral frustum shift, so panels never sit on top of the subject
    this.speedKt = 0;
    this.altFt = 0;
  }

  /** Resolve a station's camera keyframe into world-space position and look target. */
  _resolveKey(station, out) {
    const { cam } = station;
    if (cam.pos) {
      out.pos.set(...cam.pos);
      out.look.set(...cam.look);
      return out;
    }

    // Relative key: place it in the aircraft's frame at that station's own path point.
    const u = station.u;
    this.curve.getPoint(u, this._a);
    this.curve.getPoint(Math.min(1, u + 0.004), this._b);
    const heading = Math.atan2(this._b.x - this._a.x, this._b.z - this._a.z);

    this._m.makeRotationY(heading);
    out.pos.set(...cam.rel).applyMatrix4(this._m).add(this._a);
    out.pos.y += this.groundY;
    out.look.set(...cam.look).applyMatrix4(this._m).add(this._a);
    out.look.y += this.groundY;
    return out;
  }

  /**
   * Advance the rig to scroll progress `t` in [0,1].
   * @param {number} t
   */
  update(t) {
    // Find the two stations we are between, using their midpoints as the keyframe anchors.
    let i = 0;
    while (i < WINDOWS.length - 1 && t > WINDOWS[i + 1].mid) i++;
    const a = WINDOWS[i];
    const b = WINDOWS[Math.min(i + 1, WINDOWS.length - 1)];

    const span = b.mid - a.mid;
    const local = span > 0 ? smoothstep(clamp01((t - a.mid) / span)) : 0;

    /* --- aircraft along the path --- */
    const u = THREE.MathUtils.lerp(a.station.u, b.station.u, local);
    this.curve.getPoint(u, this._pos);
    this.curve.getPoint(Math.min(1, u + 0.004), this._ahead);

    this.aircraft.position.set(this._pos.x, this._pos.y + this.groundY, this._pos.z);
    this.aircraft.rotation.y = Math.atan2(
      this._ahead.x - this._pos.x,
      this._ahead.z - this._pos.z
    );

    // Pitch up through rotation and the climb.
    const climbRate = (this._ahead.y - this._pos.y) / Math.max(0.001, this._ahead.distanceTo(this._pos));
    this.aircraft.rotation.x = -Math.atan(climbRate) * 0.85;

    // Telemetry, derived from where we actually are rather than faked.
    const along = u * this.curve.getLength();
    const rolling = this._pos.z > 300;
    this.speedKt = rolling ? Math.min(310, Math.max(0, (this._pos.z - 300) * 0.42)) : u * 60;
    this.altFt = Math.max(0, this._pos.y * 3.28084);
    this.pathU = u;

    /* --- camera between keyframes --- */
    const ka = this._resolveKey(a.station, this._ka);
    const kb = this._resolveKey(b.station, this._kb);

    this._camPos.lerpVectors(ka.pos, kb.pos, local);
    this._camLook.lerpVectors(ka.look, kb.look, local);

    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);

    // Compose the subject opposite the panel. A left-hand panel shifts the rendered
    // frustum left, which pushes the scene right into the empty half of the screen.
    const sideBias = { left: -1, right: 1, centre: 0 }[a.station.side ?? 'centre'] ?? 0;
    const nextBias = { left: -1, right: 1, centre: 0 }[b.station.side ?? 'centre'] ?? 0;
    const wanted = THREE.MathUtils.lerp(sideBias, nextBias, local);
    this._applyBias(wanted);
  }

  /**
   * Shift the projection sideways by `k` (-1 left … 1 right) of a fixed fraction of the
   * viewport. Below the panel breakpoint the panel is full-width, so no bias applies.
   */
  _applyBias(k) {
    const w = this.viewW || 1;
    const h = this.viewH || 1;
    const strength = w < 901 ? 0 : 0.17;
    const offsetX = k * w * strength;

    if (Math.abs(offsetX) < 0.5) {
      if (this.camera.view?.enabled) this.camera.clearViewOffset();
      return;
    }
    this.camera.setViewOffset(w, h, offsetX, 0, w, h);
  }

  /** Called on resize so the bias tracks the real viewport. */
  setViewport(w, h) {
    this.viewW = w;
    this.viewH = h;
  }

  /** Snap straight to a station without interpolation (used in reduced-motion mode). */
  jumpTo(index) {
    this.update(WINDOWS[Math.min(index, WINDOWS.length - 1)].mid);
  }
}
