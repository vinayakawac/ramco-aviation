/**
 * main.js — boot, scroll wiring, render loop.
 *
 * The page is a stack of sticky beats. Scroll position picks the two beats either side
 * of you and blends their poses, so the aircraft turns continuously rather than snapping
 * between shots. Text is DOM the whole way, so it survives a missing GPU intact.
 */

import * as THREE from 'three';
import Lenis from 'lenis';
import { animate, stagger } from 'animejs';

import { BEATS, CHAPTERS, WINDOWS, ALL_CALLOUTS, getZoneData } from './ui/chapters.js';
import { Stage } from './scene/stage.js';

const scroll = document.getElementById('scroll');
const nav = document.getElementById('nav');
const cue = document.getElementById('cue');
const roPhase = document.getElementById('ro-phase');
const roAtt = document.getElementById('ro-att');
const roAlt = document.getElementById('ro-alt');

const platformDeck = document.getElementById('platform-deck');
const zoneLeadCard = document.getElementById('zone-lead-card');
const zoneRightCard = document.getElementById('zone-right-card');

const pLeadNum = document.getElementById('p-lead-num');
const pLeadZone = document.getElementById('p-lead-zone');
const pLeadTitle = document.getElementById('p-lead-title');
const pLeadWhy = document.getElementById('p-lead-why');
const pLeadPain = document.getElementById('p-lead-pain');
const pLeadSrc = document.getElementById('p-lead-src');

const pRightNum = document.getElementById('p-right-num');
const pRightTitle = document.getElementById('p-right-title');
const pRightItems = document.getElementById('p-right-items');
const pRightCap = document.getElementById('p-right-cap');
const pRightExpr = document.getElementById('p-right-expr');

let currentActiveZoneKey = null;
let drawnCalloutId = null;

function updatePlatformDeck(key) {
  if (currentActiveZoneKey === key) return;
  currentActiveZoneKey = key;

  const data = getZoneData(key);
  if (!data || !data.z) return;

  const { z, a, srcUrl } = data;

  // Populate Left Card
  pLeadNum.textContent = z.n.padStart(2, '0');
  pLeadZone.innerHTML = z.zone;
  pLeadTitle.innerHTML = z.title;
  pLeadWhy.textContent = z.why;
  pLeadPain.textContent = z.pain;
  pLeadSrc.textContent = `Source: ramco.com${z.src}`;
  pLeadSrc.href = srcUrl;

  // Populate Right Card
  pRightNum.textContent = z.n.padStart(2, '0');
  pRightTitle.innerHTML = z.title;
  pRightItems.innerHTML = z.items.map((i) => `<li>${i}</li>`).join('') +
    (z.note ? `<li style="color:var(--muted)">${z.note}</li>` : '');
  pRightCap.textContent = a.cap;
  pRightExpr.textContent = a.expr;

  // Anime.js In-Place Spring/Pop Animations!
  animate(zoneLeadCard, {
    opacity: [0, 1],
    translateX: [-28, 0],
    scale: [0.97, 1],
    ease: 'outQuart',
    duration: 400,
  });

  animate(zoneRightCard, {
    opacity: [0, 1],
    translateX: [36, 0],
    scale: [0.97, 1],
    ease: 'outQuart',
    duration: 420,
  });

  animate('#p-right-items li', {
    opacity: [0, 1],
    translateX: [18, 0],
    delay: stagger(28, { start: 90 }),
    ease: 'outQuart',
    duration: 350,
  });
}

const schematicGroup = document.getElementById('schematic-lines-group');

schematicGroup.innerHTML = ALL_CALLOUTS.map((c) => `
  <g class="schematic-item" id="schematic-${c.id}" data-id="${c.id}">
    <circle class="schematic-pulse" cx="0" cy="0" r="14" />
    <circle class="schematic-dot" cx="0" cy="0" r="3.5" />
    <path class="schematic-path" d="" />
    <g class="schematic-plate">
      <line class="schematic-tick" x1="0" y1="0" x2="0" y2="0" />
      <text class="schematic-label" x="0" y="0">${c.num} · ${c.label}</text>
    </g>
  </g>
`).join('');

const schematicItems = ALL_CALLOUTS.map((c) => ({
  ...c,
  el: document.getElementById(`schematic-${c.id}`),
  pulse: document.querySelector(`#schematic-${c.id} .schematic-pulse`),
  dot: document.querySelector(`#schematic-${c.id} .schematic-dot`),
  path: document.querySelector(`#schematic-${c.id} .schematic-path`),
  plate: document.querySelector(`#schematic-${c.id} .schematic-plate`),
  tick: document.querySelector(`#schematic-${c.id} .schematic-tick`),
  labelEl: document.querySelector(`#schematic-${c.id} .schematic-label`),
}));

schematicItems.forEach((item) => {
  item.el?.addEventListener('click', () => {
    const targetIdx = BEATS.findIndex((b) => b.id === `zone-${item.id}`);
    if (targetIdx >= 0) window.__oryzo?.goto(targetIdx);
  });
});

/**
 * The corridor between the two cards, in live pixels.
 *
 * Measured rather than assumed: the cards are a responsive grid, so a hard-coded column
 * position is wrong at every width except the one it was tuned at — which is how the
 * leader labels ended up printed across the copy. Everything an annotation draws has to
 * stay inside this band.
 */
function readCorridor() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 34;
  const left = zoneLeadCard.getBoundingClientRect();
  const right = zoneRightCard.getBoundingClientRect();
  return {
    vw,
    vh,
    x0: (left.width ? left.right : vw * 0.24) + pad,
    x1: (right.width ? right.left : vw * 0.76) - pad,
    y0: 104,
    y1: vh - 96,
  };
}

const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Lay out one leader line: anchor dot → 45° elbow → horizontal run → label plate.
 *
 * The label is placed on whichever side of the anchor has more corridor, so a callout on
 * a feature near the right card reaches back across the aircraft instead of underlining
 * the copy. Everything is clamped into the corridor, so nothing can escape onto a card.
 */
function layoutLeader(item, tx, ty, corridor) {
  // Mono at 0.78rem with 0.15em tracking runs ~9.6px a glyph; the spec line is smaller
  // but uppercase. Under-measuring here is what lets a label slide under the right card.
  // Mono at 0.78rem with 0.15em tracking runs ~9.6px a glyph, plus the number prefix.
  // Entities are decoded first: "&amp;" is four characters wider as source than as a
  // rendered glyph, and under-measuring is what lets a label slide under the right card.
  const labelLen = item.label.replace(/&[a-z]+;/g, ' ').length;
  const textW = labelLen * 9.6 + 50;
  const spaceRight = corridor.x1 - tx;
  const spaceLeft = tx - corridor.x0;
  const dir = spaceRight >= textW + 90 || spaceRight >= spaceLeft ? 1 : -1;

  // Push the plate clear of the anchor vertically so the line has a visible diagonal.
  const rise = ty > corridor.vh * 0.34 ? -172 : 150;
  const ly = clampTo(ty + rise, corridor.y0 + 24, corridor.y1 - 24);

  const run = Math.min(Math.abs(ly - ty) * 0.9 + 54, 190);
  let ex = tx + dir * run;
  let lx = tx + dir * (run + 46);

  if (dir > 0) {
    lx = Math.min(lx, corridor.x1 - textW);
    ex = Math.min(ex, lx - 20);
  } else {
    lx = Math.max(lx, corridor.x0 + textW);
    ex = Math.max(ex, lx + 20);
  }

  item.path.setAttribute('d', `M ${tx} ${ty} L ${ex} ${ly} L ${lx} ${ly}`);

  const anchorEnd = dir > 0 ? 'start' : 'end';
  const tickX2 = lx + dir * Math.min(textW, 132);
  item.tick.setAttribute('x1', lx);
  item.tick.setAttribute('y1', ly + 5);
  item.tick.setAttribute('x2', tickX2);
  item.tick.setAttribute('y2', ly + 5);

  item.labelEl.setAttribute('text-anchor', anchorEnd);
  item.labelEl.setAttribute('x', lx);
  item.labelEl.setAttribute('y', ly - 9);
}

const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/* ---------- 1. content ---------- */

scroll.innerHTML = BEATS.map(
  (b, i) => `<section class="beat" id="beat-${b.id}" data-chapter="${b.chapter}"
                data-index="${i}"${b.flow ? '' : ` style="height:${b.vh}vh"`}>${b.html}</section>`
).join('');

const sections = [...scroll.querySelectorAll('.beat')];

nav.innerHTML = CHAPTERS.map(
  (c, i) => `<button type="button" data-chapter="${c}" aria-current="${i === 0}">${c}</button>`
).join('');

nav.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const target = sections.find((s) => s.dataset.chapter === b.dataset.chapter);
  if (target) window.scrollTo({ top: target.offsetTop + 4, behavior: 'smooth' });
});

const navButtons = [...nav.querySelectorAll('button')];

/* Reveal each beat's text as it takes the screen. */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('on', e.isIntersecting)),
    { rootMargin: '-25% 0px -25% 0px' }
  );
  sections.forEach((s) => io.observe(s));

  // Meters fill and count up once the results beat is on screen.
  const io2 = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        if (el.classList.contains('fill')) el.style.width = `${el.dataset.w}%`;
        if (el.dataset.pct !== undefined) countUp(el, +el.dataset.pct);
        io2.unobserve(el);
      }),
    { threshold: 0.5 }
  );
  document.querySelectorAll('.fill, [data-pct]').forEach((el) => io2.observe(el));
} else {
  sections.forEach((s) => s.classList.add('on'));
  document.querySelectorAll('.fill').forEach((f) => (f.style.width = `${f.dataset.w}%`));
  document.querySelectorAll('[data-pct]').forEach((e) => (e.textContent = `${e.dataset.pct}%`));
}

function countUp(el, target) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = `${target}%`;
    return;
  }
  const dur = 900;
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    el.textContent = `${Math.round(target * (1 - Math.pow(1 - p, 3)))}%`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- 2. capability check ---------- */

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!hasWebGL()) {
  enableFlat('WebGL unavailable');
} else {
  boot();
}

/** No canvas: unpin the beats and let the page read as a document. */
function enableFlat(reason) {
  document.body.classList.add('flat');
  sections.forEach((s) => {
    s.style.height = 'auto';
    s.classList.add('on');
  });
  document.querySelectorAll('.fill').forEach((f) => (f.style.width = `${f.dataset.w}%`));
  document.querySelectorAll('[data-pct]').forEach((e) => (e.textContent = `${e.dataset.pct}%`));
  cue?.classList.add('hide');
  if (reason) console.info(`[ramco-oryzo] flat mode: ${reason}`);
}

/* ---------- 3. the stage ---------- */

function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.getElementById('stage').appendChild(renderer.domElement);

  const stage = new Stage(renderer);

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stage.resize(w, h);
  };
  window.addEventListener('resize', onResize, { passive: true });
  onResize();

  const lenis = reduced ? null : new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false });

  const clock = new THREE.Clock();
  let running = true;

  function frame(time) {
    if (!running) return;
    lenis?.raf(time);

    const scrollY = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const t = max > 0 ? clamp01(scrollY / max) : 0;

    // Calculate dynamic center points of each beat section in real DOM pixels
    const centers = sections.map((s) => s.offsetTop + s.offsetHeight / 2 - window.innerHeight / 2);

    let i = 0;
    while (i < centers.length - 1 && scrollY > centers[i + 1]) i++;

    const aPose = BEATS[i].pose;
    const bPose = BEATS[Math.min(i + 1, BEATS.length - 1)].pose;

    let k = 0;
    if (i < centers.length - 1) {
      const span = centers[i + 1] - centers[i];
      if (span > 0) {
        const rawP = clamp01((scrollY - centers[i]) / span);
        // Hold for the first 12% and last 12% so the angle is fully locked while reading,
        // transitioning smoothly during the scroll passage between sections.
        const HOLD = 0.12;
        if (rawP <= HOLD) {
          k = 0;
        } else if (rawP >= 1 - HOLD) {
          k = 1;
        } else {
          k = smoothstep((rawP - HOLD) / (1 - 2 * HOLD));
        }
      }
    }

    stage.applyPose(aPose, bPose, reduced ? 0 : k);
    stage.tick(clock.getElapsedTime());

    // Chrome.
    const active = k < 0.5 ? BEATS[i] : BEATS[Math.min(i + 1, BEATS.length - 1)];
    navButtons.forEach((btn) =>
      btn.setAttribute('aria-current', String(btn.dataset.chapter === active.chapter))
    );
    cue.classList.toggle('hide', t > 0.04);
    // The scrim strength differs between the opening shots and the copy-heavy beats.
    if (document.body.dataset.beat !== active.id) document.body.dataset.beat = active.id;

    roPhase.textContent = active.chapter.toUpperCase();
    roAtt.textContent = String(
      Math.round((((-stage.pose.yaw * 180) / Math.PI) % 360 + 360) % 360)
    ).padStart(3, '0');
    roAlt.textContent = String(Math.round(t * 34000)).padStart(5, '0');

    renderer.render(stage.scene, stage.camera);

    // Render Anime.js-style technical schematic lines and labels across the aircraft
    if (active.chapter === 'Platform') {
      platformDeck.classList.add('on');
      const activeKey = active.id.replace('zone-', '');
      updatePlatformDeck(activeKey);

      schematicGroup.setAttribute('opacity', '1');

      // One annotated callout per beat. The other anchors stay as bare dots — enough to
      // read as a survey of the airframe, not enough to compete with the copy or wander
      // over it. Every label is laid out inside the measured corridor.
      const corridor = readCorridor();

      schematicItems.forEach((item) => {
        const anchor = stage.landmarks?.[item.mark] ?? item.anchor;
        const screenPt = stage.projectToScreen(anchor);
        const isActive = item.id === activeKey;

        if (!screenPt || (!isActive && !screenPt.visible)) {
          item.el.style.display = 'none';
          return;
        }
        item.el.style.display = '';
        item.el.classList.toggle('active', isActive);

        const tx = clampTo(screenPt.x, 12, corridor.vw - 12);
        const ty = clampTo(screenPt.y, 12, corridor.vh - 12);

        item.dot.setAttribute('cx', tx);
        item.dot.setAttribute('cy', ty);

        // A dot sitting under a card is just a smudge on the glass — drop it.
        const underCard = tx < corridor.x0 || tx > corridor.x1;
        item.dot.setAttribute('opacity', isActive ? 1 : underCard ? 0 : 1);

        if (!isActive) {
          item.path.setAttribute('d', '');
          item.plate.style.opacity = '0';
          return;
        }

        item.plate.style.opacity = '1';
        item.pulse.setAttribute('cx', tx);
        item.pulse.setAttribute('cy', ty);
        layoutLeader(item, tx, ty, corridor);

        if (item.id !== drawnCalloutId) {
          drawnCalloutId = item.id;
          const totalLen = item.path.getTotalLength ? item.path.getTotalLength() : 240;
          item.path.style.strokeDasharray = `${totalLen}`;
          animate(item.path, { strokeDashoffset: [totalLen, 0], ease: 'outQuart', duration: 480 });
          animate(item.plate, { opacity: [0, 1], ease: 'outQuart', duration: 420, delay: 160 });
        }
      });
    } else {
      platformDeck.classList.remove('on');
      currentActiveZoneKey = null;
      drawnCalloutId = null;
      schematicGroup.setAttribute('opacity', '0');
      schematicItems.forEach((item) => item.el.classList.remove('active'));
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  });

  window.__oryzo = {
    stage,
    renderer,
    beats: BEATS,
    goto(n) {
      const el = sections[n];
      if (!el) return;
      const y = el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2;
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    },
  };
}
