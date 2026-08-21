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
    '.hero-badge, .xai-title, .xai-lede, .xai-cta-row, .hero-showcase > *, .xai-stats > div, ' +
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
      { id: 'maint', label: 'Maintenance', x: 490, y: 58, role: 'Task cards · Work packages' },
      { id: 'eng', label: 'Engineering', x: 770, y: 110, role: 'AMM/EMM · Airworthiness' },
      { id: 'warr', label: 'Warranty', x: 210, y: 110, role: 'Claims · Coverage rules' },
      { id: 'supply', label: 'Supply chain', x: 845, y: 250, role: 'Spec 2000 · Part readiness' },
      { id: 'records', label: 'Records', x: 135, y: 250, role: 'CAMO · As-Built/Actual' },
      { id: 'contracts', label: 'Contracts', x: 770, y: 390, role: 'NTE caps · Billing terms' },
      { id: 'flight', label: 'Flight ops', x: 210, y: 390, role: 'EFB · Crew Anywhere' },
      { id: 'fin', label: 'Finance', x: 490, y: 442, role: 'Automated invoice · WIP' },
    ];

    let currentMode = 'disconnected';
    let hoveredNode = null;

    function renderDiagram(mode) {
      currentMode = mode;
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
          <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="hubGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#141e33" />
            <stop offset="100%" stop-color="#080c14" />
          </linearGradient>
          <linearGradient id="pulseLineGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.2" />
          </linearGradient>
        </defs>
      `;

      if (mode === 'disconnected') {
        // Draw 28 point-to-point dashed lines between all 8 nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const isHighlighted = hoveredNode === n1.id || hoveredNode === n2.id;
            const opacity = hoveredNode ? (isHighlighted ? 0.85 : 0.08) : 0.28;
            const strokeColor = isHighlighted ? '#f87171' : 'rgba(239, 68, 68, 0.45)';
            const strokeWidth = isHighlighted ? 1.6 : 1.1;
            const mx = (n1.x + n2.x) / 2;
            const my = (n1.y + n2.y) / 2;
            const isFriction = (i * 3 + j * 7) % 4 === 0;

            svgHtml += `
              <line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}"
                stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="4,4" opacity="${opacity}" />
            `;
            if (isFriction && (!hoveredNode || isHighlighted)) {
              svgHtml += `
                <g transform="translate(${mx}, ${my})" opacity="${hoveredNode && !isHighlighted ? 0.1 : 0.8}">
                  <circle r="5" fill="#140606" stroke="#ef4444" stroke-width="1" />
                  <line x1="-2" y1="-2" x2="2" y2="2" stroke="#fca5a5" stroke-width="1.2" />
                  <line x1="2" y1="-2" x2="-2" y2="2" stroke="#fca5a5" stroke-width="1.2" />
                </g>
              `;
            }
          }
        }
      } else {
        // Unified mode: Central Hub at (490, 250) with 8 radiating clean bus channels
        const cx = 490, cy = 250;

        nodes.forEach((n, idx) => {
          const isHighlighted = hoveredNode === n.id;
          const strokeOpacity = hoveredNode ? (isHighlighted ? 0.9 : 0.2) : 0.55;
          const strokeWidth = isHighlighted ? 2.4 : 1.6;

          svgHtml += `
            <line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}"
              stroke="rgba(59, 130, 246, ${strokeOpacity})" stroke-width="${strokeWidth}" />
            <circle cx="${cx + (n.x - cx) * 0.5}" cy="${cy + (n.y - cy) * 0.5}" r="3.2" fill="#60a5fa" filter="url(#glow-cyan)">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="${2.0 + (idx % 3) * 0.4}s" repeatCount="indefinite" />
            </circle>
          `;
        });

        // Central Ramco Platform Hub
        svgHtml += `
          <g transform="translate(${cx}, ${cy})">
            <circle r="68" fill="none" stroke="rgba(59, 130, 246, 0.15)" stroke-width="1" stroke-dasharray="2,6" />
            <circle r="54" fill="none" stroke="rgba(59, 130, 246, 0.35)" stroke-width="1.2" stroke-dasharray="6,4">
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="24s" repeatCount="indefinite" />
            </circle>
            <circle r="46" fill="url(#hubGrad)" stroke="#3b82f6" stroke-width="1.8" filter="url(#glow-cyan)" />
            <text text-anchor="middle" y="-6" fill="#ffffff" font-family="var(--f-sans)" font-size="11" font-weight="600" letter-spacing="0.1em">RAMCO</text>
            <text text-anchor="middle" y="10" fill="#60a5fa" font-family="var(--f-mono)" font-size="9" letter-spacing="0.12em">ONE PLATFORM</text>
          </g>
        `;
      }

      // Draw the 8 function node cards
      nodes.forEach((n) => {
        const w = 120;
        const h = 34;
        const isHovered = hoveredNode === n.id;
        const fill = mode === 'unified' ? (isHovered ? '#0e172a' : '#080c16') : (isHovered ? '#181212' : '#090a0e');
        const stroke = mode === 'unified'
          ? (isHovered ? '#60a5fa' : 'rgba(59, 130, 246, 0.6)')
          : (isHovered ? '#f87171' : 'rgba(255, 255, 255, 0.18)');
        const textFill = mode === 'unified' ? '#ffffff' : (isHovered ? '#ffffff' : '#d1d5db');
        const dotColor = mode === 'unified' ? '#38bdf8' : '#f87171';

        svgHtml += `
          <g class="op-node" data-id="${n.id}" transform="translate(${n.x}, ${n.y})" style="cursor: pointer;">
            <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6"
              fill="${fill}" stroke="${stroke}" stroke-width="${isHovered ? 1.6 : 1.1}" />
            <circle cx="${-w / 2 + 12}" cy="0" r="2.5" fill="${dotColor}" />
            <text text-anchor="middle" x="4" y="4" fill="${textFill}"
              font-family="var(--f-sans)" font-size="12" font-weight="500" letter-spacing="-0.01em">
              ${n.label}
            </text>
          </g>
        `;
      });

      opSvg.innerHTML = svgHtml;

      // Attach hover listeners to nodes
      opSvg.querySelectorAll('.op-node').forEach((el) => {
        el.addEventListener('mouseenter', () => {
          hoveredNode = el.dataset.id;
          renderDiagram(currentMode);
        });
        el.addEventListener('mouseleave', () => {
          hoveredNode = null;
          renderDiagram(currentMode);
        });
      });
    }

    btnDisconnected.addEventListener('click', () => renderDiagram('disconnected'));
    btnUnified.addEventListener('click', () => renderDiagram('unified'));

    renderDiagram('disconnected');
  }
})();
