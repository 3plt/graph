import winston, { loggers } from 'winston'
const { combine, timestamp, printf, colorize, align } = winston.format

let format

switch (process.env.NODE_ENV) {
  case 'development':
  case 'test':
    format = combine(
      colorize(),
      align(),
      printf((info) => `${info.level}: ${info.module ?? 'core'}: ${info.message}`)
    )
    break
  default:
    format = combine(
      timestamp({
        format: 'YYYY-MM-DD hh:mm:ss.SSS A',
      }),
      json()
    )
    break
}

export const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'warn',
  format,
  transports: [new winston.transports.Console()],
})

export function logger(module) {
  return log.child({ module })
}

