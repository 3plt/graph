import pino from 'pino'

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

// Resolve log level from environment or default to 'debug' (matches previous behavior)
const resolvedLevel: LogLevel =
  (typeof globalThis !== 'undefined' && (globalThis as any).__LOG_LEVEL) ||
  (typeof process !== 'undefined' && (process as any).env?.LOG_LEVEL) ||
  'debug'

// Configure browser options: emit objects, optionally transmit to collector
const browserOpts: any = { asObject: true }
browserOpts.transmit = {
  level: resolvedLevel,
  send: (level: string, log: Record<string, unknown>) => {
    try {
      const endpoint: string | undefined =
        (typeof globalThis !== 'undefined' && (globalThis as any).__LOG_INGEST_URL) ||
        (typeof process !== 'undefined' && (process as any).env?.LOG_INGEST_URL) ||
        undefined
      if (!endpoint || typeof window === 'undefined') {
        // Dev aid: show why transmit may be inactive
        try { console.debug('[graph-core] transmit skipped', { endpoint, hasWindow: typeof window !== 'undefined', level }) } catch { }
        return
      }
      const line = JSON.stringify({ level, ...log, ts: Date.now() }) + '\n'
      try { console.debug('[graph-core] transmit sending', { endpoint, level, bytes: line.length }) } catch { }
      // Always use fetch with no-cors and omit credentials to avoid preflight and credentialed requests
      fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        credentials: 'omit',
        body: line,
        keepalive: true,
      })
        .then(() => { try { console.debug('[graph-core] transmit fetch ok') } catch { } })
        .catch((err) => { try { console.debug('[graph-core] transmit fetch error', err?.message || err) } catch { } })
    } catch (e) {
      try { console.debug('[graph-core] transmit error', (e as any)?.message || e) } catch { }
    }
  },
}

// Create a singleton pino base logger
const base = pino({
  level: resolvedLevel,
  browser: browserOpts,
})

export function logger(module: string) {
  const child = base.child({ module })
  return {
    error: (msg: string, ...args: any[]) => child.error({ args }, msg),
    warn: (msg: string, ...args: any[]) => child.warn({ args }, msg),
    info: (msg: string, ...args: any[]) => child.info({ args }, msg),
    debug: (msg: string, ...args: any[]) => child.debug({ args }, msg),
  }
}

export const log = logger('core')
