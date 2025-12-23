import type { IngestMessage } from '@3plate/graph-core'

type StatusListener = (status: 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error', detail?: any) => void

export class WebSocketSource<N, E> {
  private url: string
  private ws: WebSocket | null = null
  private onMessage: (msg: IngestMessage<N, E>) => void
  private onStatus?: StatusListener
  private reconnectMs: number
  private closedByUser = false

  constructor(url: string, onMessage: (msg: IngestMessage<N, E>) => void, onStatus?: StatusListener, reconnectMs: number = 1500) {
    this.url = url
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.reconnectMs = reconnectMs
  }

  connect() {
    this.closedByUser = false
    this.open()
  }

  disconnect() {
    this.closedByUser = true
    if (this.ws) {
      try { this.ws.close() } catch {}
      this.ws = null
    }
    this.onStatus?.('closed')
  }

  private open() {
    this.onStatus?.(this.ws ? 'reconnecting' : 'connecting')
    const ws = new WebSocket(this.url)
    this.ws = ws
    ws.onopen = () => this.onStatus?.('connected')
    ws.onerror = (e) => this.onStatus?.('error', e)
    ws.onclose = () => {
      if (this.closedByUser) {
        this.onStatus?.('closed')
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
