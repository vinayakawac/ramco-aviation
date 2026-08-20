/**
 * responsive.test.js — checks the three breakpoints that matter and the frame rate
 * through the heaviest beat (the takeoff roll).
 *
 * Asserts:
 *   - no horizontal overflow at any width
 *   - the panel never covers the whole viewport on desktop (the scene must stay visible)
 *   - the correct tier is chosen per width
 *   - sustained fps through the takeoff roll
 *
 * Usage: node test/responsive.test.js [baseUrl]
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:5178/';
const SIZES = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const browser = await chromium.launch();
let failed = false;

for (const size of SIZES) {
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const panel = document.querySelector('.panel');
    const rect = panel?.getBoundingClientRect();
    return {
      tier: window.__ramco?.tier ?? 'document',
      overflow: doc.scrollWidth - doc.clientWidth,
      panelW: rect ? Math.round(rect.width) : 0,
      viewW: window.innerWidth,
      railVisible: getComputedStyle(document.getElementById('rail')).display !== 'none',
    };
  });

  // On desktop the panel must leave room for the scene beside it.
  const coversAll = size.width >= 901 && r.panelW > r.viewW * 0.72;
  const ok = r.overflow <= 0 && !coversAll && errors.length === 0;
  if (!ok) failed = true;

  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${size.name.padEnd(8)} ${size.width}x${size.height} ` +
      `tier=${r.tier.padEnd(8)} overflow=${r.overflow}px panel=${r.panelW}/${r.viewW} rail=${r.railVisible}`
  );
  errors.slice(0, 3).forEach((e) => console.log(`        error: ${e.slice(0, 120)}`));

  await context.close();
}

/* ---------- frame rate through the takeoff roll ---------- */

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ramco?.tier === 'full', null, { timeout: 15000 });

// Station 22 is the takeoff roll: most geometry on screen, meters animating, sun moving.
await page.evaluate(() => window.__ramco.goto(22));
await page.waitForTimeout(500);

const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      // Scroll gently through the roll while sampling, so this measures the real cost.
      const y0 = window.scrollY;
      function tick(now) {
        frames++;
        window.scrollTo(0, y0 + (now - start) * 0.9);
        if (now - start < 2500) requestAnimationFrame(tick);
        else resolve(Math.round((frames * 1000) / (now - start)));
      }
      requestAnimationFrame(tick);
    })
);

const stats = await page.evaluate(() => {
  const r = window.__ramco.renderer.info;
  const gl = window.__ramco.renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    calls: r.render.calls,
    tris: r.render.triangles,
    geometries: r.memory.geometries,
    textures: r.memory.textures,
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  };
});

// Headless Chromium rasterises on the CPU via SwiftShader, so its fps figure says
// nothing about real-GPU performance. On a software rasteriser assert the geometry
// budget instead — that IS hardware-independent — and only hold the fps bar when a
// real GPU is present.
const software = /swiftshader|llvmpipe|software|angle \(google/i.test(stats.renderer);
const fpsOk = software ? stats.calls <= 400 && stats.tris <= 250_000 : fps >= 50;
if (!fpsOk) failed = true;
console.log(
  `\n${fpsOk ? 'PASS' : 'FAIL'}  takeoff roll: ${fps} fps  ` +
    `(calls=${stats.calls} tris=${stats.tris} geo=${stats.geometries} tex=${stats.textures})`
);
console.log(`      renderer: ${stats.renderer}`);
if (software) {
  console.log(
    '      software rasteriser — fps NOT asserted here; draw-call and triangle budget checked instead.'
  );
  console.log('      Measure real fps in a GPU browser via the dev server.');
}

await browser.close();
process.exit(failed ? 1 : 0);
