import type { IngestMessage } from '../ingest'

type StatusListener = (status: 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error', detail?: any) => void

export class WebSocketSource<N, E> {
  private url: string
  private ws: WebSocket | null = null
  private onMessage: (msg: IngestMessage<N, E>) => void
  private onStatus?: StatusListener
  private reconnectMs: number
  private closedByUser = false
  private connectStartTime: number | null = null
  private totalTimeoutMs: number = 10000
  private totalTimeoutTimer: number | null = null

  constructor(url: string, onMessage: (msg: IngestMessage<N, E>) => void, onStatus?: StatusListener, reconnectMs: number = 1500) {
    this.url = url
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.reconnectMs = reconnectMs
  }

  connect() {
    this.closedByUser = false
    this.connectStartTime = Date.now()
    this.startTotalTimeout()
    this.open()
  }

  disconnect() {
    this.closedByUser = true
    this.clearTotalTimeout()
    if (this.ws) {
      try { this.ws.close() } catch { }
      this.ws = null
    }
    this.onStatus?.('closed')
  }

  private startTotalTimeout() {
    this.clearTotalTimeout()
    this.totalTimeoutTimer = window.setTimeout(() => {
      if (!this.closedByUser && this.ws?.readyState !== WebSocket.OPEN) {
        // Total timeout elapsed, abort connection attempts
        this.closedByUser = true
        if (this.ws) {
          try { this.ws.close() } catch { }
          this.ws = null
        }
        this.clearTotalTimeout()
        this.onStatus?.('error', new Error('Connection timeout after 10 seconds'))
      }
    }, this.totalTimeoutMs)
  }

  private clearTotalTimeout() {
    if (this.totalTimeoutTimer !== null) {
      clearTimeout(this.totalTimeoutTimer)
      this.totalTimeoutTimer = null
    }
    this.connectStartTime = null
  }

  private open() {
    // Check if we've exceeded total timeout
    if (this.connectStartTime && Date.now() - this.connectStartTime >= this.totalTimeoutMs) {
      if (!this.closedByUser) {
        this.closedByUser = true
        this.clearTotalTimeout()
        this.onStatus?.('error', new Error('Connection timeout after 10 seconds'))
      }
      return
    }

    this.onStatus?.(this.ws ? 'reconnecting' : 'connecting')
    const ws = new WebSocket(this.url)
    this.ws = ws

    ws.onopen = () => {
      this.clearTotalTimeout()
      this.onStatus?.('connected')
    }
    ws.onerror = (e) => {
      // Don't clear timeout on error, let it continue trying until total timeout
      this.onStatus?.('error', e)
    }
    ws.onclose = () => {
      if (this.closedByUser) {
        this.onStatus?.('closed')
        return
      }

      // Check if we've exceeded total timeout before reconnecting
      if (this.connectStartTime && Date.now() - this.connectStartTime >= this.totalTimeoutMs) {
        this.closedByUser = true
        this.clearTotalTimeout()
        this.onStatus?.('error', new Error('Connection timeout after 10 seconds'))
        return
      }

      this.onStatus?.('reconnecting')
      setTimeout(() => this.open(), this.reconnectMs)
    }
    ws.onmessage = (ev) => {
      const data = typeof ev.data === 'string' ? ev.data : ''
      // Accept either single JSON object or NDJSON lines
      const lines = data.split('\n').map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        try {
          const obj = JSON.parse(line)
          this.onMessage(obj)
        } catch {
          // ignore bad lines
        }
      }
    }
  }
}

