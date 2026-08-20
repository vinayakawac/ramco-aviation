/**
 * shots.js — drive the page to every station and capture a frame.
 *
 * Also collects console output and renderer stats per station, so a regression shows up
 * as either a broken frame, a console error, or a draw-call blowout.
 *
 * Usage: node test/shots.js [baseUrl] [outDir]
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { STATIONS } from '../src/stations/index.js';

const BASE = process.argv[2] ?? 'http://localhost:5178/';
const OUT = process.argv[3] ?? '../shots';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ramco?.tier === 'full', null, { timeout: 15000 });

const rows = [];

for (let i = 0; i < STATIONS.length; i++) {
  const s = STATIONS[i];
  await page.evaluate((n) => window.__ramco.goto(n), i);
  // Two frames of settle: one for scroll, one for the rig to re-derive from it.
  await page.waitForTimeout(450);

  const stats = await page.evaluate(() => {
    const r = window.__ramco.renderer.info.render;
    return {
      calls: r.calls,
      triangles: r.triangles,
      active: window.__ramco.timeline.activeIndex,
      progress: +window.__ramco.timeline.progress.toFixed(4),
      alt: Math.round(window.__ramco.rig.altFt),
      gs: Math.round(window.__ramco.rig.speedKt),
    };
  });

  const file = `${OUT}/${String(i).padStart(2, '0')}-${s.id}.png`;
  await page.screenshot({ path: file });

  rows.push({ i, id: s.id, ...stats });
  console.log(
    `${String(i).padStart(2)} ${s.id.padEnd(14)} active=${String(stats.active).padStart(2)} ` +
      `t=${String(stats.progress).padEnd(6)} calls=${String(stats.calls).padStart(4)} ` +
      `tris=${String(stats.triangles).padStart(6)} gs=${stats.gs} alt=${stats.alt}`
  );
}

const maxCalls = Math.max(...rows.map((r) => r.calls));
const mismatched = rows.filter((r) => r.active !== r.i);

console.log(`\npeak draw calls: ${maxCalls}`);
if (mismatched.length) {
  console.log(`stations that did not activate: ${mismatched.map((r) => r.id).join(', ')}`);
}
if (errors.length) {
  console.log(`\nconsole errors (${errors.length}):`);
  errors.slice(0, 10).forEach((e) => console.log('  ' + e));
}

await browser.close();
process.exit(errors.length || mismatched.length ? 1 : 0);
