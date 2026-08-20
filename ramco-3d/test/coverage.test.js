/**
 * coverage.test.js — the test that matters.
 *
 * Renders the page and asserts that every reader-facing string in src/data/ramco.js
 * appears in the DOM. That is what proves the 3D rebuild carries 100% of the content
 * from ramco-aviation_1.html rather than quietly dropping whatever was awkward to place.
 *
 * Runs in all three tiers, because the promise is that content survives degradation:
 *   full      the scroll-driven journey
 *   reduced   prefers-reduced-motion
 *   document  no WebGL at all
 *
 * Usage: node test/coverage.test.js [baseUrl]
 */

import { chromium } from 'playwright';
import { COVERAGE, normalise } from '../src/data/coverage.js';

const BASE = process.argv[2] ?? 'http://localhost:5178/';

/** Collect the page's rendered text, normalised the same way the coverage list is. */
async function pageText(page) {
  const raw = await page.evaluate(() => {
    // textContent, not innerText: it keeps closed <details> bodies, which are reachable
    // by the reader and must still count as present. Head metadata counts too — the
    // source page's title and description are content, not chrome.
    const meta = document.querySelector('meta[name="description"]')?.content ?? '';
    return [document.title, meta, document.body.textContent].join(' | ');
  });
  return normalise(raw);
}

async function checkTier(browser, name, contextOpts, prepare) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...contextOpts,
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  if (prepare) await prepare(page);
  await page.waitForTimeout(600);

  const text = await pageText(page);
  const missing = COVERAGE.filter((s) => !text.includes(s));

  const tier = await page.evaluate(() => window.__ramco?.tier ?? 'document');
  await context.close();

  return { name, tier, missing, errors };
}

const browser = await chromium.launch();
const results = [];

results.push(await checkTier(browser, 'full', {}));
results.push(
  await checkTier(browser, 'reduced', { reducedMotion: 'reduce' })
);
results.push(
  await checkTier(browser, 'document', {}, async (page) => {
    // Force the no-WebGL path the same way a machine without a GPU would hit it.
    await page.evaluate(() => window.__ramcoForceDocumentMode?.());
  })
);

await browser.close();

let failed = false;
console.log(`coverage strings: ${COVERAGE.length}\n`);

for (const r of results) {
  const ok = r.missing.length === 0 && r.errors.length === 0;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(9)} tier=${String(r.tier).padEnd(9)} ` +
      `missing=${r.missing.length} errors=${r.errors.length}`
  );
  r.missing.slice(0, 30).forEach((m) => console.log(`        missing: ${m.slice(0, 110)}`));
  if (r.missing.length > 30) console.log(`        …and ${r.missing.length - 30} more`);
  r.errors.slice(0, 5).forEach((e) => console.log(`        error:   ${e.slice(0, 140)}`));
}

process.exit(failed ? 1 : 0);
