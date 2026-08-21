/**
 * plane-showcase.js — Standalone Free 3D Aircraft Inspection & Dynamic Positioning.
 * Freely movable 360° orbit, drag position mode, dedicated drag pad, live telemetry, pose copier.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadAirframe, DEFAULT_AIRFRAME, AIRFRAMES } from './scene/airframeModel.js';

const SOLID_BLUE = 0x143b6c;

const stageEl = document.getElementById('stage');

// HUD Elements
const btnRotate = document.getElementById('btn-rotate');
const btnDragMode = document.getElementById('btn-drag-mode');
const dragPadBtn = document.getElementById('drag-pad-btn');
const btnCenter = document.getElementById('btn-center');
const btnCopy = document.getElementById('btn-copy');
const toastEl = document.getElementById('toast');
const fleetEl = document.getElementById('fleet');

const telX = document.getElementById('tel-x');
const telY = document.getElementById('tel-y');
const telZ = document.getElementById('tel-z');
const telYaw = document.getElementById('tel-yaw');
const telPitch = document.getElementById('tel-pitch');
const telDist = document.getElementById('tel-dist');

/* --- Three.js Setup --- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(SOLID_BLUE);

const camera = new THREE.PerspectiveCamera(
  36,
  window.innerWidth / window.innerHeight,
  0.5,
  3000
);
camera.position.set(40, 14, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
stageEl.appendChild(renderer.domElement);

/* --- Orbit Controls (Free 3D Movement & Dragging) --- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.screenSpacePanning = true;
controls.enableZoom = true;
controls.zoomSpeed = 1.1;
controls.minDistance = 6;
controls.maxDistance = 280;
controls.autoRotate = false;
controls.target.set(0, 0, 0);

/* --- Drag Modes --- */
let currentMode = 'rotate'; // 'rotate' | 'drag'

function setControlMode(mode) {
  currentMode = mode;
  if (mode === 'drag') {
    btnRotate.classList.remove('active');
    btnDragMode.classList.add('active');
    stageEl.classList.add('dragging');
    // Map left click and single touch to Pan / Drag
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
  } else {
    btnDragMode.classList.remove('active');
    btnRotate.classList.add('active');
    stageEl.classList.remove('dragging');
    // Default: Left click = Rotate, Right click = Pan
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
  }
}

btnRotate.addEventListener('click', () => setControlMode('rotate'));
btnDragMode.addEventListener('click', () => setControlMode('drag'));

/* --- Dedicated On-Screen Drag Pad Button --- */
let isPadDragging = false;
let padStart = { x: 0, y: 0 };

dragPadBtn.addEventListener('pointerdown', (e) => {
  isPadDragging = true;
  padStart = { x: e.clientX, y: e.clientY };
  dragPadBtn.setPointerCapture(e.pointerId);
  e.stopPropagation();
});

window.addEventListener('pointermove', (e) => {
  if (!isPadDragging) return;
  const dx = e.clientX - padStart.x;
  const dy = e.clientY - padStart.y;
  padStart = { x: e.clientX, y: e.clientY };

  // Calculate pan vectors in screen space
  const factor = controls.getDistance() * 0.0014;
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  camera.matrix.extractBasis(right, up, new THREE.Vector3());

  const offset = new THREE.Vector3()
    .addScaledVector(right, -dx * factor)
    .addScaledVector(up, dy * factor);

  camera.position.add(offset);
  controls.target.add(offset);
});

window.addEventListener('pointerup', () => {
  isPadDragging = false;
});

/* --- Aircraft Group --- */
const aircraft = new THREE.Group();
scene.add(aircraft);

/**
 * Free every buffer the outgoing airframe owns.
 *
 * Materials are shared with the palette cache in materials.js, so they are deliberately
 * left alone — disposing them would blank the *next* model too. Geometry and the GLB's
 * own textures are per-model and are ours to release.
 */
function disposeAirframe(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m?.map) m.map.dispose();
    }
  });
}

/* --- Aircraft switcher --- */
let current = null; // the shell in the scene
let activeKey = null; // which airframe it is
let pending = null; // key of an in-flight load, so a double-click cannot land twice

const fleetButtons = new Map();

/**
 * Swap the displayed airframe, leaving the camera exactly where the user put it.
 *
 * Each model is scaled to its *own* real length rather than a common 38 m, so switching
 * shows the true size difference between the types — the point of having a switcher.
 *
 * @param {string} key key into AIRFRAMES
 */
async function showAirframe(key) {
  if (key === activeKey || key === pending) return;

  const spec = AIRFRAMES[key];
  if (!spec) return;

  pending = key;
  const btn = fleetButtons.get(key);
  btn?.classList.add('loading');
  fleetButtons.forEach((b) => (b.disabled = true));

  let shell;
  try {
    shell = await loadAirframe(key, spec.len);
  } catch (err) {
    console.warn(`[ramco] could not load airframe "${key}"`, err);
    // Leave whatever is on screen in place — a failed switch must not empty the stage.
    btn?.classList.remove('loading');
    fleetButtons.forEach((b) => (b.disabled = false));
    pending = null;
    return;
  }

  // A newer click may have landed while this one was in flight; that load wins, and this
  // shell is dropped before it ever reaches the scene.
  if (pending !== key) {
    disposeAirframe(shell);
    return;
  }

  if (current) {
    aircraft.remove(current);
    disposeAirframe(current);
  }

  aircraft.add(shell);
  current = shell;
  activeKey = key;
  pending = null;

  btn?.classList.remove('loading');
  fleetButtons.forEach((b, k) => {
    b.disabled = false;
    b.classList.toggle('active', k === activeKey);
  });
}

// Build one button per registered airframe.
for (const [key, spec] of Object.entries(AIRFRAMES)) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fleet-btn';
  btn.textContent = spec.label ?? key.toUpperCase();
  btn.title = `${spec.label ?? key} — ${spec.len} m`;
  btn.addEventListener('click', () => showAirframe(key));
  fleetEl.appendChild(btn);
  fleetButtons.set(key, btn);
}

showAirframe(DEFAULT_AIRFRAME);

/* --- Studio Lighting for Solid Blue Backdrop --- */
const ambientLight = new THREE.AmbientLight(0xdbe9f9, 1.4);
scene.add(ambientLight);

const dirKey = new THREE.DirectionalLight(0xffffff, 2.6);
dirKey.position.set(50, 70, 60);
scene.add(dirKey);

const dirFill = new THREE.DirectionalLight(0x8cb6e8, 1.3);
dirFill.position.set(-60, -20, -50);
scene.add(dirFill);

const dirRim = new THREE.DirectionalLight(0xffffff, 2.0);
dirRim.position.set(0, 50, -70);
scene.add(dirRim);

const dirUnder = new THREE.DirectionalLight(0x6095cc, 0.9);
dirUnder.position.set(0, -50, 0);
scene.add(dirUnder);

/* --- Center & Reset Action --- */
function resetCenter() {
  controls.target.set(0, 0, 0);
  camera.position.set(40, 14, 60);
  controls.update();
}
btnCenter.addEventListener('click', resetCenter);
window.addEventListener('dblclick', resetCenter);

/* --- Copy Pose Action --- */
btnCopy.addEventListener('click', () => {
  const spherical = new THREE.Spherical();
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
  spherical.setFromVector3(offset);

  const yaw = Number(((-spherical.theta) % (Math.PI * 2)).toFixed(2));
  const pitch = Number(((Math.PI / 2 - spherical.phi)).toFixed(2));
  const dist = Math.round(spherical.radius);
  const height = Number(camera.position.y.toFixed(1));

  const poseObj = {
    yaw,
    pitch,
    roll: 0.0,
    dist,
    height,
    focus: [
      Number(controls.target.x.toFixed(1)),
      Number(controls.target.y.toFixed(1)),
      Number(controls.target.z.toFixed(1)),
    ],
  };

  const codeStr = JSON.stringify(poseObj, null, 2);
  navigator.clipboard.writeText(codeStr).then(() => {
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2000);
  }).catch(() => {
    prompt('Current Pose Object:', codeStr);
  });
});

/* --- Render & Telemetry Loop --- */
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Update live telemetry readout
  if (telX && telY && telZ) {
    telX.textContent = controls.target.x.toFixed(1);
    telY.textContent = controls.target.y.toFixed(1);
    telZ.textContent = controls.target.z.toFixed(1);

    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    const yawDeg = Math.round(((-spherical.theta * 180) / Math.PI + 360) % 360);
    const pitchDeg = Math.round(((Math.PI / 2 - spherical.phi) * 180) / Math.PI);

    telYaw.textContent = `${yawDeg}°`;
    telPitch.textContent = `${pitchDeg}°`;
    telDist.textContent = Math.round(spherical.radius);
  }

  renderer.render(scene, camera);
}
animate();

/* --- Window Resize --- */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onResize);
