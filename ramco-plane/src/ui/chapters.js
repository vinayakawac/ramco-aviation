/**
 * chapters.js — three chapters, built from src/data/ramco.js.
 *
 *   01 INTRO      the aircraft in the hangar, then the turn into the void
 *   02 PLATFORM   the seven coverage zones, one beat each
 *   03 RESULTS    the published outcomes, the $6M stat and the G2 reviews
 *
 * Each chapter is made of "beats". A beat owns a slice of the scroll, a block of DOM,
 * and a pose for the aircraft. Text lives in the DOM (selectable, searchable, readable
 * without WebGL); the canvas behind it only ever carries the subject.
 */

import * as D from '../data/ramco.js';

/* ---------- helpers ---------- */

const label = (t) => `<p class="label fx">${t}</p>`;
const src = (path) =>
  `<a class="srclink fx" href="${D.srcUrl(path)}" target="_blank" rel="noopener">Source: ramco.com${path}</a>`;

/**
 * Short technical annotations pinned bottom-right, in the reference's house style.
 * Each one restates something the source page already says — none introduces a claim.
 */
const ANNOT = {
  deck: { expr: 'EFB ⇄ MRO', cap: 'Offline, then synced back' },
  line: { expr: 'TAT ≈ minutes', cap: 'Billed like any other job' },
  component: { expr: 'receipt → ARC', cap: 'A closed loop, in one record' },
  engine: { expr: 'LLP → build value', cap: 'Disposition decided against price' },
  hangar: { expr: 'routine + non-routine', cap: 'Both estimated automatically' },
  records: { expr: 'As-Built ≠ Allowable ≠ Actual', cap: 'Tracked separately' },
  supply: { expr: 'demand → PO', cap: 'One touch, off the maintenance plan' },
};

/**
 * Where each zone lands on the airframe.
 *
 *   mark    a measured landmark (see measureLandmarks), resolved once the model loads
 *   anchor  the fallback used before that, and if the mark can't be found
 *
 * The label itself is not written here — it is the zone's own title, so the leader line
 * and the card headline can never drift apart.
 */
const CALLOUT_SITES = {
  deck: { mark: 'deck', anchor: [0.0, 1.5, 15.4] },
  line: { mark: 'stand', anchor: [0.0, -2.2, 6.5] },
  component: { mark: 'sharklet', anchor: [13.2, 0.2, -1.4] },
  engine: { mark: 'nacelle', anchor: [6.9, -2.6, 4.9] },
  hangar: { mark: 'centre', anchor: [0.0, 0.0, -2.0] },
  records: { mark: 'fin', anchor: [0.0, 6.4, -15.2] },
  supply: { mark: 'hold', anchor: [2.4, -2.6, 3.2] },
};

export const ALL_CALLOUTS = D.ORDER.map((id) => ({
  id,
  num: D.ZONES[id].n.padStart(2, '0'),
  label: D.ZONES[id].title,
  ...CALLOUT_SITES[id],
}));

export function zoneCallout(key) {
  const c = ALL_CALLOUTS.find((item) => item.id === key);
  return c || null;
}

/* ---------- beat builders ---------- */

function heroBeat() {
  const stats = D.HERO.stats
    .map((s) => `<div><b>${s.value}</b><span>${s.label}</span></div>`)
    .join('');

  return `
    <div class="beat-inner hero">
      <div class="hero-top">
        ${label(D.HERO.pill)}
        <p class="label fx">${D.META.brand.name} ${D.META.brand.unit} — Est. fleet 4,000+</p>
      </div>

      <div class="hero-top">
        <h1 class="display fx">Wheels<br>up.</h1>
        <p class="hero-lede fx">${D.HERO.sub}</p>
      </div>

      <div class="hero-foot">
        <div class="statcard fx">
          <div class="stats">${stats}</div>
        </div>
        <div class="statcard fx">
          <p class="label">${D.TRUST.eyebrow}</p>
          <ul class="trust">${D.TRUST.names.map((n) => `<li>${n}</li>`).join('')}</ul>
        </div>
      </div>
    </div>`;
}

function revealBeat() {
  return `
    <div class="beat-inner reveal">
      <h2 class="display fx">Isn’t just<br>maintenance<br>software.</h2>
      <div class="body fx">
        <p>${D.HERO.h1}</p>
        <p style="color:var(--muted);font-size:.88rem">${D.PROBLEM.standfirst}</p>
      </div>
    </div>`;
}

export function getZoneData(key) {
  const z = D.ZONES[key];
  const a = ANNOT[key];
  return { z, a, srcUrl: D.srcUrl(z?.src || '') };
}

function zoneBeat(key) {
  return `<div class="beat-spacer"></div>`;
}

function resultsBeat() {
  const meters = D.METERS.map(
    (m) => `<div class="meter">
      <div class="top">
        <span class="pct" data-pct="${m.v}">0%</span>
        <span class="lbl">${m.l}</span>
      </div>
      <div class="track"><i class="fill" data-w="${m.v}"></i></div>
      <small>${m.s}</small>
    </div>`
  ).join('');

  return `
    <div class="beat-inner flow results">
      <div class="results-head fx">
        <p class="label">${D.RESULTS.eyebrow} — ${D.RESULTS.h2}</p>
        <p class="label">Published by Ramco</p>
      </div>

      <div class="rgrid">
        <div class="fx">
          ${meters}
          <p class="caveat">${D.RESULTS.caveat}</p>
        </div>

        <div></div>

        <div class="fx">
          <div class="bigstat">
            <b>${D.BIGSTAT.value}</b>
            <h4>${D.BIGSTAT.title}</h4>
            <p>${D.BIGSTAT.body}</p>
          </div>
        </div>
      </div>
    </div>`;
}

function customersBeat() {
  const quotes = D.QUOTES.map(
    (q) => `<div class="customer-card fx">
      <div class="stars">${'★'.repeat(q.stars)} <em>[ ${q.stars}/5 ]</em></div>
      <blockquote>“${q.body}”</blockquote>
      <div class="card-author">
        <b>${q.by}</b>
        <span>${q.meta}</span>
      </div>
    </div>`
  ).join('');

  const customers = D.CUSTOMERS.map(
    (c) => `<div class="story-card fx">
      <b>${c.title}</b>
      <p>${c.body}</p>
    </div>`
  ).join('');

  return `
    <div class="beat-inner flow customers-section">
      <div class="customers-head fx">
        <p class="label">04 CUSTOMERS</p>
        <h2 class="display">Airlines, engine shops, rotary fleets, defense primes, a national regulator</h2>
        <p class="customers-lead">These operators have almost nothing in common except the problem — which is the strongest argument there is for a single platform.</p>
      </div>

      <div class="customers-container">
        <div class="reviews-column">
          <p class="column-eyebrow">VERIFIED OPERATOR REVIEWS · G2 CROWD</p>
          <div class="reviews-grid">
            ${quotes}
          </div>
        </div>

        <div class="stories-column">
          <p class="column-eyebrow">GLOBAL OPERATOR PROFILES</p>
          <div class="stories-grid">
            ${customers}
          </div>
          <div class="cta-box fx">
            <a class="btn solid" href="${D.CTA.buttons[0].href}" target="_blank" rel="noopener">${D.CTA.buttons[0].label}</a>
            <a class="btn" href="${D.CTA.buttons[1].href}" target="_blank" rel="noopener">${D.CTA.buttons[1].label}</a>
          </div>
        </div>
      </div>
    </div>`;
}

function faqBeat() {
  const items = D.FAQ.map(
    (item, idx) => `
    <details class="faq-item" ${idx === 0 ? 'open' : ''}>
      <summary class="faq-summary">
        <span class="faq-question">${item.q}</span>
        <span class="faq-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </summary>
      <div class="faq-answer">
        <p>${item.a}</p>
      </div>
    </details>`
  ).join('');

  return `
    <div class="beat-inner flow faq-section">
      <div class="faq-container fx">
        <div class="faq-header">
          <p class="faq-eyebrow">${D.FAQ_INTRO.eyebrow}</p>
          <h2 class="faq-title">${D.FAQ_INTRO.h2}</h2>
        </div>
        <div class="faq-accordion">
          ${items}
        </div>
        <div class="faq-footer fx">
          <p class="label">Ready to see Ramco Aviation in action?</p>
          <div class="cta-box">
            <a class="btn solid" href="${D.CTA.buttons[0].href}" target="_blank" rel="noopener">${D.CTA.buttons[0].label}</a>
            <a class="btn" href="${D.CTA.buttons[1].href}" target="_blank" rel="noopener">${D.CTA.buttons[1].label}</a>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------- the beat list ---------- */

/**
 * `pose` is the aircraft's target at this beat, resolved by the stage:
 *   yaw / pitch  radians
 *   dist         camera distance
 *   height       camera height above the aircraft's centre
 *   focus        [x,y,z] offset of the look target, for framing a specific area
 *   dark         0 = hangar-lit environment, 1 = full void
 */
export const BEATS = [
  {
    id: 'hero',
    chapter: 'Intro',
    vh: 165,
    html: heroBeat(),
    pose: { yaw: -0.62, pitch: 0.08, roll: -0.04, dist: 70, height: 5, drop: 0, focus: [0, 0, 0], dark: 0 },
  },
  {
    id: 'reveal',
    chapter: 'Intro',
    vh: 190,
    html: revealBeat(),
    pose: { yaw: -2.15, pitch: -0.28, roll: 0.22, dist: 64, height: -6, drop: 1, focus: [0, 0.5, 3], dark: 1 },
  },

  ...D.ORDER.map((key) => ({
    id: `zone-${key}`,
    chapter: 'Platform',
    vh: 150,
    html: zoneBeat(key),
    pose: zonePose(key),
    callout: zoneCallout(key),
  })),

  {
    id: 'results',
    chapter: 'Results',
    flow: true,
    vh: 0,
    html: resultsBeat(),
    pose: { yaw: -1.20, pitch: 0.06, roll: 0.0, dist: 70, height: 1.2, shiftX: 0.0, drop: 0, focus: [0, 0.4, 0], dark: 1 },
  },

  {
    id: 'customers',
    chapter: 'Customers',
    flow: true,
    vh: 0,
    html: customersBeat(),
    pose: { yaw: -0.58, pitch: 0.05, roll: -0.03, dist: 60, height: 4.5, shiftX: 0.30, drop: 0, focus: [0, 0, -3], dark: 1 },
  },

  {
    id: 'faq',
    chapter: 'FAQ',
    flow: true,
    vh: 0,
    html: faqBeat(),
    // Aircraft turns directly head-on towards the user and flies through/past the screen into the forefront
    pose: { yaw: 0.0, pitch: 0.0, roll: 0.0, dist: -68, height: 7.0, shiftX: 0.0, shiftY: 0.15, drop: 0, focus: [0, 0, 0], dark: 1 },
  },
];

/**
 * Each zone features a dedicated, dramatic perspective tailored to its subject:
 *   deck:      Cockpit & Flight Deck Close-Up (nose & windshield detail)
 *   line:      Pure Side Profile (90° horizontal silhouette)
 *   component: Wing Close-Up (swept wing chord, trailing edge, winglet & LRU bay)
 *   engine:    Turbine Nacelle & Fan Close-Up (low-angle intake & pylon)
 *   hangar:    Full Top-Down Bird's-Eye View (complete planform inspection)
 *   records:   Empennage & Tail Cone View (vertical stabilizer & aft fuselage)
 *   supply:    Swept Wing Root & Belly Perspective (low sweeping undercarriage chord)
 */
function zonePose(key) {
  const POSES = {
    // Front three-quarter from above the shoulder: cockpit glass and the nose taper
    // read, the fuselage falls away behind as a receding line rather than a wall.
    deck: {
      yaw: -0.98,
      pitch: -0.09,
      roll: 0.05,
      dist: 26,
      height: 4.2,
      side: 1.5,
      tilt: -0.4,
      drop: 0,
      focus: [0, 1.0, 14.2],
      dark: 1,
    },

    // Pure side elevation — the one shot that should read like a drawing, not a photo.
    line: {
      yaw: -Math.PI / 2,
      pitch: 0.0,
      roll: 0.0,
      dist: 76,
      height: 2.5,
      side: 0,
      tilt: 0,
      drop: 0,
      focus: [0, 0, 0],
      dark: 1,
    },

    // Down the starboard wing from behind it: sweep, trailing edge and sharklet in one
    // diagonal, the fuselage anchoring the far end so the wing has something to belong to.
    component: {
      yaw: -2.05,
      pitch: -0.34,
      roll: 0.12,
      dist: 27,
      height: 6.0,
      side: -1.4,
      tilt: -0.6,
      drop: 0,
      focus: [9.8, -0.2, 0.4],
      dark: 1,
    },

    // Low and forward of the near-side nacelle, looking slightly up: intake lip, pylon and
    // the wing underside above it. The old shot sat inside the cowl, which is why it blew out.
    engine: {
      yaw: -0.62,
      pitch: 0.06,
      roll: -0.05,
      dist: 25,
      height: -2.6,
      side: 1.8,
      tilt: 1.5,
      drop: 0,
      focus: [6.9, -2.0, 2.4],
      dark: 1,
    },

    // True planform. A base check is a whole-aircraft event, so this is the plan drawing:
    // both wings, both engines, the full symmetry, nothing foreshortened.
    hangar: {
      yaw: 0.0,
      pitch: Math.PI / 2,
      roll: 0.0,
      dist: 74,
      height: 0.0,
      side: 0,
      tilt: 0,
      drop: 0,
      focus: [0, 0, 0],
      dark: 1,
    },

    // Rear three-quarter, camera above the tailplane: fin, rudder and tail cone stacked,
    // the fuselage running away toward the nose.
    records: {
      yaw: -2.48,
      pitch: 0.05,
      roll: -0.07,
      dist: 38,
      height: 6.5,
      side: 1.4,
      tilt: 0.6,
      drop: 0,
      focus: [0, 2.4, -12.8],
      dark: 1,
    },

    // From under the forward belly looking aft and up: gear bays, wing root fairing and
    // the holds — the parts of the aircraft supply chain actually feeds.
    supply: {
      yaw: -3.95,
      pitch: 0.26,
      roll: -0.14,
      dist: 44,
      height: -7.0,
      side: 2.0,
      tilt: 2.4,
      drop: 0,
      focus: [0, -1.2, -1.0],
      dark: 1,
    },
  };

  return POSES[key] || {
    yaw: -3.0,
    pitch: 0.1,
    roll: 0,
    dist: 75,
    height: 6,
    drop: 0,
    focus: [0, 0, 0],
    dark: 1,
  };
}

/** Chapter list for the nav, in order, de-duplicated. */
export const CHAPTERS = [...new Set(BEATS.map((b) => b.chapter))];

export const TOTAL_VH = BEATS.reduce((n, b) => n + b.vh, 0);

/** Normalised scroll window per beat. */
export const WINDOWS = (() => {
  let acc = 0;
  return BEATS.map((beat) => {
    const start = acc / TOTAL_VH;
    acc += beat.vh;
    const end = acc / TOTAL_VH;
    return { beat, start, end, mid: (start + end) / 2 };
  });
})();
