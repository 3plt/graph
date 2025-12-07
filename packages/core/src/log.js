import winston, { loggers } from 'winston'
import { VitestTransport } from './vitest-transport.js'
const { combine, timestamp, printf, colorize, align } = winston.format

let format
let transports

switch (process.env.NODE_ENV) {
  case 'development':
  case 'test':
    format = combine(
      colorize(),
      align(),
      printf((info) => `${info.level}: ${info.module ?? 'core'}: ${info.message}`)
    )
    // Use VitestTransport in test mode for proper output association
    transports = process.env.VITEST
      ? [new VitestTransport()]
      : [new winston.transports.Console()]
    break
  default:
    format = combine(
      timestamp({
        format: 'YYYY-MM-DD hh:mm:ss.SSS A',
      }),
      json()
    )
    transports = [new winston.transports.Console()]
    break
}

export const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'warn',
  format,
  transports,
})

export function logger(module) {
  return log.child({ module })
}

