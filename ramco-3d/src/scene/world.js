/**
 * world.js — assembles the scene and applies station state to it.
 *
 * `applyState` is the single place scene appearance is decided. Stations declare what they
 * want (doors open, engine bay lit, overlay X visible, gear up) and this translates that
 * into the scene graph, so no station module reaches into geometry directly.
 */

import * as THREE from 'three';
import { mat, PALETTE } from './materials.js';
import { createAircraft, setAirframeLit } from './aircraft.js';
import { loadAirframe, DEFAULT_AIRFRAME } from './airframeModel.js';
import { createHangar, setDoors, setWorkLights, HANGAR } from './hangar.js';
import { createEngine, setLadderLevel } from './engine.js';
import { createAirfield } from './airfield.js';
import { createGSE, createStore, createBench, createJacks, createSignage, createDemandPulse } from './props.js';
import { createHangarShell, createEnvelope, createStandMarks, createConfigGhosts, createSpeedTape } from './overlays.js';
import { createNetwork, setNetworkMode, faceNetwork } from './network.js';
import { METERS } from '../data/ramco.js';

/** Where the maintenance props live on the hangar floor. */
const ENGINE_BAY = [-26, 3.4, -8];
const BENCH_POS = [17, 0, 6];
const STORE_POS = [29, 0, 2];

export class World {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.deep);
    this.scene.fog = new THREE.Fog(PALETTE.deep, 180, 1400);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.5, 6000);

    this._build();
    this._lights();

    this.state = {};
    this.time = 0;
  }

  _build() {
    const s = this.scene;

    this.aircraft = createAircraft();
    s.add(this.aircraft);

    this.hangar = createHangar();
    s.add(this.hangar);

    this.airfield = createAirfield();
    s.add(this.airfield);

    this.engine = createEngine();
    this.engine.position.set(...ENGINE_BAY);
    this.engine.visible = false;
    s.add(this.engine);

    this.bench = createBench();
    this.bench.position.set(...BENCH_POS);
    s.add(this.bench);

    this.store = createStore();
    this.store.position.set(...STORE_POS);
    s.add(this.store);

    this.jacks = createJacks();
    s.add(this.jacks);

    this.gse = createGSE();
    this.gse.visible = false;
    s.add(this.gse);

    this.signage = createSignage();
    s.add(this.signage);

    this.demandPulse = createDemandPulse(
      [STORE_POS[0] - 2, 2.4, STORE_POS[2]],
      [ENGINE_BAY[0] + 2, 3, ENGINE_BAY[2]]
    );
    s.add(this.demandPulse);

    this.network = createNetwork();
    s.add(this.network);

    /* --- annotation overlays --- */
    // The hangar shell is a property of the building, so it stays in world space.
    // The configuration envelope is a property of the *aircraft*, so it rides with it.
    // The stand markings are painted on the ground, so they track the aircraft's
    // position but never its pitch or roll.
    this.overlays = {
      hangarShell: createHangarShell(),
      envelope: createEnvelope(),
      stand: createStandMarks(),
    };
    s.add(this.overlays.hangarShell);
    s.add(this.overlays.stand);
    this.aircraft.add(this.overlays.envelope);

    this.ghosts = createConfigGhosts(this.aircraft.userData.airframe);
    this.aircraft.add(this.ghosts);

    this.speedTape = createSpeedTape(METERS);
    s.add(this.speedTape);
  }

  /**
   * Swap the procedural shell for a loaded GLB airframe, in the background.
   *
   * Deliberately not awaited by the constructor: the scene must be renderable on the
   * first frame, and a network hiccup or a missing decoder must cost detail, never the
   * whole page. On any failure the procedural shell simply stays.
   *
   * Only `userData.airframe` is replaced. Gear, LRU markers and cockpit are procedural
   * and animated by station state, so they are left untouched.
   *
   * @param {string} [key] airframe key, see AIRFRAMES in airframeModel.js
   * @returns {Promise<boolean>} whether the swap happened
   */
  async upgradeAirframe(key = DEFAULT_AIRFRAME) {
    let shell;
    try {
      shell = await loadAirframe(key, this.aircraft.userData.length);
    } catch (err) {
      console.warn('[ramco] airframe model unavailable — keeping procedural shell', err);
      return false;
    }

    const old = this.aircraft.userData.airframe;
    this.aircraft.remove(old);
    disposeGeometry(old);

    this.aircraft.add(shell);
    this.aircraft.userData.airframe = shell;

    // The ghosts are clones of the shell, so they have to be rebuilt against the new one.
    this.aircraft.remove(this.ghosts);
    disposeGeometry(this.ghosts);
    this.ghosts = createConfigGhosts(shell);
    this.aircraft.add(this.ghosts);

    // Re-apply whatever station we are currently sitting on, so a swap that lands
    // mid-scroll picks up ghost/cockpit/lit visibility instead of resetting it.
    if (this.state && Object.keys(this.state).length) this.applyState(this.state, this._local ?? 0);

    return true;
  }

  _lights() {
    const s = this.scene;

    this.ambient = new THREE.HemisphereLight(0xbcd6e0, 0x2a3238, 0.35);
    s.add(this.ambient);

    // Daylight, only meaningful once the doors open.
    this.sun = new THREE.DirectionalLight(0xfff2dc, 0);
    this.sun.position.set(-160, 210, 420);
    this.sun.castShadow = true;
    // 1024 is plenty once the frustum is tight: it tracks the aircraft (see applyState),
    // so it only ever has to cover the airframe and the ground under it, not the field.
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0006;
    const d = 68;
    Object.assign(this.sun.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 60, far: 520 });
    this.sun.shadow.camera.updateProjectionMatrix();
    s.add(this.sun, this.sun.target);

    // The wedge of daylight through the open hangar door.
    this.doorLight = new THREE.SpotLight(0xfff4e2, 0, 220, 0.62, 0.5, 1.4);
    this.doorLight.position.set(0, 16, HANGAR.depth + 40);
    this.doorLight.target.position.set(0, 2, -10);
    s.add(this.doorLight, this.doorLight.target);
  }

  /**
   * Apply the active station's declared scene state.
   * @param {object} state
   * @param {number} local 0→1 progress through the active station
   */
  applyState(state, local = 0) {
    this._local = local;
    this.state = state;

    /* --- hangar --- */
    setDoors(this.hangar, state.doors ?? 1);
    setWorkLights(this.hangar, state.workLights ?? 0);

    const outside = (state.doors ?? 1) > 0.5;
    // Drop the hangar once the aircraft is well clear of it — otherwise its shell
    // blocks the exterior shots from behind the camera.
    this.hangar.visible = !state.cruise && this.aircraft.position.z < 130;
    this.sun.intensity = outside ? 2.6 : 0.25;
    this.doorLight.intensity = (state.doors ?? 0) * 900;
    this.ambient.intensity = outside ? 0.75 : 0.3;

    // Fog opens out once we're on the field.
    this.scene.fog.near = outside ? 400 : 160;
    this.scene.fog.far = outside ? 3000 : 900;
    this.scene.background.setHex(outside ? 0x9db8c4 : PALETTE.deep);

    /* --- props --- */
    this.engine.visible = !!state.engineBay;
    this.gse.visible = !!state.tug;
    this.jacks.visible = !!state.interior && !state.doors;
    this.signage.visible = !!state.signage;
    this.demandPulse.visible = !!state.demandPulse;
    this.speedTape.visible = !!state.speedTape;

    /* --- engine configuration depth --- */
    setLadderLevel(this.engine, state.ladder ?? -1);

    /* --- overlays --- */
    Object.entries(this.overlays).forEach(([k, o]) => (o.visible = state.overlay === k));
    this.ghosts.visible = !!state.ghosts;

    // Park the tug on the nose, facing the same way the aircraft does.
    if (this.gse.visible) {
      const h = this.aircraft.rotation.y;
      const reach = 24;
      this.gse.position.set(
        this.aircraft.position.x + Math.sin(h) * reach,
        0,
        this.aircraft.position.z + Math.cos(h) * reach
      );
      this.gse.rotation.y = h + Math.PI;
    }

    // Keep the sun's shadow frustum centred on the aircraft — it travels over a
    // kilometre of field, so a fixed frustum at the origin would drop shadows entirely.
    this.sun.target.position.copy(this.aircraft.position);
    this.sun.position.set(
      this.aircraft.position.x - 150,
      this.aircraft.position.y + 210,
      this.aircraft.position.z + 190
    );
    this.sun.target.updateMatrixWorld();

    // Keep the painted stand markings under the aircraft, flat on the ground.
    if (this.overlays.stand.visible) {
      this.overlays.stand.position.set(this.aircraft.position.x, 0, this.aircraft.position.z);
      this.overlays.stand.rotation.y = this.aircraft.rotation.y;
    }

    /* --- highlight treatments (source `.lit` rules) --- */
    const lit = state.lit ?? [];
    setAirframeLit(this.aircraft, lit.includes('airframe'));
    this.aircraft.userData.lru.visible = !!state.lru;

    // Inside the flight deck the airframe would otherwise wrap around the camera.
    this.aircraft.userData.cockpit.visible = !!state.cockpit;
    this.aircraft.userData.airframe.visible = !state.cockpit;

    /* --- the operating-model diagram --- */
    setNetworkMode(this.network, state.network ?? null);
    faceNetwork(this.network, this.camera);

    /* --- gear retracts on climb --- */
    const gear = this.aircraft.userData.gear;
    gear.visible = !state.gearUp;

    /* --- speed tape fills across the takeoff roll --- */
    if (state.speedTape) {
      this.speedTape.children.forEach((bar, i) => {
        const fill = bar.getObjectByName('fill');
        // Stagger so the five meters land one after another as speed builds.
        const start = i * 0.13;
        const p = Math.min(1, Math.max(0, (local - start) / 0.45));
        fill.scale.z = Math.max(0.001, p * fill.userData.target);
        fill.position.z = -15 + (fill.scale.z * 30) / 2;
      });
    }
  }

  /** Per-frame animation that isn't driven by scroll. */
  tick(dt) {
    this.time += dt;

    // Fan blades spin whenever the engine is on show.
    if (this.engine.visible) {
      const blades = this.engine.getObjectByName('fan-blades');
      if (blades) blades.rotation.z += dt * 0.6;
    }

    // Demand pulse bead runs the store → bench route.
    if (this.demandPulse.visible) {
      const bead = this.demandPulse.getObjectByName('bead');
      const t = (this.time * 0.35) % 1;
      this.demandPulse.userData.curve.getPoint(t, bead.position);
    }

    // LRU markers breathe so the eye finds them.
    if (this.aircraft.userData.lru.visible) {
      const s = 1 + Math.sin(this.time * 2.4) * 0.12;
      this.aircraft.userData.lru.children.forEach((r) => r.scale.setScalar(s));
    }

    // Face the LRU rings and network toward the camera.
    this.aircraft.userData.lru.children.forEach((r) => r.lookAt(this.camera.position));
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
}

/**
 * Dispose the geometries under a discarded subtree.
 *
 * Materials are deliberately left alone: most of them come from the memoised `mat`
 * factory and are still in use elsewhere in the scene.
 * @param {THREE.Object3D} root
 */
function disposeGeometry(root) {
  root.traverse((o) => o.geometry?.dispose());
}
