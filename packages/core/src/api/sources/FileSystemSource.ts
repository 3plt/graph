import type { IngestMessage } from '../ingest'

type StatusListener = (status: 'idle' | 'opened' | 'reading' | 'error' | 'closed', detail?: any) => void

export class FileSystemSource<N, E> {
  private handle: FileSystemFileHandle | null = null
  private onMessage: (msg: IngestMessage<N, E>) => void
  private onStatus?: StatusListener
  private timer: number | null = null
  private lastSize = 0
  private filename: string
  private intervalMs: number

  constructor(onMessage: (msg: IngestMessage<N, E>) => void, onStatus?: StatusListener, filename: string = 'graph.ndjson', intervalMs: number = 1000) {
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.filename = filename
    this.intervalMs = intervalMs
  }

  async openDirectory() {
    try {
      // @ts-ignore
      const dir = await (window as any).showDirectoryPicker?.()
      if (!dir) throw new Error('File System Access not supported or cancelled')
      const handle = await dir.getFileHandle(this.filename, { create: false })
      this.handle = handle
      this.onStatus?.('opened', { file: this.filename })
      this.lastSize = 0
      this.startPolling()
    } catch (e) {
      this.onStatus?.('error', e)
    }
  }

  close() {
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    this.handle = null
    this.onStatus?.('closed')
  }

  private startPolling() {
    if (this.timer) window.clearInterval(this.timer)
    this.timer = window.setInterval(() => this.readNewLines(), this.intervalMs)
  }

  private async readNewLines() {
    try {
      if (!this.handle) return
      this.onStatus?.('reading')
      const file = await this.handle.getFile()
      if (file.size === this.lastSize) return
      const slice = await file.slice(this.lastSize).text()
      this.lastSize = file.size
      const lines = slice.split('\n').map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        try {
          const obj = JSON.parse(line) as IngestMessage<N, E>
          this.onMessage(obj)
        } catch {
          // ignore malformed lines
        }
      }
    } catch (e) {
      this.onStatus?.('error', e)
    }
  }
}

