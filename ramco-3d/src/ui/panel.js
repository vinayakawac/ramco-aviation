/**
 * panel.js — renders content from data/ramco.js into the DOM panels overlaid on the canvas.
 *
 * Panels are real elements in normal document flow, not canvas-drawn text: keyboard
 * navigation, screen readers, text selection and Ctrl-F all work, and the content is
 * present for search engines whether or not WebGL initialises.
 *
 * All strings originate in ramco.js (static, authored, never user input), so inline
 * `<b>`/`<em>` markup is written through as HTML by design.
 */

import * as D from '../data/ramco.js';

/* ---------- primitives ---------- */

const esc = (s) => String(s).replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;');

/** External link, always safe-rel'd. */
export function link(href, label, cls = '') {
  return `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
}

/** The "Source: ramco.com/..." credit that the source page attaches to every claim block. */
export function sourceLink(path) {
  return link(D.srcUrl(path), `Source: ramco.com${path}`, 'src');
}

export function eyebrow(text) {
  return `<p class="eyebrow">${text}</p>`;
}

export function heading(level, text, cls = '') {
  return `<h${level} class="${cls}">${text}</h${level}>`;
}

/** Ticked list — the source's check-bullet treatment. */
export function ticks(items, cls = 'ticks') {
  return `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

/** Dotted list used for pain points (flag-coloured markers). */
export function pains(items) {
  return `<ul class="ticks pain">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

export function card({ title, body }) {
  return `<article class="card"><h4>${title}</h4><p>${body}</p></article>`;
}

export function cards(list, cls = 'cardgrid') {
  return `<div class="${cls}">${list.map(card).join('')}</div>`;
}

/* ---------- section header ---------- */

export function shead({ eyebrow: eb, h2, standfirst }, level = 2) {
  return [
    '<header class="shead">',
    eb ? eyebrow(eb) : '',
    h2 ? heading(level, h2) : '',
    standfirst ? `<p class="standfirst">${standfirst}</p>` : '',
    '</header>',
  ].join('');
}

/* ---------- zone (the 7 coverage callouts) ---------- */

export function zonePanel(key) {
  const z = D.ZONES[key];
  return [
    `<span class="zone-tag"><i>${z.n}</i>${z.zone}</span>`,
    heading(2, z.title),
    `<span class="scope">${z.scope}</span>`,
    `<div class="painline"><b>What it costs you today</b>${z.pain}</div>`,
    `<p class="why">${z.why}</p>`,
    ticks(z.items),
    z.note ? `<p class="footnote">${z.note}</p>` : '',
    z.more ? `<p class="more"><a class="btn ghost" href="#station-04">Open the engine, gate by gate</a></p>` : '',
    sourceLink(z.src),
  ].join('');
}

/* ---------- engine: ladder + gates ---------- */

/** The Engine MRO section header, shown once at the top of the engine sequence. */
export function engineIntro() {
  return [
    shead(D.ENGINE_INTRO),
    `<p class="figcap"><b>${D.ENGINE_INTRO.depthLabel}</b>${D.ENGINE_INTRO.depthHint}</p>`,
  ].join('');
}

export function ladderPanel(i) {
  const r = D.LADDER[i];
  return [
    `<span class="zone-tag"><i>${i + 1}</i>${r.lv}</span>`,
    heading(3, r.t),
    `<span class="scope">${r.d}</span>`,
    `<p class="why">${r.body}</p>`,
    ticks(r.pts, 'ticks two-col'),
    sourceLink(D.ENGINE_SRC),
  ].join('');
}

export function gatePanel(i) {
  const g = D.GATES[i];
  return [
    i === 0 ? `<p class="figcap"><b>${D.ENGINE_INTRO.gatesHeading}</b></p>` : '',
    `<span class="zone-tag"><i>${i + 1}</i>${g.n}</span>`,
    heading(3, g.t),
    `<span class="scope">${g.s}</span>`,
    `<p class="why">${g.why}</p>`,
    ticks(g.pts, 'ticks two-col'),
    sourceLink(D.ENGINE_SRC),
  ].join('');
}

/* ---------- personas ---------- */

export function personaPanel(i) {
  const p = D.PERSONAS[i];
  return [
    `<span class="who">${p.who}</span>`,
    heading(3, p.k),
    '<div class="pgrid">',
    `<div><p class="blocktitle">What it costs you today</p>${pains(p.pain)}</div>`,
    `<div><p class="blocktitle">What Ramco gives you</p>${ticks(p.gain)}</div>`,
    '</div>',
    `<div class="proof"><b>Proof point.</b> ${p.proof} ${sourceLink(p.src)}</div>`,
  ].join('');
}

/* ---------- capability matrix ---------- */

export function matrixTable() {
  const head = D.MATRIX_COLUMNS.map((c) => `<th scope="col">${esc(c)}</th>`).join('');
  const body = D.MROWS.map(
    (r) =>
      `<tr><th scope="row">${r.k}</th>${r.v
        .map((c) =>
          c
            ? '<td><span class="dot" role="img" aria-label="documented"></span></td>'
            : '<td><span class="dash" role="img" aria-label="not stated">&mdash;</span></td>'
        )
        .join('')}</tr>`
  ).join('');
  return [
    '<div class="matrixwrap" tabindex="0" role="region" aria-label="Capability matrix by operation type">',
    `<table class="matrix"><thead><tr><th scope="col">Operation</th>${head}</tr></thead>`,
    `<tbody>${body}</tbody></table></div>`,
    `<p class="mlegend"><span><span class="dot"></span> ${D.MATRIX_LEGEND[0]}</span>`,
    `<span><span class="dash">&mdash;</span> ${D.MATRIX_LEGEND[1]}</span></p>`,
  ].join('');
}

/* ---------- results ---------- */

export function metersPanel() {
  const bars = D.METERS.map(
    (m) => `<div class="meter">
      <div class="top"><span class="lbl">${m.l}</span><span class="val" data-meter="${m.v}">0%</span></div>
      <div class="track"><i class="fill" data-w="${m.v}"></i></div>
      <small>${m.s}</small>
    </div>`
  ).join('');
  return [
    shead(D.RESULTS),
    `<div class="bigstat"><b data-count="6" data-prefix="$" data-suffix="M">${D.BIGSTAT.value}</b>`,
    `<h4>${D.BIGSTAT.title}</h4><p>${D.BIGSTAT.body}</p></div>`,
    `<div class="meters">${bars}</div>`,
    `<p class="footnote">${D.RESULTS.caveat}</p>`,
  ].join('');
}

/* ---------- hero ---------- */

export function heroPanel() {
  const stats = D.HERO.stats
    .map(
      (s) =>
        `<div><b${s.count ? ` data-count="${s.count}" data-suffix="${s.suffix}"` : ''}>${s.value}</b><span>${s.label}</span></div>`
    )
    .join('');
  const ctas = D.HERO.ctas
    .map(
      (c) =>
        `<a class="btn ${c.primary ? 'light' : 'outline-light'}" href="${c.href}"${
          c.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''
        }>${c.label}</a>`
    )
    .join('');
  return [
    `<span class="pill"><i></i>${esc(D.HERO.pill)}</span>`,
    heading(1, D.HERO.h1),
    `<p class="sub">${D.HERO.sub}</p>`,
    `<div class="btn-row">${ctas}</div>`,
    `<div class="herostats">${stats}</div>`,
    `<div class="trust"><p>${D.TRUST.eyebrow}</p><ul>${D.TRUST.names
      .map((n) => `<li>${n}</li>`)
      .join('')}</ul></div>`,
  ].join('');
}

/* ---------- problem / operating model ---------- */

export function problemPanel() {
  return [
    shead(D.PROBLEM),
    cards(D.PROBLEM.cards, 'cardgrid four'),
    `<p class="blocktitle">The eight functions</p>`,
    `<ul class="nodelist">${D.NODES.map((n) => `<li>${n}</li>`).join('')}</ul>`,
    `<div class="netcaps">`,
    `<p class="netcap is-broken"><b>${D.NET.views.disconnected}</b>${D.NET.captions.disconnected}</p>`,
    `<p class="netcap is-unified"><b>${D.NET.views.unified}</b>${D.NET.captions.unified}</p>`,
    `</div>`,
    `<p class="footnote">${D.NET.footnote}</p>`,
  ].join('');
}

/* ---------- compliance / commercial ---------- */

export function compliancePanel() {
  return [
    shead(D.COMPLIANCE),
    `<div class="chipgrid">${D.COMPLIANCE.groups
      .map((g) => `<article class="chip"><h4>${g.title}</h4><p>${g.body}</p></article>`)
      .join('')}</div>`,
  ].join('');
}

export function commercialPanel() {
  return [
    shead(D.COMMERCIAL),
    cards(D.COMMERCIAL.cards),
    `<p class="more">${link(D.COMMERCIAL.cta.href, D.COMMERCIAL.cta.label, 'btn')}</p>`,
  ].join('');
}

/* ---------- epilogue: quotes, customers, FAQ, CTA, footer ---------- */

export function customersPanel() {
  const quotes = D.QUOTES.map(
    (q) => `<figure class="quote">
      <div class="stars" aria-label="${q.stars} out of 5 stars">${'★'.repeat(q.stars)}</div>
      <blockquote>${q.body}</blockquote>
      <figcaption><b>${q.by}</b>${q.meta}</figcaption>
    </figure>`
  ).join('');
  return [shead(D.CUSTOMERS_INTRO), `<div class="cardgrid">${quotes}</div>`, cards(D.CUSTOMERS)].join('');
}

export function faqPanel() {
  const items = D.FAQ.map(
    (f) => `<details><summary>${f.q}</summary><div class="ans"><p>${f.a}</p></div></details>`
  ).join('');
  return [shead(D.FAQ_INTRO), `<div class="faq">${items}</div>`].join('');
}

export function ctaPanel() {
  const btns = D.CTA.buttons
    .map((b) => link(b.href, b.label, `btn ${b.primary ? 'light' : 'outline-light'}`))
    .join('');
  return `<div class="ctaband">${heading(2, D.CTA.h2)}<p>${D.CTA.body}</p><div class="btn-row">${btns}</div></div>`;
}

export function footerPanel() {
  const cols = D.FOOTER.columns
    .map(
      (c) =>
        `<div><h5>${c.heading}</h5><ul>${c.links
          .map((l) => `<li>${link(l.href, l.label)}</li>`)
          .join('')}</ul></div>`
    )
    .join('');
  const notes = D.INTERNAL_NOTES.items
    .map((n) => `<li><b>${esc(n.title)}</b>${n.body}</li>`)
    .join('');
  return [
    `<div class="fgrid"><div class="about"><p>${D.FOOTER.about}</p></div>${cols}</div>`,
    `<div class="srcnote">${D.SOURCE_NOTE.body} ${link(D.SOURCE_NOTE.link.href, D.SOURCE_NOTE.link.label)}`,
    `<details class="internal"><summary>${D.INTERNAL_NOTES.summary}</summary><ul>${notes}</ul></details></div>`,
    `<div class="fbottom">${D.FOOTER.bottom.map((b) => `<span>${b}</span>`).join('')}</div>`,
  ].join('');
}

/* ---------- generic wrapper ---------- */

/**
 * Wrap panel HTML in the standard panel shell.
 * @param {{id:string,num:string,label:string,html:string,wide?:boolean}} opts
 */
export function panelShell({ id, num, label, html, wide }) {
  return `<div class="panel${wide ? ' wide' : ''}" data-panel="${id}">
    <p class="panel-index" aria-hidden="true">${num}</p>
    <div class="panel-body">${html}</div>
  </div>`;
}
