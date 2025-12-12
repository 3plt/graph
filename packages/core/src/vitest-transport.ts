import Transport from 'winston-transport'

/**
 * Custom Winston transport for Vitest that uses console methods
 * instead of process.stdout/stderr. This ensures logs are properly
 * associated with tests in the VS Code Vitest extension.
 */
export class VitestTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts)
  }

  log(info: { [key: string | symbol]: any }, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info)
    })

    // Use console methods which Vitest intercepts
    const message = info[Symbol.for('message')] || info.message

    switch (info.level) {
      case 'error':
        console.error(message)
        break
      case 'warn':
        console.warn(message)
        break
      case 'info':
        console.info(message)
        break
      default:
        console.log(message)
    }

    callback()
  }
}
