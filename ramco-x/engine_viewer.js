/**
 * engine_viewer.js - Interactive 3D Cutaway Turbofan Inspector Controller
 */

import * as THREE from 'three';
import { createTurbofanEngine } from './engine_model.js';

// DOM Elements
const canvas = document.getElementById('engine-canvas');
const viewport = document.getElementById('engine-viewport');
const pinsContainer = document.getElementById('pins-container');
const mroList = document.getElementById('mroList');
const activeModuleName = document.getElementById('activeModuleName');

const explodeSlider = document.getElementById('explodeSlider');
const explodeVal = document.getElementById('explodeVal');
const rpmSlider = document.getElementById('rpmSlider');
const rpmVal = document.getElementById('rpmVal');
const togglePlayBtn = document.getElementById('togglePlayBtn');
const toggleAirflowBtn = document.getElementById('toggleAirflowBtn');
const cameraPresets = document.getElementById('cameraPresets');

const hudN1 = document.getElementById('hudN1');
const hudN2 = document.getElementById('hudN2');
const hudEGT = document.getElementById('hudEGT');

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050608);
scene.fog = new THREE.FogExp2(0x050608, 0.04);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.2, 7.5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ------------------------------------------------------------
   Studio Lighting & Environment
   ------------------------------------------------------------ */
const ambLight = new THREE.AmbientLight(0xdde3eb, 0.65);
scene.add(ambLight);

// Key Softbox light (high and forward)
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(6, 10, 8);
scene.add(keyLight);

// Cool Rim light (behind to highlight cutaway edges)
const rimLight = new THREE.DirectionalLight(0x7ea9e8, 1.8);
rimLight.position.set(-8, 6, -6);
scene.add(rimLight);

// Warm Fill light from below
const fillLight = new THREE.DirectionalLight(0xffd5a5, 0.85);
fillLight.position.set(0, -4, 4);
scene.add(fillLight);

// Studio Polished Circular Pedestal Floor
const floorGeom = new THREE.CylinderGeometry(6.5, 6.8, 0.2, 48);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0f1115,
  roughness: 0.28,
  metalness: 0.85,
});
const floor = new THREE.Mesh(floorGeom, floorMat);
floor.position.y = -2.2;
scene.add(floor);

// Floor grid markings
const gridHelper = new THREE.PolarGridHelper(6.4, 16, 8, 32, 0x3b82f6, 0x1f242d);
gridHelper.position.y = -2.09;
scene.add(gridHelper);

/* ------------------------------------------------------------
   Instantiate Cutaway Engine
   ------------------------------------------------------------ */
const engine = createTurbofanEngine({
  scale: 0.95,
  cutawayAngle: Math.PI * 0.5,
  showAirflow: false,
});

// Center and mount engine above floor
engine.group.position.set(0, 0, 0);
scene.add(engine.group);

/* ------------------------------------------------------------
   Smooth Orbit Controls Implementation
   ------------------------------------------------------------ */
let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;

let spherical = {
  radius: 8.2,
  theta: 2.35, // orbital angle facing the cutaway cross-section
  phi: 1.32,   // slight elevation angle
  target: new THREE.Vector3(0.3, 0, 0),
};

let currentSpherical = { ...spherical, target: spherical.target.clone() };

function updateCameraPosition() {
  const sinPhi = Math.sin(currentSpherical.phi);
  const cosPhi = Math.cos(currentSpherical.phi);
  const sinTheta = Math.sin(currentSpherical.theta);
  const cosTheta = Math.cos(currentSpherical.theta);

  camera.position.x = currentSpherical.target.x + currentSpherical.radius * sinPhi * sinTheta;
  camera.position.y = currentSpherical.target.y + currentSpherical.radius * cosPhi;
  camera.position.z = currentSpherical.target.z + currentSpherical.radius * sinPhi * cosTheta;

  camera.lookAt(currentSpherical.target);
}

viewport.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - prevMouseX;
  const dy = e.clientY - prevMouseY;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;

  spherical.theta -= dx * 0.006;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy * 0.006, 0.2, Math.PI * 0.48);
});

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  spherical.radius = THREE.MathUtils.clamp(spherical.radius + e.deltaY * 0.005, 3.2, 14.0);
}, { passive: false });

// Touch orbit support
viewport.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    prevMouseX = e.touches[0].clientX;
    prevMouseY = e.touches[0].clientY;
  }
});

window.addEventListener('touchmove', (e) => {
  if (!isDragging || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - prevMouseX;
  const dy = e.touches[0].clientY - prevMouseY;
  prevMouseX = e.touches[0].clientX;
  prevMouseY = e.touches[0].clientY;

  spherical.theta -= dx * 0.007;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy * 0.007, 0.2, Math.PI * 0.48);
});

window.addEventListener('touchend', () => {
  isDragging = false;
});

/* ------------------------------------------------------------
   Camera Presets & Module Targeting
   ------------------------------------------------------------ */
const PRESETS = {
  overview: { radius: 8.2, theta: 2.35, phi: 1.32, target: [0.3, 0, 0] },
  fan: { radius: 4.8, theta: 2.15, phi: 1.38, target: [-2.4, 0.2, 0.2] },
  hpc: { radius: 4.2, theta: 2.35, phi: 1.28, target: [-0.2, 0.1, 0.1] },
  combustor: { radius: 3.6, theta: 2.40, phi: 1.32, target: [1.3, 0.0, 0.1] },
  turbine: { radius: 4.4, theta: 2.45, phi: 1.28, target: [2.7, 0.1, 0.1] },
  exhaust: { radius: 4.6, theta: 2.65, phi: 1.32, target: [4.4, -0.1, 0.1] },
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  spherical.radius = p.radius;
  spherical.theta = p.theta;
  spherical.phi = p.phi;
  spherical.target.set(p.target[0], p.target[1], p.target[2]);

  document.querySelectorAll('.preset-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.preset === name);
  });
}

cameraPresets.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  applyPreset(btn.dataset.preset);
});

/* ------------------------------------------------------------
   MRO Module Drawer UI & Interactive Pins
   ------------------------------------------------------------ */
const pins = [];

engine.mroHotspots.forEach((hs, idx) => {
  // Add item to left MRO list
  const item = document.createElement('button');
  item.className = 'mro-item';
  item.innerHTML = `
    <div class="mro-item-stage">${hs.stage}</div>
    <div class="mro-item-name">${hs.name}</div>
    <div class="mro-item-scope">${hs.scope}</div>
    <div class="mro-item-cap" style="font-size: 11px; color: #93c5fd; margin-top: 4px; line-height: 1.35;">${hs.capability}</div>
    <div class="mro-item-llp">${hs.llp}</div>
  `;
  item.addEventListener('click', () => {
    document.querySelectorAll('.mro-item').forEach((i) => i.classList.remove('active'));
    item.classList.add('active');
    activeModuleName.textContent = hs.name;

    // Center camera on hotspot
    spherical.radius = 4.2;
    spherical.target.copy(hs.anchor);
  });
  mroList.appendChild(item);

  // Add 3D Pin
  const pinEl = document.createElement('div');
  pinEl.className = 'pin-3d';
  pinEl.innerHTML = `
    <div class="pin-3d-dot"></div>
    <div class="pin-3d-label">${hs.name}</div>
  `;
  pinEl.addEventListener('click', () => {
    item.click();
  });
  pinsContainer.appendChild(pinEl);

  pins.push({
    el: pinEl,
    pos: hs.anchor.clone().multiplyScalar(0.95),
  });
});

const tempVec = new THREE.Vector3();

function updatePins() {
  pins.forEach((p) => {
    tempVec.copy(p.pos);
    engine.group.localToWorld(tempVec);
    tempVec.project(camera);

    // Behind camera check
    if (tempVec.z > 1) {
      p.el.style.display = 'none';
      return;
    }

    const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(tempVec.y * 0.5) + 0.5) * window.innerHeight;

    p.el.style.display = 'block';
    p.el.style.left = `${x}px`;
    p.el.style.top = `${y}px`;
  });
}

/* ------------------------------------------------------------
   UI Controls (Exploded View, RPM, Airflow)
   ------------------------------------------------------------ */
let isPlaying = true;
let currentRpmFactor = 1.0;
let airflowActive = false;

explodeSlider.addEventListener('input', (e) => {
  const val = e.target.value / 100;
  explodeVal.textContent = `${e.target.value}%`;
  engine.setExplode(val);
});

rpmSlider.addEventListener('input', (e) => {
  currentRpmFactor = e.target.value / 100;
  rpmVal.textContent = `${currentRpmFactor.toFixed(1)}x`;
});

togglePlayBtn.addEventListener('click', () => {
  isPlaying = !isPlaying;
  togglePlayBtn.textContent = isPlaying ? 'Pause' : 'Resume';
  togglePlayBtn.classList.toggle('active', !isPlaying);
});

toggleAirflowBtn.addEventListener('click', () => {
  airflowActive = !airflowActive;
  engine.setAirflow(airflowActive);
  toggleAirflowBtn.textContent = `Airflow: ${airflowActive ? 'On' : 'Off'}`;
  toggleAirflowBtn.classList.toggle('active', airflowActive);
});

/* ------------------------------------------------------------
   Window Resize
   ------------------------------------------------------------ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/* ------------------------------------------------------------
   Render Loop
   ------------------------------------------------------------ */
let prevTime = performance.now();

function animate(time) {
  requestAnimationFrame(animate);

  const dt = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;

  // Smooth camera interpolation
  const damp = 0.08;
  currentSpherical.radius += (spherical.radius - currentSpherical.radius) * damp;
  currentSpherical.theta += (spherical.theta - currentSpherical.theta) * damp;
  currentSpherical.phi += (spherical.phi - currentSpherical.phi) * damp;
  currentSpherical.target.lerp(spherical.target, damp);

  updateCameraPosition();

  // Engine spool & airflow update
  if (isPlaying) {
    engine.update(dt, currentRpmFactor);
  }

  // Update telemetry HUD readings
  const baseN1 = isPlaying ? Math.round(2840 * currentRpmFactor + Math.sin(time * 0.003) * 15) : 0;
  const baseN2 = isPlaying ? Math.round(11680 * currentRpmFactor + Math.cos(time * 0.004) * 45) : 0;
  const baseEGT = isPlaying ? Math.round(942 * Math.sqrt(currentRpmFactor) + Math.sin(time * 0.002) * 4) : 24;

  hudN1.innerHTML = `${baseN1.toLocaleString()} <span>RPM</span>`;
  hudN2.innerHTML = `${baseN2.toLocaleString()} <span>RPM</span>`;
  hudEGT.innerHTML = `${baseEGT} <span>&deg;C</span>`;

  updatePins();

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
