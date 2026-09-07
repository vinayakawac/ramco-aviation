// AIRCRAFT-001 entry point: builds the master model, wires the state store to every
// module (product.md §48) and runs the render loop. URL flags:
//   ?quality=T1080|T1440|T2160   force a quality tier
//   ?renders=1                   capture the canonical views to logs/renders and stop
import { buildAircraft } from './aircraft/AircraftBuilder';
import { downloadGLB } from './aircraft/AircraftLoader';
import { CANONICAL_VIEWS, GROUND_Z, UNIT_SCALE, type CanonicalView } from './aircraft/AircraftSpec';
import { createLogger } from './core/logger';
import { AircraftScene } from './modes/AircraftScene';
import { AircraftCameras } from './modes/AircraftCameras';
import { AircraftLighting } from './modes/AircraftLighting';
import { AircraftAnimations } from './modes/AircraftAnimations';
import { AircraftSelection } from './modes/AircraftSelection';
import { AircraftSystems } from './modes/AircraftSystems';
import { AircraftBlueprint } from './modes/AircraftBlueprint';
import { AircraftCutaway } from './modes/AircraftCutaway';
import { AircraftExplodedView } from './modes/AircraftExplodedView';
import { AircraftVisibility } from './modes/AircraftVisibility';
import { StateStore } from './modes/AircraftState';
import { AircraftUI } from './ui/AircraftUI';

const log = createLogger('Main');
const params = new URLSearchParams(location.search);

window.addEventListener('error', (e) => log.error('uncaught', { message: e.message, source: e.filename, line: e.lineno }));
window.addEventListener('unhandledrejection', (e) => log.error('unhandled rejection', { reason: String(e.reason) }));

function boot(): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const sceneShell = new AircraftScene(canvas, params.get('quality'));
  const { scene, renderer, quality } = sceneShell;

  const built = buildAircraft({ quality });
  scene.add(built.root);

  const store = new StateStore();
  const cameras = new AircraftCameras(built.root, canvas, canvas.clientWidth / canvas.clientHeight);
  const lighting = new AircraftLighting(scene, renderer, quality, GROUND_Z * UNIT_SCALE, 140 * UNIT_SCALE);
  const animations = new AircraftAnimations(built.aircraft);
  const systems = new AircraftSystems(built.aircraft);
  const blueprint = new AircraftBlueprint(built.aircraft, scene);
  const cutaway = new AircraftCutaway(built.materials);
  const exploded = new AircraftExplodedView(built.aircraft);
  const visibility = new AircraftVisibility(built.aircraft, built.materials);
  visibility.apply(store.get().visibility, built.materials);

  const ui = new AircraftUI(store, quality, built.triangles, {
    exportGLB: () => void downloadGLB(built.root),
    captureRenders: () => void captureCanonicalRenders(),
  });
  const selection = new AircraftSelection(built.aircraft, canvas, () => cameras.camera, (info) => {
    ui.showSelection(info);
    store.set({ selectedComponent: info?.component ?? null });
  });

  sceneShell.onResize((w, h) => cameras.setAspect(w / h));
  cameras.setAspect(canvas.clientWidth / canvas.clientHeight);
  cameras.goTo(store.get().view as CanonicalView, false);
  cameras.onUserInteraction(() => { if (store.get().view !== 'FREE') store.set({ view: 'FREE' }); });

  // ---- state → modules --------------------------------------------------------------
  store.onChange((s, prev, changed) => {
    if (changed.has('view') && s.view !== 'FREE') cameras.goTo(s.view);
    if (changed.has('renderMode')) {
      if (s.renderMode === 'BLUEPRINT') { systems.clear(); selection.clear(); blueprint.enable(); lighting.applyBlueprint(); ui.showDimensions(blueprint.readout); }
      else { blueprint.disable(); lighting.apply(s.lighting); ui.showDimensions(undefined); systems.apply(s.system); }
    }
    if (changed.has('lighting') && s.renderMode === 'REALISTIC') lighting.apply(s.lighting);
    if (changed.has('system')) { selection.clear(); ui.showSelection(null); if (s.renderMode === 'REALISTIC') systems.apply(s.system); }
    if (changed.has('visibility')) { systems.clear(); visibility.apply(s.visibility, built.materials); systems.apply(s.system); }
    if (changed.has('cutawayEnabled')) { s.cutawayEnabled ? cutaway.enable(s.cutawayPosition) : cutaway.disable(); }
    if (changed.has('cutawayPosition') && s.cutawayEnabled) cutaway.setDepth(s.cutawayPosition);
    if (changed.has('exploded')) exploded.set(s.exploded);
    if (changed.has('autoRotate')) cameras.controls.autoRotate = s.autoRotate;
    if (['landingGear', 'flaps', 'slats', 'spoilers', 'doors', 'cargoDoors', 'engineState', 'visibility'].some((k) => changed.has(k as keyof typeof s))) animations.applyState(s);
    void prev;
  });
  animations.applyState(store.get());

  // ---- render loop ------------------------------------------------------------------
  // manual delta: THREE.Timer pauses on document.hidden, which would freeze hidden-pane fallbacks
  let frames = 0, fpsT = 0, lastTick = performance.now();
  function tick(): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
    animations.update(dt);
    exploded.update(dt);
    cameras.update(dt);
    built.root.updateMatrixWorld(true);
    blueprint.update();
    sceneShell.render(cameras.camera);
    frames++; fpsT += dt;
    if (fpsT >= 5) { log.info('fps', { fps: Math.round(frames / fpsT), calls: renderer.info.render.calls, tris: renderer.info.render.triangles }); frames = 0; fpsT = 0; }
  }
  function loop(): void { tick(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  // requestAnimationFrame pauses in hidden/background panes; keep state advancing at a low rate
  setInterval(() => { if (performance.now() - lastTick > 250) tick(); }, 100);

  // ---- canonical render capture (product.md §33) -------------------------------------
  async function captureCanonicalRenders(): Promise<void> {
    const views = Object.keys(CANONICAL_VIEWS) as CanonicalView[];
    const prevView = store.get().view;
    const day = new Date().toISOString().slice(0, 10);
    log.info('capturing canonical renders', { count: views.length, day });
    for (const v of views) {
      cameras.goTo(v, false);
      animations.settle();
      built.root.updateMatrixWorld(true);
      blueprint.update();
      const png = sceneShell.renderToPNG(cameras.camera, 1600, 900);
      await fetch('/__render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day, name: `${v}-${store.get().renderMode.toLowerCase()}`, png }) }).catch((e) => log.warn('render upload failed', { view: v, e: String(e) }));
    }
    if (prevView !== 'FREE') cameras.goTo(prevView, false);
    log.info('canonical renders captured', { dir: `logs/renders/${day}` });
    (window as any).__rendersDone = true;
  }
  if (params.get('renders') === '1') {
    // let the first frames settle before capturing
    setTimeout(() => void captureCanonicalRenders().then(() => { if (params.get('blueprint') === '1') { store.set({ renderMode: 'BLUEPRINT' }); return captureCanonicalRenders(); } }), 800);
  }
  // dev hook: capture the current camera offscreen (works even when the pane is hidden)
  const capture = async (name: string): Promise<void> => {
    // fast-forward every transition so the capture is a settled, deterministic frame
    animations.settle(); exploded.update(10); cameras.update(10); built.root.updateMatrixWorld(true); blueprint.update();
    const png = sceneShell.renderToPNG(cameras.camera, 1600, 900);
    await fetch('/__render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day: new Date().toISOString().slice(0, 10), name, png }) });
  };
  (window as any).__aircraft = { built, store, cameras, capture };
  log.info('booted', { tier: quality.tier, triangles: built.triangles });
}

boot();
