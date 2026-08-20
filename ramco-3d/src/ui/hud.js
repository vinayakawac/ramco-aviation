/**
 * hud.js — the fixed overlay: station rail, progress bar, telemetry readout,
 * plus the two scroll-triggered number animations carried over from the source page
 * (the hero count-ups and the results meters).
 */

import { STATIONS } from '../stations/index.js';

/** Phase label shown in the telemetry block, derived from the active station. */
function phaseFor(id) {
  if (['hero', 'problem', 'unified', 'hangar'].includes(id)) return 'HANGAR';
  if (id.startsWith('ladder') || id.startsWith('gate') || id === 'engine') return 'ENGINE SHOP';
  if (['component', 'supply'].includes(id)) return 'SHOP FLOOR';
  if (id === 'doors') return 'PUSHBACK';
  if (id === 'line') return 'ON STAND';
  if (['records', 'compliance'].includes(id)) return 'TAXI';
  if (['deck', 'commercial'].includes(id)) return 'HOLDING POINT';
  if (id === 'results') return 'TAKEOFF ROLL';
  return 'CLIMB';
}

export class Hud {
  /** @param {import('../scroll/timeline.js').Timeline} timeline */
  constructor(timeline, { reduced = false } = {}) {
    this.timeline = timeline;
    this.reduced = reduced;

    this.rail = document.getElementById('rail');
    this.bar = document.getElementById('progressbar');
    this.phase = document.getElementById('tl-phase');
    this.gs = document.getElementById('tl-gs');
    this.alt = document.getElementById('tl-alt');

    this._buildRail();
    this._watchPanels();
  }

  _buildRail() {
    this.rail.innerHTML = STATIONS.map(
      (s, i) =>
        `<button type="button" data-index="${i}" aria-current="false">
           <span class="rl">${s.name}</span><i></i>
         </button>`
    ).join('');

    this.rail.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) this.timeline.scrollTo(+b.dataset.index, this.reduced ? 'auto' : 'smooth');
    });

    this.railButtons = [...this.rail.querySelectorAll('button')];
  }

  /**
   * Run the count-ups and meter fills once their panel becomes visible — the same
   * behaviour the source page drives from IntersectionObserver.
   */
  _watchPanels() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-count]').forEach((el) => this._countUp(el, true));
      document.querySelectorAll('.fill').forEach((f) => (f.style.width = `${f.dataset.w}%`));
      document.querySelectorAll('[data-meter]').forEach((v) => (v.textContent = `${v.dataset.meter}%`));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          if (el.dataset.count !== undefined) this._countUp(el, this.reduced);
          if (el.classList.contains('fill')) el.style.width = `${el.dataset.w}%`;
          if (el.dataset.meter !== undefined) this._countUp(el, this.reduced, '%', 'meter');
          io.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );

    document
      .querySelectorAll('[data-count], .fill, [data-meter]')
      .forEach((el) => io.observe(el));
  }

  _countUp(el, instant, forceSuffix, attr = 'count') {
    const target = +el.dataset[attr];
    const prefix = el.dataset.prefix ?? '';
    const suffix = forceSuffix ?? el.dataset.suffix ?? '';
    const write = (n) => (el.textContent = prefix + n.toLocaleString('en-US') + suffix);

    if (instant) return write(target);

    const dur = 1200;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      write(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /**
   * @param {number} t        overall scroll progress
   * @param {object} station  the active station
   * @param {{speedKt:number, altFt:number}} telem
   */
  update(t, station, telem) {
    this.bar.style.width = `${t * 100}%`;

    const idx = STATIONS.indexOf(station);
    this.railButtons.forEach((b, i) =>
      b.setAttribute('aria-current', String(i === idx))
    );

    this.phase.textContent = phaseFor(station.id);
    this.gs.textContent = String(Math.round(telem.speedKt)).padStart(3, '0');
    this.alt.textContent = String(Math.round(telem.altFt)).padStart(5, '0');
  }
}
