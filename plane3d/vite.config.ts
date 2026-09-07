// Vite + Vitest config for AIRCRAFT-001. The dev server also exposes a tiny
// log sink so browser structured logs land in logs/ (see src/core/logger.ts).
import { defineConfig } from 'vite';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function logSinkPlugin() {
  return {
    name: 'aircraft-001-log-sink',
    configureServer(server: any) {
      const dir = resolve(process.cwd(), 'logs');
      mkdirSync(dir, { recursive: true });
      server.middlewares.use('/__log', (req: any, res: any) => {
        let body = '';
        req.on('data', (c: Buffer) => (body += c));
        req.on('end', () => {
          // one JSON line per event, day-partitioned file
          const day = new Date().toISOString().slice(0, 10);
          appendFileSync(resolve(dir, `client-${day}.jsonl`), body + '\n');
          res.statusCode = 204;
          res.end();
        });
      });
      // canonical render capture: {day, name, png(dataURL)} → logs/renders/<day>/<name>.png
      server.middlewares.use('/__render', (req: any, res: any) => {
        let body = '';
        req.on('data', (c: Buffer) => (body += c));
        req.on('end', () => {
          try {
            const { day, name, png } = JSON.parse(body);
            const safeDay = String(day).replace(/[^0-9-]/g, '');
            const safeName = String(name).replace(/[^A-Za-z0-9_-]/g, '');
            const outDir = resolve(dir, 'renders', safeDay);
            mkdirSync(outDir, { recursive: true });
            writeFileSync(resolve(outDir, `${safeName}.png`), Buffer.from(String(png).split(',')[1], 'base64'));
            res.statusCode = 204;
          } catch (e) {
            res.statusCode = 400;
          }
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [logSinkPlugin()],
  build: { target: 'es2022', sourcemap: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
