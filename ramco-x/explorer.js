/* ============================================================
   Ramco Aviation - platform explorer

   One studio floor with three subjects standing on it, all at true relative
   scale and all present at once:
     airframe   the whole aircraft (zones 1, 2, 3, 5, 6)
     engine     the powerplant on its cradle (zone 4)
     stores     racking and rotable cases (zone 7)

   Nothing is hidden between zones; the camera travels across the floor from
   one subject to the next. Working units are metres.

   Content comes from zones.js. Camera framing and callouts are authored in
   aircraft space; each subject reports its own centre and axes so the same
   numbers mean the same thing whichever one the camera is on.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { ZONES } from './zones.js';
import { createTurbofanEngine } from './engine_model.js';

const root = document.getElementById('explorer');

/* ------------------------------------------------------------
   Procedural maps - panel lines, wear, roughness breakup.
   The GLB ships 95 flat-white materials and one unusable image,
   so surface detail is generated rather than shipped.
   ------------------------------------------------------------ */

function panelCanvas(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');

  g.fillStyle = '#d8d9dc';
  g.fillRect(0, 0, size, size);

  // broad tonal drift so large surfaces are not perfectly flat
  for (let i = 0; i < 26; i++) {
    const r = size * (0.08 + Math.random() * 0.22);
    const grd = g.createRadialGradient(
      Math.random() * size, Math.random() * size, 0,
      Math.random() * size, Math.random() * size, r
    );
    const v = Math.random() > 0.5 ? 255 : 186;
    grd.addColorStop(0, `rgba(${v},${v},${v + 4},0.10)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }

  // panel lines - irregular grid, the way real skin panels run
  g.lineWidth = 1.5;
  g.strokeStyle = 'rgba(96,99,105,0.55)';
  let x = 0;
  while (x < size) {
    x += size * (0.055 + Math.random() * 0.075);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, size); g.stroke();
  }
  let y = 0;
  while (y < size) {
    y += size * (0.075 + Math.random() * 0.11);
    g.beginPath(); g.moveTo(0, y); g.lineTo(size, y); g.stroke();
  }

  // rivet runs at a fixed pitch, independent of the panel spacing above
  g.fillStyle = 'rgba(88,91,97,0.42)';
  for (let ry = size * 0.04; ry < size; ry += size * 0.086) {
    for (let rx = 2; rx < size; rx += 9) g.fillRect(rx, ry, 1.4, 1.4);
  }

  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function roughCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#6a6a6a';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    const r = size * (0.04 + Math.random() * 0.16);
    const cx = Math.random() * size, cy = Math.random() * size;
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    const v = 70 + Math.random() * 110;
    grd.addColorStop(0, `rgba(${v},${v},${v},0.55)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  return c;
}

/* A photographic studio as an equirect map: dark cyclorama, a large key
   softbox high and forward, a cooler fill behind, and floor bounce. The
   softbox is what you see travelling across the metal as it turns. */
function studioCanvas() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');

  const cyc = g.createLinearGradient(0, 0, 0, 512);
  cyc.addColorStop(0.00, '#42464f');
  cyc.addColorStop(0.40, '#23262d');
  cyc.addColorStop(0.52, '#14161a');
  cyc.addColorStop(1.00, '#0b0b0d');
  g.fillStyle = cyc;
  g.fillRect(0, 0, 1024, 512);

  // soft-edged rectangles, not points: a softbox has an edge you can see
  const box = (cx, cy, w, h, a, tint) => {
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
    grd.addColorStop(0, `rgba(${tint},${a})`);
    grd.addColorStop(0.55, `rgba(${tint},${a * 0.45})`);
    grd.addColorStop(1, `rgba(${tint},0)`);
    g.save();
    g.translate(cx, cy);
    g.scale(1, h / w);
    g.translate(-cx, -cy);
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 512);
    g.restore();
  };

  box(300, 96, 250, 130, 1.0, '255,255,255');   // key, high and forward
  box(760, 150, 200, 110, 0.5, '176,198,226');  // fill, cooler, behind
  box(520, 60, 150, 70, 0.35, '255,250,240');   // top strip

  const bounce = g.createLinearGradient(0, 380, 0, 512);
  bounce.addColorStop(0, 'rgba(0,0,0,0)');
  bounce.addColorStop(1, 'rgba(150,155,166,0.42)');
  g.fillStyle = bounce;
  g.fillRect(0, 0, 1024, 512);

  return c;
}

function fadeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0.00, 'rgba(0,0,0,0)');
  grd.addColorStop(0.42, 'rgba(0,0,0,0.12)');
  grd.addColorStop(0.72, 'rgba(0,0,0,0.80)');
  grd.addColorStop(1.00, 'rgba(0,0,0,1)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

/* Bay markings. Without them the mirror has no surface the eye can find, and
   everything standing on it reads as floating. `bays` are [x, z, w, d] in metres. */
function markingsCanvas(bays, extent, size = 2048) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const px = size / extent;
  const X = (m) => size / 2 + m * px;

  g.clearRect(0, 0, size, size);

  // a coarse grid, the way a poured floor is scored
  g.strokeStyle = 'rgba(255,255,255,0.045)';
  g.lineWidth = 2;
  for (let m = -extent / 2; m <= extent / 2; m += 10) {
    g.beginPath(); g.moveTo(X(m), 0); g.lineTo(X(m), size); g.stroke();
    g.beginPath(); g.moveTo(0, X(m)); g.lineTo(size, X(m)); g.stroke();
  }

  for (const [bx, bz, bw, bd] of bays) {
    const w = bw * px, d = bd * px;
    const x = X(bx) - w / 2, y = X(bz) - d / 2;

    // bay outline
    g.strokeStyle = 'rgba(255,255,255,0.20)';
    g.lineWidth = 4;
    g.strokeRect(x, y, w, d);

    // corner ticks, heavier than the outline
    g.strokeStyle = 'rgba(255,255,255,0.42)';
    g.lineWidth = 7;
    const t = Math.min(w, d) * 0.16;
    for (const [cx, cy, dx, dy] of [
      [x, y, 1, 1], [x + w, y, -1, 1], [x, y + d, 1, -1], [x + w, y + d, -1, -1],
    ]) {
      g.beginPath();
      g.moveTo(cx + dx * t, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + dy * t);
      g.stroke();
    }

    // centreline
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 3;
    g.setLineDash([26, 22]);
    g.beginPath(); g.moveTo(X(bx), y); g.lineTo(X(bx), y + d); g.stroke();
    g.setLineDash([]);
  }
  return c;
}

function shadowCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0.00, 'rgba(0,0,0,0.78)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.32)');
  grd.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return c;
}

/* ------------------------------------------------------------ */

function boot() {
  const canvas = document.getElementById('scene');
  const viewport = document.getElementById('viewport');
  const railEl = document.getElementById('rail');
  const readoutEl = document.getElementById('readout');
  const pinsEl = document.getElementById('pins');
  const loadEl = document.getElementById('vpLoad');
  const tailEl = document.getElementById('vpTail');
  const liveEl = document.getElementById('liveModule');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SUBJECT_LABEL = { airframe: 'Airframe', engine: 'Powerplant', stores: 'Stores' };
  let active = 3; // Engine MRO - the zone Ramco calls its most specialised

  /* ---------- rail + readout (work with or without WebGL) ---------- */

  ZONES.forEach((z, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rail-item';
    b.innerHTML =
      `<span class="rail-no">${z.n}</span>` +
      `<span class="rail-txt"><b>${z.title}</b><i>${z.zone}</i></span>`;
    b.addEventListener('click', () => select(i));
    railEl.appendChild(b);
  });

  function paint(i) {
    const z = ZONES[i];
    [...railEl.children].forEach((el, n) => el.classList.toggle('on', n === i));
    liveEl.textContent = z.title;
    tailEl.textContent = z.scope;
    readoutEl.innerHTML =
      `<span class="zone-tag"><i>${z.n}</i>${z.zone}</span>` +
      `<h3>${z.title}</h3>` +
      `<div class="tel">` +
        `<span>ZONE<b>${z.n} / ${ZONES.length}</b></span>` +
        `<span>SUBJECT<b>${SUBJECT_LABEL[z.subject]}</b></span>` +
        `<span>COVERAGE<b>${z.items.length} published</b></span>` +
      `</div>` +
      `<div class="painline"><b>What it costs you today</b>${z.pain}</div>` +
      `<p class="why">${z.why}</p>` +
      `<ul class="ticks">${z.items.map((t) => `<li>${t}</li>`).join('')}</ul>` +
      (z.note ? `<p class="zone-note">${z.note}</p>` : '') +
      (z.sourceUrl
        ? `<div style="margin-top: 16px; font-size: 11px; font-family: var(--f-mono); color: var(--fg-dim);"><a href="${z.sourceUrl}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:4px; color: var(--fg-mid); border-bottom: 1px dashed rgba(255,255,255,0.25);"><span>Source: ramco.com product documentation</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></div>`
        : '') +
      (z.key === 'engine'
        ? `<div style="margin-top: 18px;"><a class="btn btn-sm" href="engine.html" style="width:100%; display:inline-flex; justify-content:center; align-items:center; gap:8px; text-decoration:none;"><span>Inspect 3D Cutaway Engine</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></div>`
        : '');
    readoutEl.scrollTop = 0;
  }

  /* ---------- WebGL ---------- */

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    viewport.classList.add('no-gl');
    loadEl.remove();
    paint(active);
    return;
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 900);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = new THREE.CanvasTexture(studioCanvas());
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();

  /* three-point studio rig */
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(40, 60, 45);
  const fill = new THREE.DirectionalLight(0xdfe6f5, 2.4);
  fill.position.set(-50, 30, -55);
  const bounce = new THREE.HemisphereLight(0xcdd6e6, 0x0b0b0d, 0.9);
  scene.add(key, fill, bounce);

  const mapPanel = new THREE.CanvasTexture(panelCanvas());
  mapPanel.wrapS = mapPanel.wrapT = THREE.RepeatWrapping;
  mapPanel.repeat.set(3, 3);
  mapPanel.colorSpace = THREE.SRGBColorSpace;
  mapPanel.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const mapRough = new THREE.CanvasTexture(roughCanvas());
  mapRough.wrapS = mapRough.wrapT = THREE.RepeatWrapping;
  mapRough.repeat.set(3, 3);

  const skin = new THREE.MeshStandardMaterial({
    color: 0xc9ccd4, map: mapPanel, roughness: 0.34,
    roughnessMap: mapRough, metalness: 0.72, envMapIntensity: 2.4,
  });

  /* ---------- the space ----------
     A dark polished floor, large enough that its edges never enter frame,
     with the reflection faded out well before they would. */

  const world = new THREE.Group();
  scene.add(world);

  const FLOOR = 300;
  const floor = new Reflector(new THREE.PlaneGeometry(FLOOR, FLOOR), {
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x4c525c,
  });
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);

  const fadeTex = new THREE.CanvasTexture(fadeCanvas());
  const fade = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR, FLOOR),
    new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false })
  );
  fade.rotation.x = -Math.PI / 2;
  fade.position.y = 0.03;
  fade.renderOrder = 1;
  world.add(fade);

  /* Where each subject stands, in metres. The aircraft is at the origin; the
     other two sit clear of its wingtips. */
  const SPOTS = { airframe: [0, 0], engine: [32, -7], stores: [-32, 5] };

  // a work light over each bay, so nothing at the edge of frame goes black
  for (const [sx, sz] of Object.values(SPOTS)) {
    const pool = new THREE.SpotLight(0xfff2e2, 900, 160, 0.85, 0.7, 1.6);
    pool.position.set(sx + 8, 34, sz + 12);
    pool.target.position.set(sx, 2, sz);
    world.add(pool, pool.target);
  }

  const shadowTex = new THREE.CanvasTexture(shadowCanvas());
  const bays = [];

  function paintFloor() {
    const tex = new THREE.CanvasTexture(markingsCanvas(bays, FLOOR));
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const marks = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR, FLOOR),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    marks.rotation.x = -Math.PI / 2;
    marks.position.y = 0.02;
    world.add(marks);
  }

  const subjects = {};
  let turbofanInstance = null;
  let stage = null;
  let ready = false;

  /* aircraft space (x nose-ward, y up, z starboard) -> world */
  function acToWorld(p, out) {
    const s = stage;
    if (!s) return out.set(0, 0, 0);
    const v = [0, 0, 0];
    v[s.axis.len] = p.x * s.half[s.axis.len] * s.noseSign;
    v[s.axis.up] = p.y * s.half[s.axis.up];
    v[s.axis.side] = p.z * s.half[s.axis.side];
    return out.set(v[0] + s.centre.x, v[1] + s.centre.y, v[2] + s.centre.z);
  }

  /* stand a group on the floor at its spot and record its frame */
  function place(group, name, { noseSign = 1, lenAxis = null, floatHeight = 0 } = {}) {
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const mid = box.getCenter(new THREE.Vector3());
    const [sx, sz] = SPOTS[name];

    group.position.x += sx - mid.x;
    group.position.z += sz - mid.z;
    group.position.y -= box.min.y - floatHeight;      // float above floor if floatHeight > 0
    world.add(group);

    // a contact shadow, because a mirror on its own does not sit a thing down
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.scale.set(size.x * 1.15, size.z * 1.15, 1);
    blob.position.set(sx, 0.06, sz);
    blob.renderOrder = 2;
    world.add(blob);

    bays.push([sx, sz, size.x * 1.35, size.z * 1.35]);

    const half = [size.x * 0.5, size.y * 0.5, size.z * 0.5];
    const len = lenAxis !== null ? lenAxis : (half[2] >= half[0] ? 2 : 0);
    return {
      half,
      noseSign,
      centre: new THREE.Vector3(sx, size.y * 0.5 + floatHeight, sz),
      axis: { len, up: 1, side: len === 2 ? 0 : 2 },
    };
  }

  function show(name) {
    if (subjects[name]) stage = subjects[name];
  }

  /* ---------- subject: stores ----------
     Racking, cartons and two rotable transit cases. Procedural, because
     the repo has no stores model to load. */
  function buildStores() {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0x6f747c, roughness: 0.5, metalness: 0.8 });
    const carton = new THREE.MeshStandardMaterial({ color: 0x8d8f94, roughness: 0.85, metalness: 0.05 });
    const caseMat = new THREE.MeshStandardMaterial({ color: 0xb6bac2, roughness: 0.3, metalness: 0.85 });

    const BAY = 3.4, DEPTH = 2.2, SHELF = 1.5, BAYS = 3, LEVELS = 3;
    const W = BAY * BAYS;

    for (let b = 0; b <= BAYS; b++) {
      for (const dz of [-DEPTH / 2, DEPTH / 2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.13, SHELF * LEVELS + 0.4, 0.13), steel);
        post.position.set(-W / 2 + b * BAY, (SHELF * LEVELS) / 2, dz);
        g.add(post);
      }
    }
    for (let l = 0; l <= LEVELS; l++) {
      const y = l * SHELF;
      for (const dz of [-DEPTH / 2, DEPTH / 2]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 0.13, 0.11, 0.11), steel);
        beam.position.set(0, y, dz);
        g.add(beam);
      }
      if (l < LEVELS) {
        const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, DEPTH), steel);
        deck.position.set(0, y + 0.03, 0);
        g.add(deck);
      }
    }

    // deterministic, so the stores do not reshuffle on every reload
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let l = 0; l < LEVELS; l++) {
      for (let b = 0; b < BAYS; b++) {
        const n = 2 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          const bw = 0.5 + rnd() * 0.55, bh = 0.4 + rnd() * 0.5, bd = 0.6 + rnd() * 0.7;
          const carb = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), carton);
          carb.position.set(
            -W / 2 + b * BAY + 0.5 + i * (BAY - 1) / Math.max(n - 1, 1),
            l * SHELF + bh / 2 + 0.06,
            (rnd() - 0.5) * (DEPTH - bd - 0.2)
          );
          carb.rotation.y = (rnd() - 0.5) * 0.14;
          g.add(carb);
        }
      }
    }

    for (const [x, rot] of [[-2.1, 0.18], [1.4, -0.1]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.2), caseMat);
      c.position.set(x, 0.5, DEPTH / 2 + 1.5);
      c.rotation.y = rot;
      g.add(c);
      for (const dy of [-0.28, 0.28]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.08, 1.25), steel);
        band.position.set(x, 0.5 + dy, DEPTH / 2 + 1.5);
        band.rotation.y = rot;
        g.add(band);
      }
    }
    return g;
  }

  /* ---------- ground support equipment ----------
     A line turn is the zone where the aircraft is surrounded by kit, so zone 2
     gets the kit: a towable ground power unit with its light mast and cable to
     the aircraft, plus a baggage tug and cart. Built in metres, standing on the
     same floor as everything else. */

  const GSE = {
    shell: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.46, metalness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a3e45, roughness: 0.62, metalness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141519, roughness: 0.92, metalness: 0.0 }),
    lamp: new THREE.MeshStandardMaterial({
      color: 0xfff0d6, emissive: 0xffe7bd, emissiveIntensity: 1.1, roughness: 0.3,
    }),
  };

  const box = (w, h, d, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    return m;
  };

  /** Four road wheels on an axle pair. */
  function wheels(g, halfTrack, axles, r, width) {
    const geo = new THREE.CylinderGeometry(r, r, width, 18);
    for (const z of axles) {
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(geo, GSE.rubber);
        w.rotation.z = Math.PI / 2;
        w.position.set(s * halfTrack, r, z);
        g.add(w);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, width + 0.03, 12), GSE.shell);
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(w.position);
        g.add(hub);
      }
    }
  }

  /** Towable ground power unit, mast up. Roughly a 90 kVA diesel set. */
  function groundPowerUnit() {
    const g = new THREE.Group();

    g.add(box(1.5, 0.18, 3.0, GSE.dark, 0, 0.46, 0));            // chassis
    g.add(box(1.36, 1.15, 2.5, GSE.shell, 0, 1.12, -0.05));      // canopy
    g.add(box(1.42, 0.10, 2.56, GSE.dark, 0, 1.72, -0.05));      // roof lip
    g.add(box(0.62, 0.42, 0.5, GSE.dark, 0.32, 1.94, -0.7));     // control head

    // cooling louvres down both flanks
    for (let i = 0; i < 6; i++) {
      const z = -1.05 + i * 0.36;
      for (const sx of [-0.7, 0.7]) g.add(box(0.03, 0.62, 0.22, GSE.dark, sx, 1.12, z));
    }

    // drawbar and tow eye
    g.add(box(0.13, 0.13, 1.5, GSE.dark, 0, 0.42, 2.05));
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 16), GSE.dark);
    eye.position.set(0, 0.42, 2.82);
    g.add(eye);

    wheels(g, 0.72, [-0.85, 0.85], 0.36, 0.24);

    // light mast: the pole and lamp head from the sketch
    g.add(box(0.11, 3.1, 0.11, GSE.dark, -0.5, 3.25, -0.9));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), GSE.lamp);
    head.position.set(-0.5, 4.9, -0.9);
    g.add(head);
    g.add(box(0.42, 0.1, 0.42, GSE.dark, -0.5, 5.16, -0.9));     // cowl over the lamp

    const glow = new THREE.PointLight(0xffe7bd, 90, 22, 2);
    glow.position.set(-0.5, 4.7, -0.9);
    g.add(glow);

    return g;
  }

  /** The power cable, drooping from the unit up to the aircraft receptacle. */
  function powerCable(from, to) {
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.min(from.y, to.y) - 0.55;      // cables sag, they do not arc
    const curve = new THREE.CatmullRomCurve3([from, mid, to]);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.05, 8, false), GSE.dark);
  }

  /** Baggage tug with one cart hitched behind it. */
  function baggageTrain() {
    const g = new THREE.Group();

    const tug = new THREE.Group();
    tug.add(box(1.5, 0.7, 2.5, GSE.shell, 0, 0.75, 0));
    tug.add(box(1.3, 0.75, 1.15, GSE.dark, 0, 1.48, -0.35));     // cab
    tug.add(box(1.36, 0.09, 1.2, GSE.shell, 0, 1.9, -0.35));     // canopy roof
    wheels(tug, 0.68, [-0.8, 0.8], 0.32, 0.22);
    g.add(tug);

    const cart = new THREE.Group();
    cart.add(box(1.6, 0.22, 2.6, GSE.dark, 0, 0.62, 0));         // deck
    for (const [w, d, x, z] of [[0.06, 2.6, -0.8, 0], [0.06, 2.6, 0.8, 0], [1.6, 0.06, 0, -1.3]]) {
      cart.add(box(w, 0.85, d, GSE.dark, x, 1.15, z));           // side and end rails
    }
    cart.add(box(0.85, 0.55, 0.95, GSE.shell, -0.25, 1.0, -0.55));
    cart.add(box(0.7, 0.42, 0.8, GSE.shell, 0.35, 0.94, 0.5));
    wheels(cart, 0.74, [-0.95, 0.95], 0.28, 0.2);
    cart.position.z = 3.1;
    g.add(cart);

    g.add(box(0.1, 0.1, 0.9, GSE.dark, 0, 0.5, 1.75));           // drawbar between them
    return g;
  }

  /* ---------- load ---------- */

  const draco = new DRACOLoader().setDecoderPath('./vendor/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);

  loader.load('./assets/models/b738.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => { if (o.isMesh) o.material = skin; });

    // whichever end carries the fin is the tail
    const mb = new THREE.Box3();
    let finY = -Infinity, finZ = 0;
    model.traverse((o) => {
      if (!o.isMesh) return;
      mb.setFromObject(o);
      if (mb.max.y > finY) { finY = mb.max.y; finZ = mb.getCenter(new THREE.Vector3()).z; }
    });
    const noseSign = finZ > 0 ? -1 : 1;

    subjects.airframe = place(model, 'airframe', { noseSign });

    // High-fidelity cutaway turbofan engine with dual-spool rotation (floating)
    turbofanInstance = createTurbofanEngine({ scale: 0.82, cutawayAngle: Math.PI * 0.5 });
    const turbofanGrp = turbofanInstance.group;
    subjects.engine = place(turbofanGrp, 'engine', { noseSign: 1, lenAxis: 0, floatHeight: 1.4 });

    subjects.stores = place(buildStores(), 'stores', { noseSign: 1, lenAxis: 0 });

    // the kit belongs to the aircraft's bay, so it is positioned in the
    // airframe's own frame rather than in raw world coordinates
    stage = subjects.airframe;
    const at = (x, y, z) => acToWorld({ x, y, z }, new THREE.Vector3());

    const gpu = groundPowerUnit();
    const gpuAt = at(0.62, -1.0, 0.30);
    gpu.position.set(gpuAt.x, 0, gpuAt.z);
    gpu.rotation.y = Math.PI / 2;
    world.add(gpu);

    const nose = at(0.55, -0.86, 0.02);          // receptacle, forward belly
    world.add(powerCable(
      new THREE.Vector3(gpuAt.x - 0.6, 1.7, gpuAt.z),
      new THREE.Vector3(nose.x, nose.y, nose.z)
    ));

    const train = baggageTrain();
    const trainAt = at(0.16, -1.0, 0.42);
    train.position.set(trainAt.x, 0, trainAt.z);
    train.rotation.y = Math.PI / 2;
    world.add(train);

    paintFloor();

    ready = true;
    loadEl.classList.add('gone');
    setTimeout(() => loadEl.remove(), 600);
    select(active, true);
  }, undefined, () => {
    viewport.classList.add('no-gl');
    loadEl.remove();
  });

  /* ---------- camera rig ---------- */

  const cam = { theta: -0.85, phi: 1.36, dist: 2.3, tx: 0, ty: 0, tz: 0 };
  const goal = { ...cam };
  const target = new THREE.Vector3();
  let spin = 0, drift = 0;
  let dragging = false, held = false;
  let px = 0, py = 0;

  function select(i, instant) {
    active = i;
    const z = ZONES[i];
    paint(i);
    if (!ready) { buildPins(z); return; }

    show(subjects[z.subject] ? z.subject : 'airframe');
    buildPins(z);

    goal.theta = z.cam.theta;
    goal.phi = z.cam.phi;
    goal.dist = z.cam.dist;
    const t = acToWorld({ x: z.cam.target[0], y: z.cam.target[1], z: z.cam.target[2] }, new THREE.Vector3());
    goal.tx = t.x; goal.ty = t.y; goal.tz = t.z;
    drift = 0;
    if (instant || reduced) Object.assign(cam, goal);
  }

  /* ---------- zone callouts ----------
     Labels are the seven zone titles, never aircraft part names. On the
     airframe all seven sit where that zone lives, so the aircraft reads as a
     map of the platform; on the engine and stores stages only the zone that
     owns the subject is labelled. */

  let pins = [];

  function buildPins(zone) {
    pinsEl.innerHTML = '';
    const onAirframe = zone.subject === 'airframe';
    const shown = onAirframe ? ZONES : [zone];

    pins = shown.map((z, n) => {
      const at = onAirframe ? z.anchor : (z.subjectAnchor || z.anchor);
      const el = document.createElement('span');
      el.className = 'pin' + (z === zone ? ' live' : '');
      el.style.transitionDelay = `${140 + n * 70}ms`;
      el.innerHTML = `<i></i><button type="button" tabindex="-1">${z.n}</button><em>${z.title}</em>`;
      // seven titles at once collide at most camera angles, so an inactive
      // marker names itself on hover and jumps to its zone on click
      if (z !== zone) el.querySelector('button').addEventListener('click', () => select(ZONES.indexOf(z)));
      pinsEl.appendChild(el);
      return { el, at, vec: new THREE.Vector3() };
    });
    requestAnimationFrame(() => pins.forEach((p) => p.el.classList.add('on')));
  }

  function placePins(w, h) {
    for (const p of pins) {
      const v = acToWorld(p.at, p.vec);
      v.project(camera);
      const inside = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      const sx = (v.x * 0.5 + 0.5) * w;
      p.el.style.opacity = inside ? '' : '0';
      // flip the label to the left of the dot when it would run off the edge
      p.el.classList.toggle('flip', sx > w - 190);
      p.el.style.transform = `translate(${sx}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
    }
  }

  /* ---------- input ---------- */

  const down = (e) => {
    dragging = true; held = true;
    viewport.classList.add('grabbing');
    px = (e.touches ? e.touches[0].clientX : e.clientX);
    py = (e.touches ? e.touches[0].clientY : e.clientY);
  };
  const move = (e) => {
    if (!dragging) return;
    const cx = (e.touches ? e.touches[0].clientX : e.clientX);
    const cy = (e.touches ? e.touches[0].clientY : e.clientY);
    goal.theta -= (cx - px) * 0.006;
    goal.phi = Math.max(0.45, Math.min(2.05, goal.phi - (cy - py) * 0.005));
    px = cx; py = cy;
    if (e.cancelable && e.touches) e.preventDefault();
  };
  const up = () => {
    dragging = false;
    viewport.classList.remove('grabbing');
    setTimeout(() => { held = false; }, 2600);
  };

  viewport.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  viewport.addEventListener('touchstart', down, { passive: true });
  viewport.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', up);

  railEl.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (active + d + ZONES.length) % ZONES.length;
    railEl.children[next].focus();
    select(next);
  });

  /* ---------- resize + loop ---------- */

  let w = 0, h = 0;
  function resize() {
    const r = viewport.getBoundingClientRect();
    if (!r.width || !r.height) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewport);
  resize();

  let visible = true;
  if ('IntersectionObserver' in window) {
    visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '120px' })
      .observe(viewport);
  }

  const lerp = (a, b, t) => a + (b - a) * t;

  renderer.setAnimationLoop(() => {
    if (!visible || !w || !stage) return;

    if (!reduced && !dragging && !held) drift += 0.006;
    spin = 0.17 * Math.sin(drift);

    const t = reduced ? 1 : 0.055;
    cam.theta = lerp(cam.theta, goal.theta, t);
    cam.phi = lerp(cam.phi, goal.phi, t);
    cam.dist = lerp(cam.dist, goal.dist, t);
    cam.tx = lerp(cam.tx, goal.tx, t);
    cam.ty = lerp(cam.ty, goal.ty, t);
    cam.tz = lerp(cam.tz, goal.tz, t);

    // a narrow viewport has to stand further back or the subject runs off frame
    const fit = 1.45 / Math.min(camera.aspect, 1.45);
    const reach = Math.max(stage.half[0], stage.half[2]) * cam.dist * fit;
    const a = cam.theta + spin;
    camera.position.set(
      cam.tx + reach * Math.sin(cam.phi) * Math.cos(a),
      cam.ty + reach * Math.cos(cam.phi),
      cam.tz + reach * Math.sin(cam.phi) * Math.sin(a)
    );
    camera.lookAt(target.set(cam.tx, cam.ty, cam.tz));

    renderer.render(scene, camera);
    if (turbofanInstance) {
      turbofanInstance.update(0.016, 0.7);
    }
    if (ready) placePins(w, h);
  });

  paint(active);
  buildPins(ZONES[active]);
}

if (root) boot();
