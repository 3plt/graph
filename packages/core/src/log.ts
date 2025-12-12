type LogLevel = 'error' | 'warn' | 'info' | 'debug'

const levels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

const currentLevel: LogLevel = 'debug'

function shouldLog(level: LogLevel): boolean {
  return levels[level] <= levels[currentLevel]
}


export function logger(module: string) {
  return {
    error: (msg: string, ...args: any[]) => shouldLog('error') && console.error(`[${module}] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => shouldLog('warn') && console.warn(`[${module}] ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => shouldLog('info') && console.info(`[${module}] ${msg}`, ...args),
    debug: (msg: string, ...args: any[]) => shouldLog('debug') && console.debug(`[${module}] ${msg}`, ...args),
  }
}

export const log = logger('core')