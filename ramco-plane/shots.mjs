import { chromium } from 'playwright';
import { BEATS } from './src/ui/chapters.js';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type()==='error' && !m.text().includes('favicon')) errs.push(m.text()); });
await p.goto('http://localhost:5179/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => !!window.__oryzo, null, { timeout: 20000 });
const loaded = await p.waitForFunction(() => window.__oryzo.stage.modelLoaded === true, null, { timeout: 25000 })
  .then(() => true).catch(() => false);
console.log('GLB airframe loaded:', loaded);
for (let i = 0; i < BEATS.length; i++) {
  await p.evaluate((n) => window.__oryzo.goto(n), i);
  await p.waitForTimeout(650);
  await p.screenshot({ path: `X:/.projectz/ramco-aviation/shots/oryzo-build/${String(i).padStart(2,'0')}-${BEATS[i].id}.png` });
}
const info = await p.evaluate(() => {
  const r = window.__oryzo.renderer.info;
  return { calls: r.render.calls, tris: r.render.triangles, tex: r.memory.textures };
});
console.log('render:', JSON.stringify(info));
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0,6).join('\n') : 'no console errors');
await b.close();
