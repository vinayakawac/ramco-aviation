/**
 * main.js — boot, capability detection, render loop.
 *
 * Three tiers, decided here:
 *   full      WebGL2 + motion allowed — the scroll-driven journey as designed
 *   reduced   prefers-reduced-motion — scene renders, but scroll snaps and nothing eases
 *   document  no WebGL or a viewport too small to see the scene — plain readable page
 *
 * The DOM panels are built before any of that, so content exists regardless of tier.
 */

import * as THREE from 'three';
import Lenis from 'lenis';

import { Timeline } from './scroll/timeline.js';
import { World } from './scene/world.js';
import { Rig } from './scene/rig.js';
import { Hud } from './ui/hud.js';
import { detectTier, enableDocumentMode } from './ui/fallback.js';
import { WINDOWS } from './stations/index.js';

const stage = document.getElementById('stage');
const loader = document.getElementById('loader');

/* ---------- 1. content first ---------- */

let latest = { t: 0, station: null, local: 0 };
const timeline = new Timeline(document.getElementById('scroll'), (t, station, local) => {
  latest = { t, station, local };
});

const tier = detectTier();

/* ---------- 2. document tier stops here ---------- */

if (tier === 'document') {
  enableDocumentMode(
    window.innerWidth < 420 ? 'viewport too small for the scene' : 'WebGL unavailable'
  );
} else {
  boot(tier);
}

// Lets the verification harness exercise the document tier on a machine that does
// have WebGL. Not used by the page itself.
window.__ramcoForceDocumentMode = () => enableDocumentMode('forced by test harness');

/* ---------- 3. the 3D tiers ---------- */

function boot(mode) {
  const reduced = mode === 'reduced';

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);

  const world = new World(renderer);

  // Real airframe, loaded after first paint. The procedural shell flies until it lands,
  // and keeps flying if it never does — see World#upgradeAirframe.
  world.upgradeAirframe().then((swapped) => {
    if (swapped) window.__ramcoAirframe = 'glb';
  });
  const rig = new Rig(world.camera, world.aircraft);
  const hud = new Hud(timeline, { reduced });

  /* --- smooth scroll (full tier only; reduced motion keeps native scrolling) --- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      // Touch keeps native scrolling — smoothing it fights the platform.
      syncTouch: false,
    });
  }

  /* --- resize --- */
  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    world.resize(w, h);
    rig.setViewport(w, h);
  };
  window.addEventListener('resize', onResize, { passive: true });
  onResize();

  /* --- reduced motion: snap between stations rather than easing through them --- */
  if (reduced) {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('.station').forEach((s) => (s.style.height = '100vh'));
  }

  /* --- the loop --- */
  const clock = new THREE.Clock();
  let running = true;

  function frame(time) {
    if (!running) return;
    if (lenis) lenis.raf(time);

    timeline.update();

    const dt = Math.min(clock.getDelta(), 0.05);
    const { t, station, local } = latest;

    if (station) {
      world.applyState(station.state, local);
      // Reduced motion parks the camera on the station's own keyframe instead of
      // sliding between them, so scrolling reads as a series of cuts.
      rig.update(reduced ? midFor(station) : t);
      hud.update(t, station, rig);
    }

    world.tick(dt);
    renderer.render(world.scene, world.camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // Hide the loader once we have actually drawn something.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => loader?.classList.add('done'));
  });

  /* --- pause when the tab is hidden; no point burning a GPU nobody is watching --- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      clock.getDelta();
      requestAnimationFrame(frame);
    }
  });

  // Expose for the verification harness.
  window.__ramco = { world, rig, timeline, renderer, lenis, tier: mode,
    /** Jump straight to a station and settle, for screenshots and the coverage test. */
    goto(i) {
      const el = document.querySelectorAll('.station')[i];
      if (!el) return;
      const y = el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2;
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    },
  };
}

/** Scroll progress at the centre of a station's window. */
function midFor(station) {
  return WINDOWS.find((w) => w.station === station)?.mid ?? 0;
}
