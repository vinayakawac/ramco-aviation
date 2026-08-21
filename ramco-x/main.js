/* Ramco Aviation - interaction layer */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* year */
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ============================================================
     Scroll choreography - GSAP ScrollTrigger.
     Everything here reverses: scroll back up and it plays backwards.
     Elements are visible by default, so a failed script or a blocked
     library leaves a readable page rather than an empty one.
     ============================================================ */
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const motion = !reduced && !!(gsap && ScrollTrigger);
  if (motion) gsap.registerPlugin(ScrollTrigger);

  /* sticky nav */
  const nav = document.querySelector('.nav');
  if (motion) {
    ScrollTrigger.create({
      start: 24,
      onEnter: () => nav.classList.add('stuck'),
      onLeaveBack: () => nav.classList.remove('stuck'),
    });
  } else {
    const onScroll = () => nav.classList.toggle('stuck', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (motion) {
    const ENTER = { start: 'top 86%', toggleActions: 'play none none reverse' };

    /* the headline resolves out of blur: the one authored moment on the page */
    const title = document.querySelector('.xai-title');
    if (title) {
      gsap.from(title, {
        opacity: 0, y: 30, filter: 'blur(12px)',
        duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: title, ...ENTER },
      });
    }

    /* everything else rises once, grouped so a row moves together */
    const blocks = [...document.querySelectorAll(
      '.xai-lede, .xai-cta-row, .hero-showcase > *, .xai-stats > div, ' +
      '.sec-head > *, .problem-intro > *, .problem-chain > *, .problem-bridge, ' +
      '.architecture-compare, .app, .closing > .wrap > *'
    )];

    const rows = new Map();
    blocks.forEach((el) => {
      const parent = el.parentElement;
      if (!rows.has(parent)) rows.set(parent, []);
      rows.get(parent).push(el);
    });

    rows.forEach((els) => {
      gsap.from(els, {
        opacity: 0, y: 24,
        duration: .9, ease: 'expo.out', stagger: .07,
        scrollTrigger: { trigger: els[0], ...ENTER },
      });
    });

    /* the fleet plate drifts against the scroll, so the hero has depth.
       Scrubbed, so it tracks the scrollbar in both directions by definition. */
    const plate = document.querySelector('.hero-fleet img');
    if (plate) {
      gsap.fromTo(plate,
        { yPercent: -4.5, scale: 1.1 },
        {
          yPercent: 4.5, scale: 1.1, ease: 'none',
          scrollTrigger: {
            trigger: '.hero-fleet',
            start: 'top bottom',
            end: 'bottom top',
            scrub: .6,
          },
        }
      );
    }

    /* the GLB and the fonts both land after first layout and change heights */
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* count-up on the hero stats, replayed whenever the row is scrolled back to */
  const fmt = new Intl.NumberFormat('en-US');
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end)) return;
    const suffix = el.textContent.trim().endsWith('+') ? '+' : '';
    const final = fmt.format(end) + suffix;
    if (!motion) { el.textContent = final; return; }

    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const dur = 1400;
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt.format(Math.round(end * eased)) + suffix;
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      onEnter: run,
      onEnterBack: run,
      onLeaveBack: () => { cancelAnimationFrame(raf); el.textContent = fmt.format(0) + suffix; },
    });
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
