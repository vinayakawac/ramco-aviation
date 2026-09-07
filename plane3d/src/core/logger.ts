// Structured logger for AIRCRAFT-001.
// Every event is a JSON object {t, level, scope, msg, ...data}. In the browser the
// events are mirrored to the Vite dev endpoint /__log which appends them to logs/.
// In Node (tests) they go to stdout only.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  t: string;
  level: LogLevel;
  scope: string;
  msg: string;
  [key: string]: unknown;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

let minLevel: LogLevel = 'debug';
const queue: LogEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const isBrowser = typeof window !== 'undefined' && typeof fetch === 'function';
// Only mirror to the dev sink while running under `vite` (import.meta.env.DEV).
const mirrorEnabled = isBrowser && Boolean((import.meta as any).env?.DEV);

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function flush(): void {
  flushTimer = null;
  if (!mirrorEnabled || queue.length === 0) return;
  const body = queue.splice(0).map((e) => JSON.stringify(e)).join('\n');
  // fire-and-forget; a failed mirror must never break the app
  fetch('/__log', { method: 'POST', body, keepalive: true }).catch(() => undefined);
}

function emit(level: LogLevel, scope: string, msg: string, data?: Record<string, unknown>): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) return;
  const ev: LogEvent = { t: new Date().toISOString(), level, scope, msg, ...(data ?? {}) };
  const line = `[${ev.t}] ${level.toUpperCase().padEnd(5)} ${scope}: ${msg}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  data ? fn(line, data) : fn(line);
  if (mirrorEnabled) {
    queue.push(ev);
    if (!flushTimer) flushTimer = setTimeout(flush, 500);
  }
}

/** Create a scoped logger, e.g. `const log = createLogger('AircraftBuilder')`. */
export function createLogger(scope: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) => emit('debug', scope, msg, data),
    info: (msg: string, data?: Record<string, unknown>) => emit('info', scope, msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => emit('warn', scope, msg, data),
    error: (msg: string, data?: Record<string, unknown>) => emit('error', scope, msg, data),
  };
}

export type Logger = ReturnType<typeof createLogger>;
