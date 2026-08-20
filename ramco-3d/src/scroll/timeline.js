/**
 * timeline.js — builds the scroll spine and turns scroll position into station state.
 *
 * The document is a stack of `.station` sections whose heights come from each station's
 * `vh` weight, so scroll position maps directly onto journey progress. There is no
 * scroll hijacking: the page scrolls normally, and Lenis only smooths the wheel input.
 */

import { STATIONS, WINDOWS, TOTAL_VH } from '../stations/index.js';
import { panelShell } from '../ui/panel.js';

export class Timeline {
  /**
   * @param {HTMLElement} root the #scroll container
   * @param {(t:number, active:object, local:number)=>void} onUpdate
   */
  constructor(root, onUpdate) {
    this.root = root;
    this.onUpdate = onUpdate;
    this.progress = 0;
    this.activeIndex = -1;
    this.sections = [];

    this._buildDom();
    this._observe();
  }

  _buildDom() {
    const html = STATIONS.map((s, i) => {
      const side = s.side ?? 'left';
      // The section carries the scroll length; the inner div pins to the viewport so the
      // panel stays put and correctly bounded while its station is on screen.
      return `<section class="station" id="station-${s.id}" data-id="${s.id}" data-index="${i}"
                 data-side="${side}" style="height:${s.vh}vh"
                 aria-label="${s.num} ${s.name}">
                <div class="station-inner">
                  ${panelShell({ id: s.id, num: s.num, label: s.name, html: s.panel(), wide: s.wide })}
                </div>
              </section>`;
    }).join('');

    this.root.innerHTML = html;
    this.sections = [...this.root.querySelectorAll('.station')];
  }

  /** Mark stations active as they reach the middle of the viewport. */
  _observe() {
    if (!('IntersectionObserver' in window)) {
      this.sections.forEach((s) => s.classList.add('is-active'));
      return;
    }
    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.target.classList.toggle('is-active', e.isIntersecting));
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 }
    );
    this.sections.forEach((s) => this.io.observe(s));
  }

  /** Recompute progress from the current scroll offset. */
  update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    this.progress = t;

    // Which station window are we inside?
    let i = WINDOWS.findIndex((w) => t >= w.start && t < w.end);
    if (i === -1) i = t >= 1 ? WINDOWS.length - 1 : 0;

    const w = WINDOWS[i];
    const local = (t - w.start) / Math.max(1e-6, w.end - w.start);

    if (i !== this.activeIndex) {
      this.activeIndex = i;
      this.root.dispatchEvent(
        new CustomEvent('station', { detail: { index: i, station: w.station } })
      );
    }

    this.onUpdate(t, w.station, local);
  }

  /** Scroll to a station by index. */
  scrollTo(index, behavior = 'smooth') {
    const el = this.sections[index];
    if (el) window.scrollTo({ top: el.offsetTop, behavior });
  }

  get total() {
    return TOTAL_VH;
  }
}
