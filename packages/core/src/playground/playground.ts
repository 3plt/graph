import { graph } from '../index'
import { applyIngestMessage } from '../api/ingest'
import type { API } from '../api/api'
import { WebSocketSource } from './sources/WebSocketSource'
import { FileSystemSource } from './sources/FileSystemSource'
import type { PlaygroundOptions, Example } from './types'
import styles from './styles.css?raw'

export class Playground {
  private options: PlaygroundOptions
  private rootElement: HTMLElement
  private currentExample: string
  private currentGraph: API<any, any> | null = null
  private isEditable = false
  private wsSource: WebSocketSource<any, any> | null = null
  private fsSource: FileSystemSource<any, any> | null = null
  private wsStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected'
  private fsStatus: 'disconnected' | 'opening' | 'connected' | 'error' = 'disconnected'
  private activeSourceType: 'ws' | 'folder' | null = null
  private wsUrl = 'ws://localhost:8787'
  private sourceModal: HTMLElement | null = null
  private helpOverlay: HTMLElement | null = null
  private exampleList: string[]
  private graphContainerId: string

  constructor(options: PlaygroundOptions) {
    this.options = options
    this.exampleList = Object.keys(options.examples)
    this.currentExample = options.defaultExample || this.exampleList[0]
    this.graphContainerId = `playground-graph-${Math.random().toString(36).substr(2, 9)}`

    // Resolve root element
    if (typeof options.root === 'string') {
      const el = document.getElementById(options.root)
      if (!el) throw new Error(`Element with id "${options.root}" not found`)
      this.rootElement = el
    } else {
      this.rootElement = options.root
    }
  }

  async init() {
    this.injectStyles()
    this.createDOM()
    this.setupEventListeners()
    await this.renderGraph()
    this.updateSourceIcon()

    // Set initial rebuild button state
    const rebuildBtn = this.rootElement.querySelector('#rebuild') as HTMLButtonElement | null
    if (rebuildBtn) rebuildBtn.disabled = !this.isEditable
  }

  private injectStyles() {
    if (!document.getElementById('g3p-playground-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'g3p-playground-styles'
      styleEl.textContent = styles
      document.head.appendChild(styleEl)
    }
  }

  private createDOM() {
    const exampleList = this.exampleList.map((key, i) => {
      const example = this.options.examples[key]
      const isActive = i === 0 || key === this.currentExample
      return `
        <button class="example-btn ${isActive ? 'active' : ''}" data-example="${key}">
          ${example.name}
        </button>
      `
    }).join('')

    this.rootElement.innerHTML = `
      <main class="playground">
        <div class="sidebar">
          <h2>Examples</h2>
          <div class="example-list">
            ${exampleList}
          </div>

          <h2>Options</h2>
          <div class="options">
            <div class="option-group">
              <label>Orientation</label>
              <select id="orientation">
                <option value="TB">Top to Bottom</option>
                <option value="BT">Bottom to Top</option>
                <option value="LR">Left to Right</option>
                <option value="RL">Right to Left</option>
              </select>
            </div>

            <div class="option-group">
              <label>Port Style</label>
              <select id="portStyle">
                <option value="outside">Outside</option>
                <option value="inside">Inside</option>
              </select>
            </div>

            <div class="option-group">
              <label>
                <input type="checkbox" id="portLabelRotate" />
                Rotate Port Labels
              </label>
            </div>

            <div class="option-group">
              <label>Theme</label>
              <select id="colorMode">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        <div class="graph-area">
          <div class="graph-toolbar">
            <div class="nav-controls">
              <button class="nav-btn" id="nav-first" title="First (Home)">⏮</button>
              <button class="nav-btn" id="nav-prev" title="Previous (←)">◀</button>
              <span id="history-label" style="min-width: 4rem; text-align: center; display: inline-flex; align-items: center; justify-content: center; height: 2.25rem;">— / —</span>
              <button class="nav-btn" id="nav-next" title="Next (→)">▶</button>
              <button class="nav-btn" id="nav-last" title="Last (End)">⏭</button>
            </div>
            <div class="connect-controls" style="display:flex; gap:.5rem; align-items:center;">
              <button class="nav-btn source-icon-btn" id="source-icon" title="Data Source Connection">📡</button>
            </div>
            <button class="nav-btn" id="help-btn" title="How to edit">❓</button>
            <button class="nav-btn" id="edit-toggle" title="Toggle edit mode">✎ Edit</button>
            <button class="nav-btn" id="rebuild" title="Rebuild graph from scratch">🔄 Rebuild</button>
          </div>
          <div class="graph-container" id="${this.graphContainerId}"></div>
        </div>
      </main>
    `
  }

  private setupEventListeners() {
    // Example button handlers
    this.rootElement.querySelectorAll('.example-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.rootElement.querySelectorAll('.example-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.currentExample = btn.getAttribute('data-example') || this.exampleList[0]
        this.renderGraph()
      })
    })

    // Option change handlers
    this.rootElement.querySelectorAll('.options select, .options input').forEach(el => {
      el.addEventListener('change', () => this.renderGraph())
    })

    // Navigation controls
    this.rootElement.querySelector('#nav-first')?.addEventListener('click', () => {
      this.currentGraph?.nav('first')
      this.updateHistoryLabel()
    })
    this.rootElement.querySelector('#nav-prev')?.addEventListener('click', () => {
      this.currentGraph?.nav('prev')
      this.updateHistoryLabel()
    })
    this.rootElement.querySelector('#nav-next')?.addEventListener('click', () => {
      this.currentGraph?.nav('next')
      this.updateHistoryLabel()
    })
    this.rootElement.querySelector('#nav-last')?.addEventListener('click', () => {
      this.currentGraph?.nav('last')
      this.updateHistoryLabel()
    })

    // Rebuild button
    this.rootElement.querySelector('#rebuild')?.addEventListener('click', () => {
      this.currentGraph?.rebuild()
    })

    // Edit toggle
    this.rootElement.querySelector('#edit-toggle')?.addEventListener('click', () => {
      this.isEditable = !this.isEditable
      const btn = this.rootElement.querySelector('#edit-toggle')
      if (btn) btn.textContent = this.isEditable ? '✓ Done' : '✎ Edit'
      const rebuildBtn = this.rootElement.querySelector('#rebuild') as HTMLButtonElement | null
      if (rebuildBtn) rebuildBtn.disabled = !this.isEditable
      try {
        this.currentGraph?.setEditable?.(this.isEditable)
      } catch {}
    })

    // Help button
    this.rootElement.querySelector('#help-btn')?.addEventListener('click', () => this.openHelp())

    // Source icon button
    const sourceIconBtn = this.rootElement.querySelector('#source-icon')
    if (sourceIconBtn) {
      sourceIconBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.openSourceModal()
      })
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.currentGraph) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

      switch (e.key) {
        case 'Home':
          this.currentGraph.nav('first')
          this.updateHistoryLabel()
          break
        case 'End':
          this.currentGraph.nav('last')
          this.updateHistoryLabel()
          break
        case 'ArrowLeft':
          this.currentGraph.nav('prev')
          this.updateHistoryLabel()
          break
        case 'ArrowRight':
          this.currentGraph.nav('next')
          this.updateHistoryLabel()
          break
      }
    })
  }

  private getResolvedColorMode(): 'light' | 'dark' {
    const mode = (this.rootElement.querySelector('#colorMode') as HTMLSelectElement)?.value
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return mode as 'light' | 'dark'
  }

  private getOptions(exampleOptions?: any) {
    const orientation = (this.rootElement.querySelector('#orientation') as HTMLSelectElement)?.value

    return {
      graph: { orientation },
      canvas: {
        width: '100%',
        height: '100%',
        colorMode: this.getResolvedColorMode(),
        editable: this.isEditable,
        ...exampleOptions?.canvas,
      }
    }
  }

  private async renderGraph() {
    const container = this.rootElement.querySelector(`#${this.graphContainerId}`) as HTMLElement
    if (!container) return

    container.innerHTML = ''

    const example = this.options.examples[this.currentExample]
    const options = this.getOptions(example.options)

    try {
      this.currentGraph = await graph({
        root: this.graphContainerId,
        nodes: example.nodes as any,
        edges: example.edges as any,
        options,
        events: {
          historyChange: () => this.updateHistoryLabel(),
        }
      } as any)
      this.updateHistoryLabel()
    } catch (e) {
      console.error('Failed to render graph:', e)
      container.innerHTML = '<p style="padding: 2rem; color: #ef4444;">Failed to load graph</p>'
    }
  }

  private updateHistoryLabel() {
    const label = this.rootElement.querySelector('#history-label')
    if (!label || !this.currentGraph) return
    try {
      const idx = this.currentGraph.getHistoryIndex?.() ?? 0
      const len = this.currentGraph.getHistoryLength?.() ?? 1
      label.textContent = `${idx + 1} / ${len}`
    } catch {
      label.textContent = '— / —'
    }
  }

  private openHelp() {
    if (!this.helpOverlay) {
      this.helpOverlay = document.createElement('div')
      this.helpOverlay.className = 'modal-overlay'
      this.helpOverlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <div class="modal-header">
            <h3 id="help-title">Editing the Graph</h3>
            <button class="modal-close" title="Close" aria-label="Close">×</button>
          </div>
          <div class="modal-body">
            <p>Here's how to edit the graph:</p>
            <ul>
              <li><strong>Enable editing</strong>: Click "Edit"</li>
              <li><strong>Add a node</strong>: Double‑click an empty area</li>
              <li><strong>Edit a node</strong>: Double‑click a node</li>
              <li><strong>Edit an edge</strong>: Double‑click an edge</li>
              <li><strong>Create an edge</strong>: Click and drag from a node (or its port) onto another node; press Esc to cancel</li>
              <li><strong>Pan</strong>: Drag on canvas or edges; <strong>Zoom</strong>: Mouse wheel or controls</li>
              <li><strong>Rebuild</strong>: Use "Rebuild" to re-layout from scratch (enabled in edit mode)</li>
            </ul>
            <p>When you're done, click "Done" to lock the canvas.</p>
          </div>
        </div>
      `
      document.body.appendChild(this.helpOverlay)
      this.helpOverlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('modal-overlay') || target.classList.contains('modal-close')) {
          this.closeHelp()
        }
      })
    }
    this.helpOverlay.style.display = 'flex'
  }

  private closeHelp() {
    if (this.helpOverlay) this.helpOverlay.style.display = 'none'
  }

  private handleIngestMessage(msg: any) {
    if (!this.currentGraph) return
    applyIngestMessage(this.currentGraph, msg)
  }

  private updateSourceIcon() {
    const iconBtn = this.rootElement.querySelector('#source-icon')
    if (!iconBtn) return
    iconBtn.classList.remove('active', 'connecting', 'error')

    const isConnected = (this.activeSourceType === 'ws' && this.wsStatus === 'connected') ||
                        (this.activeSourceType === 'folder' && this.fsStatus === 'connected')
    const isConnecting = (this.activeSourceType === 'ws' && this.wsStatus === 'connecting') ||
                         (this.activeSourceType === 'folder' && this.fsStatus === 'opening')
    const hasError = (this.activeSourceType === 'ws' && this.wsStatus === 'error') ||
                     (this.activeSourceType === 'folder' && this.fsStatus === 'error')

    if (isConnected) {
      iconBtn.classList.add('active')
      iconBtn.textContent = this.activeSourceType === 'folder' ? '📁' : '📡'
    } else if (isConnecting) {
      iconBtn.classList.add('connecting')
      iconBtn.textContent = this.activeSourceType === 'folder' ? '📁' : '📡'
    } else if (hasError) {
      iconBtn.classList.add('error')
      iconBtn.textContent = this.activeSourceType === 'folder' ? '📁' : '📡'
    } else {
      iconBtn.textContent = '📡'
    }
  }

  private updateWsStatus = (status: 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error', detail?: any) => {
    if (status === 'connecting' || status === 'reconnecting') {
      this.wsStatus = 'connecting'
      this.activeSourceType = 'ws'
    } else if (status === 'connected') {
      this.wsStatus = 'connected'
      this.activeSourceType = 'ws'
      if (this.fsSource && this.fsStatus === 'connected') {
        this.fsSource.close()
      }
    } else if (status === 'error') {
      this.wsStatus = 'error'
    } else {
      this.wsStatus = 'disconnected'
      if (this.activeSourceType === 'ws') {
        this.activeSourceType = null
      }
    }
    this.updateSourceIcon()
    this.updateSourceModal()
  }

  private updateFsStatus = (status: 'idle' | 'opened' | 'reading' | 'error' | 'closed', detail?: any) => {
    if (status === 'opened') {
      this.fsStatus = 'opening'
      this.activeSourceType = 'folder'
      if (this.wsSource && this.wsStatus === 'connected') {
        this.wsSource.disconnect()
      }
    } else if (status === 'reading') {
      this.fsStatus = 'connected'
      this.activeSourceType = 'folder'
    } else if (status === 'error') {
      this.fsStatus = 'error'
    } else if (status === 'closed') {
      this.fsStatus = 'disconnected'
      if (this.activeSourceType === 'folder') {
        this.activeSourceType = null
      }
    } else {
      this.fsStatus = 'disconnected'
    }
    this.updateSourceIcon()
    this.updateSourceModal()
  }

  private createSourceModal() {
    if (this.sourceModal) return this.sourceModal

    this.sourceModal = document.createElement('div')
    this.sourceModal.className = 'modal-overlay'
    this.sourceModal.style.display = 'none'
    this.sourceModal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="source-modal-title">
        <div class="modal-header">
          <h3 id="source-modal-title">Data Source Connection</h3>
          <button class="modal-close" title="Close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="source-type-selector">
            <button class="source-type-option" data-source="ws">📡 WebSocket</button>
            <button class="source-type-option" data-source="folder">📁 Folder</button>
          </div>

          <div class="source-controls" data-source="ws">
            <div class="form-group">
              <label for="source-modal-url">WebSocket URL</label>
              <input type="text" id="source-modal-url" value="${this.wsUrl}" />
            </div>
            <div class="button-group">
              <button id="source-modal-connect-ws" class="primary">Connect</button>
              <button id="source-modal-disconnect-ws">Disconnect</button>
              <button id="source-modal-change-ws">Change Connection</button>
            </div>
          </div>

          <div class="source-controls" data-source="folder">
            <div class="form-group">
              <label>File System Source</label>
              <p style="font-size: 0.875rem; color: var(--color-text-muted); margin-top: 0.25rem;">
                Select a directory containing a graph.ndjson file to watch for changes.
              </p>
            </div>
            <div class="button-group">
              <button id="source-modal-connect-folder" class="primary">Open Folder</button>
              <button id="source-modal-disconnect-folder">Disconnect</button>
            </div>
          </div>

          <div id="source-modal-status"></div>
        </div>
      </div>
    `
    document.body.appendChild(this.sourceModal)

    this.sourceModal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('modal-overlay') || target.classList.contains('modal-close')) {
        this.closeSourceModal()
      }
    })

    this.sourceModal.querySelectorAll('.source-type-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const sourceType = btn.getAttribute('data-source')
        if (sourceType) {
          this.selectSourceType(sourceType as 'ws' | 'folder')
        }
      })
    })

    document.getElementById('source-modal-connect-ws')?.addEventListener('click', () => this.handleConnect())
    document.getElementById('source-modal-disconnect-ws')?.addEventListener('click', () => this.handleDisconnect())
    document.getElementById('source-modal-change-ws')?.addEventListener('click', () => this.handleChangeConnection())
    document.getElementById('source-modal-connect-folder')?.addEventListener('click', () => this.handleOpenFolder())
    document.getElementById('source-modal-disconnect-folder')?.addEventListener('click', () => this.handleCloseFolder())

    document.getElementById('source-modal-url')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.wsStatus !== 'connected') {
        this.handleConnect()
      }
    })

    return this.sourceModal
  }

  private selectSourceType(type: 'ws' | 'folder', skipUpdate = false) {
    if (!this.sourceModal) return

    this.sourceModal.querySelectorAll('.source-type-option').forEach(btn => {
      if (btn.getAttribute('data-source') === type) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })

    this.sourceModal.querySelectorAll('.source-controls').forEach(controls => {
      if (controls.getAttribute('data-source') === type) {
        controls.classList.add('active')
      } else {
        controls.classList.remove('active')
      }
    })

    if (!skipUpdate) {
      this.updateSourceModalContent()
    }
  }

  private updateSourceModalContent() {
    if (!this.sourceModal) return

    const urlInput = document.getElementById('source-modal-url') as HTMLInputElement
    const connectWsBtn = document.getElementById('source-modal-connect-ws') as HTMLButtonElement
    const disconnectWsBtn = document.getElementById('source-modal-disconnect-ws') as HTMLButtonElement
    const changeWsBtn = document.getElementById('source-modal-change-ws') as HTMLButtonElement

    if (urlInput && connectWsBtn && disconnectWsBtn && changeWsBtn) {
      const isWsConnected = this.wsStatus === 'connected'
      const isWsConnecting = this.wsStatus === 'connecting'

      connectWsBtn.disabled = isWsConnected || isWsConnecting
      disconnectWsBtn.disabled = !isWsConnected || isWsConnecting
      changeWsBtn.disabled = !isWsConnected || isWsConnecting
      urlInput.disabled = isWsConnecting
    }

    const connectFolderBtn = document.getElementById('source-modal-connect-folder') as HTMLButtonElement
    const disconnectFolderBtn = document.getElementById('source-modal-disconnect-folder') as HTMLButtonElement

    if (connectFolderBtn && disconnectFolderBtn) {
      const isFolderConnected = this.fsStatus === 'connected'
      const isFolderOpening = this.fsStatus === 'opening'

      connectFolderBtn.disabled = isFolderConnected || isFolderOpening
      disconnectFolderBtn.disabled = !isFolderConnected || isFolderOpening
    }

    const statusDiv = document.getElementById('source-modal-status')
    if (!statusDiv) return

    const currentUrl = urlInput?.value || this.wsUrl
    statusDiv.innerHTML = ''

    if (this.activeSourceType === 'ws') {
      if (this.wsStatus === 'connecting') {
        statusDiv.innerHTML = `
          <div class="status-message info">
            <span class="loading-spinner"></span>
            Connecting to ${currentUrl}...
          </div>
        `
      } else if (this.wsStatus === 'connected') {
        statusDiv.innerHTML = `
          <div class="status-message success">
            ✓ Connected to ${currentUrl}
          </div>
        `
      } else if (this.wsStatus === 'error') {
        statusDiv.innerHTML = `
          <div class="status-message error">
            ✗ Connection error. Please check the URL and try again.
          </div>
        `
      } else {
        statusDiv.innerHTML = `
          <div class="status-message info">
            Not connected
          </div>
        `
      }
    } else if (this.activeSourceType === 'folder') {
      if (this.fsStatus === 'opening') {
        statusDiv.innerHTML = `
          <div class="status-message info">
            <span class="loading-spinner"></span>
            Opening folder...
          </div>
        `
      } else if (this.fsStatus === 'connected') {
        statusDiv.innerHTML = `
          <div class="status-message success">
            ✓ Folder connected and watching for changes
          </div>
        `
      } else if (this.fsStatus === 'error') {
        statusDiv.innerHTML = `
          <div class="status-message error">
            ✗ Error opening folder. Please try again.
          </div>
        `
      } else {
        statusDiv.innerHTML = `
          <div class="status-message info">
            Not connected
          </div>
        `
      }
    } else {
      statusDiv.innerHTML = `
        <div class="status-message info">
          Select a source type to connect
        </div>
      `
    }
  }

  private updateSourceModal() {
    if (!this.sourceModal) return

    const activeType = this.activeSourceType || 'ws'
    this.selectSourceType(activeType, true)
    this.updateSourceModalContent()
  }

  private openSourceModal() {
    this.createSourceModal()
    if (this.sourceModal) {
      const urlInput = document.getElementById('source-modal-url') as HTMLInputElement
      if (urlInput) {
        urlInput.value = this.wsUrl
      }
      const activeType = this.activeSourceType || 'ws'
      this.selectSourceType(activeType)
      this.updateSourceModal()
      this.sourceModal.style.display = 'flex'
    }
  }

  private closeSourceModal() {
    if (this.sourceModal) {
      this.sourceModal.style.display = 'none'
    }
  }

  private handleConnect() {
    const urlInput = document.getElementById('source-modal-url') as HTMLInputElement
    if (!urlInput) return

    const url = urlInput.value.trim() || 'ws://localhost:8787'
    this.wsUrl = url

    if (this.wsSource) {
      this.wsSource.disconnect()
    }

    this.wsSource = new WebSocketSource(url, this.handleIngestMessage.bind(this), this.updateWsStatus)
    this.wsSource.connect()
    this.updateSourceModal()
  }

  private handleDisconnect() {
    this.wsSource?.disconnect()
    this.updateSourceModal()
  }

  private handleChangeConnection() {
    if (this.wsSource) {
      this.wsSource.disconnect()
    }
    const urlInput = document.getElementById('source-modal-url') as HTMLInputElement
    if (urlInput) {
      urlInput.focus()
      urlInput.select()
    }
    this.updateSourceModal()
  }

  private async handleOpenFolder() {
    if (!this.fsSource) {
      this.fsSource = new FileSystemSource(this.handleIngestMessage.bind(this), this.updateFsStatus)
    }
    this.updateSourceModal()
    await this.fsSource.openDirectory()
  }

  private handleCloseFolder() {
    this.fsSource?.close()
    this.updateSourceModal()
  }
}

