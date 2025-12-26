import type { IngestMessage } from '../ingest'

export type FileStatus = 'idle' | 'opened' | 'reading' | 'error' | 'closed'
export type FileStatusListener = (status: FileStatus, detail?: any) => void
export type FileSourceArgs<N, E> = {
  url: string
  onMessage: (msg: IngestMessage<N, E>) => void
  onStatus?: FileStatusListener
  intervalMs?: number
}

export class FileSource<N, E> {
  private url: string
  private onMessage: (msg: IngestMessage<N, E>) => void
  private onStatus?: FileStatusListener
  private timer: number | null = null
  private lastETag: string | null = null
  private lastContent: string = ''
  private intervalMs: number = 1000
  private closed = false

  constructor(args: FileSourceArgs<N, E>) {
    this.url = args.url
    this.onMessage = args.onMessage
    this.onStatus = args.onStatus
    this.intervalMs = args.intervalMs ?? 1000
  }

  async connect() {
    this.closed = false
    this.lastETag = null
    this.lastContent = ''
    this.onStatus?.('opened')
    this.startPolling()
  }

  close() {
    this.closed = true
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    this.onStatus?.('closed')
  }

  private startPolling() {
    if (this.timer) window.clearInterval(this.timer)
    this.timer = window.setInterval(() => this.poll(), this.intervalMs)
    // Poll immediately
    this.poll()
  }

  private async poll() {
    if (this.closed) return

    try {
      this.onStatus?.('reading')
      const headers: HeadersInit = {}
      if (this.lastETag) {
        headers['If-None-Match'] = this.lastETag
      }

      const response = await fetch(this.url, { headers })

      if (response.status === 304) {
        // Not modified, no new content
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const etag = response.headers.get('ETag')
      if (etag) {
        this.lastETag = etag
      }

      const content = await response.text()

      if (content === this.lastContent) {
        return
      }

      // Parse new content (NDJSON)
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
      const lastContentLines = this.lastContent.split('\n').map(l => l.trim()).filter(Boolean)
      const newLines = lines.slice(lastContentLines.length)

      for (const line of newLines) {
        try {
          const obj = JSON.parse(line) as IngestMessage<N, E>
          this.onMessage(obj)
        } catch {
          // ignore malformed lines
        }
      }

      this.lastContent = content
    } catch (e) {
      this.onStatus?.('error', e)
    }
  }
}

