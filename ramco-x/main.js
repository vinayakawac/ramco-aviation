/* Ramco Aviation - interaction layer */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* year */
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* sticky nav */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('stuck', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* stagger-reveal every block-level element inside a section */
  const targets = document.querySelectorAll(
    '.xai-title, .xai-lede, .xai-cta-row, .hero-showcase > *, .xai-stats > div, ' +
    '.hero h1, .hero .lede, .cta-row, .stats > div, ' +
    '.sec-head > *, .problem-intro > *, .problem-chain > *, .problem-bridge, .architecture-compare, .app, .closing > .wrap > *'
  );
  targets.forEach((el) => el.setAttribute('data-reveal', ''));

  const show = (el) => {
    if (el.classList.contains('in')) return;
    const group = [...el.parentElement.children].filter((n) => n.hasAttribute('data-reveal'));
    el.style.setProperty('--d', `${Math.min(Math.max(group.indexOf(el), 0), 6) * 70}ms`);
    el.classList.add('in');
  };

  if (reduced) {
    targets.forEach(show);
  } else {
    /* scroll-driven reveal: works even where IntersectionObserver callbacks
       are throttled (background tabs, non-compositing frames) */
    let pending = false;
    const sweep = () => {
      pending = false;
      const limit = window.innerHeight * 0.88;
      targets.forEach((el) => {
        if (!el.classList.contains('in') && el.getBoundingClientRect().top < limit) show(el);
      });
    };
    const queue = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(sweep);
    };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    document.addEventListener('visibilitychange', queue);
    sweep();
  }

  /* count-up on the hero stats */
  const fmt = new Intl.NumberFormat('en-US');
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end) || reduced) return;
    const suffix = el.textContent.trim().endsWith('+') ? '+' : '';
    const t0 = performance.now();
    const dur = 1400;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(end * eased)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* signup - client side only, no endpoint wired yet */
  const form = document.getElementById('signup');
  if (form) {
    const note = form.querySelector('.form-note');
    const input = form.querySelector('input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      note.classList.toggle('err', !valid);
      note.textContent = valid
        ? 'Received. We will reply within one business day.'
        : 'Enter a valid work email address.';
      if (valid) form.reset();
    });
  }

  /* ============================================================
     Operating architecture - one stage, two models
     ============================================================ */
  const archModel = document.getElementById('archModel');
  if (archModel) {
    const archCount = document.getElementById('archCount');
    const archSub = document.getElementById('archMetricSub');
    const archButtons = [...archModel.querySelectorAll('.arch-switch button')];
    const archCopy = {
      before: 'Eight functions, each holding its own version of the aircraft.',
      after: 'Eight functions, one record, written once and read by all eight.'
    };
    const archValue = { before: 28, after: 0 };
    let archMode = 'before';
    let archRaf = 0;

    /* the switch only works with script, so only hint at it with script */
    archModel.classList.add('is-idle');

    const countTo = (from, to) => {
      cancelAnimationFrame(archRaf);
      if (reduced) {
        archCount.textContent = String(to);
        return;
      }
      const t0 = performance.now();
      const dur = 900;
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        archCount.textContent = String(Math.round(from + (to - from) * eased));
        if (p < 1) archRaf = requestAnimationFrame(tick);
      };
      archRaf = requestAnimationFrame(tick);
    };

    const setArchMode = (next) => {
      archModel.classList.remove('is-idle');
      if (next === archMode || !archValue.hasOwnProperty(next)) return;
      const from = archValue[archMode];
      archMode = next;
      archModel.dataset.model = archMode;
      archButtons.forEach((btn) => {
        const on = btn.dataset.model === archMode;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', String(on));
      });
      archSub.textContent = archCopy[archMode];
      countTo(from, archValue[archMode]);
    };

    archButtons.forEach((btn) => {
      btn.addEventListener('click', () => setArchMode(btn.dataset.model));
    });

    /* on narrow screens the stage pans - start it on the centre of the diagram */
    const archStage = archModel.querySelector('.arch-stage');
    const centreStage = () => {
      const slack = archStage.scrollWidth - archStage.clientWidth;
      if (slack > 0) archStage.scrollLeft = slack / 2;
    };
    centreStage();
    window.addEventListener('resize', centreStage);

    archModel.querySelector('.arch-switch').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const next = e.key === 'ArrowRight' ? 'after' : 'before';
      setArchMode(next);
      archButtons.find((btn) => btn.dataset.model === next).focus();
    });
  }
})();
