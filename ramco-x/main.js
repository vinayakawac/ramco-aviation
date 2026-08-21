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
    '.hero .tag, .hero h1, .hero .lede, .cta-row, .stats > div, ' +
    '.sec-head > *, .problem-grid > *, .op-model, .app, .closing > .wrap > *'
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
     Operating Model Diagram (Disconnected vs One Ramco Platform)
     ============================================================ */
  const opSvg = document.getElementById('opSvg');
  const btnDisconnected = document.getElementById('btnDisconnected');
  const btnUnified = document.getElementById('btnUnified');
  const opMetric = document.getElementById('opMetric');
  const opStateTag = document.getElementById('opStateTag');
  const opCaption = document.getElementById('opCaption');

  if (opSvg && btnDisconnected && btnUnified) {
    const nodes = [
      { id: 'maint', label: 'Maintenance', x: 480, y: 65 },
      { id: 'eng', label: 'Engineering', x: 740, y: 110 },
      { id: 'warr', label: 'Warranty', x: 220, y: 110 },
      { id: 'supply', label: 'Supply chain', x: 810, y: 240 },
      { id: 'records', label: 'Records', x: 150, y: 240 },
      { id: 'contracts', label: 'Contracts', x: 740, y: 370 },
      { id: 'flight', label: 'Flight ops', x: 220, y: 370 },
      { id: 'fin', label: 'Finance', x: 480, y: 415 },
    ];

    function renderDiagram(mode) {
      btnDisconnected.classList.toggle('active', mode === 'disconnected');
      btnDisconnected.setAttribute('aria-selected', mode === 'disconnected');
      btnUnified.classList.toggle('active', mode === 'unified');
      btnUnified.setAttribute('aria-selected', mode === 'unified');

      if (mode === 'disconnected') {
        opMetric.textContent = '8 FUNCTIONS · 28 POINT-TO-POINT INTERFACES TO BUILD, TEST AND MAINTAIN';
        opStateTag.textContent = 'Spaghetti Architecture';
        opStateTag.className = 'op-stat-pill';
        opCaption.innerHTML =
          'Eight functions connected point to point need twenty-eight interfaces, and every one is a place data drifts or a charge goes missing. One platform needs none of them. <span class="dim"><i>(The arithmetic is ours; the operating-model argument is Ramco\'s.)</i></span>';
      } else {
        opMetric.textContent = '8 FUNCTIONS · 1 UNIFIED RECORD · 0 POINT-TO-POINT INTERFACES';
        opStateTag.textContent = 'Single Native Platform';
        opStateTag.className = 'op-stat-pill unified';
        opCaption.innerHTML =
          'One unified operating kernel where flight operations, line maintenance, engine visits, parts supply, and contract billing operate on a single synchronous transaction record. <span class="dim"><i>(Zero point-to-point batch lag.)</i></span>';
      }

      let svgHtml = `
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="hubGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
        </defs>
      `;

      if (mode === 'disconnected') {
        // Draw 28 point-to-point dashed lines between all 8 nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const mx = (n1.x + n2.x) / 2;
            const my = (n1.y + n2.y) / 2;
            const isFriction = (i * 3 + j * 7) % 4 === 0;

            svgHtml += `
              <line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}"
                stroke="rgba(248, 113, 113, 0.24)" stroke-width="1.2" stroke-dasharray="4,4" />
            `;
            if (isFriction) {
              svgHtml += `
                <g transform="translate(${mx}, ${my})" opacity="0.75">
                  <circle r="5" fill="#140808" stroke="#ef4444" stroke-width="1" />
                  <line x1="-2" y1="-2" x2="2" y2="2" stroke="#f87171" stroke-width="1" />
                  <line x1="2" y1="-2" x2="-2" y2="2" stroke="#f87171" stroke-width="1" />
                </g>
              `;
            }
          }
        }
      } else {
        // Unified mode: Central Hub at (480, 240) with 8 radiating clean channels
        const cx = 480, cy = 240;

        nodes.forEach((n) => {
          svgHtml += `
            <line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}"
              stroke="rgba(59, 130, 246, 0.45)" stroke-width="1.8" />
            <circle cx="${(cx + n.x) / 2}" cy="${(cy + n.y) / 2}" r="3" fill="#60a5fa" filter="url(#glow-cyan)">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite" />
            </circle>
          `;
        });

        // Central Ramco Kernel Hub
        svgHtml += `
          <g transform="translate(480, 240)">
            <circle r="48" fill="url(#hubGrad)" stroke="#3b82f6" stroke-width="2" filter="url(#glow-cyan)" />
            <circle r="56" fill="none" stroke="rgba(59, 130, 246, 0.3)" stroke-width="1" stroke-dasharray="6,4">
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite" />
            </circle>
            <text text-anchor="middle" y="-5" fill="#fff" font-family="var(--f-sans)" font-size="11" font-weight="600" letter-spacing="0.08em">RAMCO</text>
            <text text-anchor="middle" y="11" fill="#60a5fa" font-family="var(--f-mono)" font-size="9" letter-spacing="0.1em">ONE PLATFORM</text>
          </g>
        `;
      }

      // Draw the 8 function node pills
      nodes.forEach((n) => {
        const w = 114;
        const h = 32;
        const fill = mode === 'unified' ? '#090d16' : '#0a0c10';
        const stroke = mode === 'unified' ? 'rgba(59, 130, 246, 0.65)' : 'rgba(255, 255, 255, 0.16)';
        const textFill = mode === 'unified' ? '#ffffff' : '#e2e8f0';

        svgHtml += `
          <g transform="translate(${n.x}, ${n.y})">
            <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6"
              fill="${fill}" stroke="${stroke}" stroke-width="1.2" />
            <text text-anchor="middle" y="4" fill="${textFill}"
              font-family="var(--f-sans)" font-size="12" font-weight="500" letter-spacing="-0.01em">
              ${n.label}
            </text>
          </g>
        `;
      });

      opSvg.innerHTML = svgHtml;
    }

    btnDisconnected.addEventListener('click', () => renderDiagram('disconnected'));
    btnUnified.addEventListener('click', () => renderDiagram('unified'));

    renderDiagram('disconnected');
  }
})();
