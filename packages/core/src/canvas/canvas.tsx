import { Pos, Orientation, ScreenPos, CanvasPos, GraphPos, screenPos, canvasPos, graphPos } from '../common'
import { Node } from './node'
import { Seg } from './seg'
import { Graph } from '../graph/graph'
import { CanvasOptions, RenderNode, ThemeVars, NewEdge, NewNode } from '../api/options'
import { NodeId, NodeKey, PublicNodeData, PortId, Node as GraphNode } from '../graph/node'
import { SegId, Seg as GraphSeg } from '../graph/seg'
import { logger } from '../log'
import { markerDefs } from './marker'
import { EditMode } from './editMode'
import { renderNewEdge } from './newEdge'
import { NewNodeModal, EditNodeModal, EditEdgeModal } from './modal'
import { API, EditNodeProps, EditEdgeProps } from '../api/api'

import styles from './styles.css?raw'

const log = logger('canvas')

type ViewportTransform = {
  x: number
  y: number
  scale: number
}

type Bounds = {
  min: Pos
  max: Pos
}

type CanvasData<N, E> = Required<CanvasOptions<N>> & {
  renderNode: RenderNode<N>
  dummyNodeSize: number
  orientation: Orientation
}

export interface Canvas<N, E> extends CanvasData<N, E> { }

export class Canvas<N, E> {
  container?: HTMLElement
  root?: SVGElement
  group?: SVGElement
  transform!: ViewportTransform
  bounds: Bounds
  measurement?: HTMLElement
  allNodes: Map<NodeKey, Node>
  curNodes: Map<NodeId, Node>
  curSegs: Map<SegId, Seg>
  updating: boolean

  // Pan-zoom state
  private panScale: { x: number, y: number } | null = null
  private zoomControls?: HTMLElement

  // Edit mode state machine
  editMode: EditMode
  api: API<N, E>

  // New-edge visual element
  private newEdgeEl?: SVGElement

  // Pending drag state (for double-click debounce)
  private pendingDrag: { timeout: number, nodeId: string, startGraph: GraphPos, portId?: string } | null = null

  constructor(api: API<N, E>, options: CanvasData<N, E>) {
    Object.assign(this, options)
    this.api = api
    this.allNodes = new Map()
    this.curNodes = new Map()
    this.curSegs = new Map()
    this.updating = false
    this.bounds = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
    this.transform = { x: 0, y: 0, scale: 1 }
    this.editMode = new EditMode()
    this.editMode.editable = this.editable
    this.createMeasurementContainer()
    this.createCanvasContainer()
    if (this.panZoom) this.setupPanZoom()
  }

  private createMeasurementContainer() {
    this.measurement = document.createElement('div')
    this.measurement.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      visibility: hidden;
      pointer-events: none;
    `
    document.body.appendChild(this.measurement)
  }

  getNode(key: NodeKey): Node {
    const node = this.allNodes.get(key)
    if (!node) throw new Error(`node not found: ${key}`)
    return node
  }

  update() {
    let bx0 = Infinity, by0 = Infinity
    let bx1 = -Infinity, by1 = -Infinity
    for (const node of this.curNodes.values()) {
      const { x, y } = node.pos!
      const { w, h } = node.data!.dims!
      const nx0 = x, nx1 = x + w
      const ny0 = y, ny1 = y + h
      bx0 = Math.min(bx0, nx0)
      by0 = Math.min(by0, ny0)
      bx1 = Math.max(bx1, nx1)
      by1 = Math.max(by1, ny1)
    }
    this.bounds = { min: { x: bx0, y: by0 }, max: { x: bx1, y: by1 } }
    this.root!.setAttribute('viewBox', this.viewBox())
  }

  addNode(gnode: GraphNode) {
    if (this.curNodes.has(gnode.id))
      throw new Error('node already exists')
    const { key } = gnode
    let node: Node
    if (gnode.isDummy) {
      node = new Node(this, gnode, true)
      node.renderContainer()
      this.allNodes.set(key, node)
    } else {
      if (!this.allNodes.has(key))
        throw new Error('node has not been measured')
      node = this.getNode(key)
    }
    this.curNodes.set(gnode.id, node)
    node.append()
    node.setPos(gnode.pos!)
  }

  updateNode(gnode: GraphNode) {
    if (gnode.isDummy) throw new Error('dummy node cannot be updated')
    const node = this.getNode(gnode.key)
    const cur = this.curNodes.get(gnode.id)
    if (cur) cur.remove()
    this.curNodes.set(gnode.id, node)
    node.append()
  }

  deleteNode(gnode: GraphNode) {
    const node = this.getNode(gnode.key)
    this.curNodes.delete(gnode.id)
    node.remove()
  }

  addSeg(gseg: GraphSeg, g: Graph) {
    if (this.curSegs.has(gseg.id))
      throw new Error('seg already exists')
    const seg = new Seg(this, gseg, g)
    this.curSegs.set(gseg.id, seg)
    seg.append()
  }

  updateSeg(gseg: GraphSeg, g: Graph) {
    const seg = this.curSegs.get(gseg.id)
    if (!seg) throw new Error('seg not found')
    seg.update(gseg, g)
  }

  deleteSeg(gseg: GraphSeg) {
    const seg = this.curSegs.get(gseg.id)
    if (!seg) throw new Error('seg not found')
    this.curSegs.delete(gseg.id)
    seg.remove()
  }

  async measureNodes(nodes: PublicNodeData[]): Promise<Map<any, Node>> {
    const newNodes: Map<any, Node> = new Map()
    for (const data of nodes) {
      const node = new Node(this, data)
      newNodes.set(data.data, node)
      this.measurement!.appendChild(node.content)
    }
    await new Promise(requestAnimationFrame)
    const isVertical = this.orientation === 'TB' || this.orientation === 'BT'
    for (const node of newNodes.values()) {
      node.measure(isVertical)
      const { id, version } = node.data!
      const key = `k:${id}:${version}`
      this.allNodes.set(key, node)
      node.renderContainer()
    }
    this.measurement!.innerHTML = ''
    return newNodes
  }

  // ========== Mouse event handlers ==========

  private onClick(e: MouseEvent) {
    const hit = this.hitTest(e.clientX, e.clientY)
    if (hit.type === 'node') {
      this.api.handleClickNode(hit.node.data.id)
    } else if (hit.type === 'edge') {
      this.api.handleClickEdge(hit.segId)
    }
  }

  private onDoubleClick(e: MouseEvent) {
    // Cancel any pending drag
    if (this.pendingDrag) {
      window.clearTimeout(this.pendingDrag.timeout)
      this.pendingDrag = null
    }
    if (!this.editMode.editable) return
    const hit = this.hitTest(e.clientX, e.clientY)
    if (hit.type === 'node') {
      if (hit.node.isDummy) return
      this.api.handleEditNode(hit.node.data.id)
    } else if (hit.type === 'edge') {
      this.api.handleEditEdge(hit.segId)
    } else {
      this.api.handleNewNode()
    }
  }

  // ========== Built-in Modals ==========

  /** Show the new node modal */
  showNewNodeModal(callback: (data: NewNode) => void) {
    const nodeTypes = Object.keys(this.nodeTypes)
    const fields = this.api.getNodeFields()
    const modal = new NewNodeModal({
      nodeTypes: nodeTypes.length > 0 ? nodeTypes : undefined,
      fields: fields.size > 0 ? fields : undefined,
      onSubmit: (data) => { callback(data) }
    })
    modal.show(document.body)
  }

  /** Show the edit node modal */
  showEditNodeModal(node: Record<string, any>, callback: (data: Record<string, any>) => void) {
    const nodeTypes = Object.keys(this.nodeTypes)
    const fields = this.api.getNodeFields()
    const modal = new EditNodeModal({
      node,
      nodeTypes: nodeTypes.length > 0 ? nodeTypes : undefined,
      fields: fields.size > 0 ? fields : undefined,
      onSubmit: (data) => { callback(data) },
      onDelete: () => { this.api.handleDeleteNode(node.id) }
    })
    modal.show(document.body)
  }

  /** Show the edit edge modal */
  showEditEdgeModal(edge: EditEdgeProps, callback: (data: EditEdgeProps) => void) {
    const modal = new EditEdgeModal({
      edge,
      edgeTypes: Object.keys(this.edgeTypes),
      onSubmit: callback,
      onDelete: () => { this.api.handleDeleteEdge(edge.id) },
    })
    modal.show(document.body)
  }

  private onContextMenu(e: MouseEvent) {
    // Context menu - could be used for right-click menus
  }

  private groupTransform(): string {
    return `translate(${this.transform.x}, ${this.transform.y}) scale(${this.transform.scale})`
  }

  private viewBox(): string {
    const p = this.padding
    const x = this.bounds.min.x - p
    const y = this.bounds.min.y - p
    const w = this.bounds.max.x - this.bounds.min.x + p * 2
    const h = this.bounds.max.y - this.bounds.min.y + p * 2
    return `${x} ${y} ${w} ${h}`
  }

  private generateDynamicStyles(): string {
    let css = ''

    // Global theme overrides
    css += themeToCSS(this.theme, `.g3p-canvas-container`)

    // Node type styles
    for (const [type, vars] of Object.entries(this.nodeTypes)) {
      css += themeToCSS(vars, `.g3p-node-type-${type}`, 'node')
    }

    // Edge type styles
    for (const [type, vars] of Object.entries(this.edgeTypes)) {
      css += themeToCSS(vars, `.g3p-edge-type-${type}`)
    }

    return css
  }

  private createCanvasContainer() {
    // Inject base styles once
    if (!document.getElementById('g3p-styles')) {
      const baseStyleEl = document.createElement('style')
      baseStyleEl.id = 'g3p-styles'
      baseStyleEl.textContent = styles
      document.head.appendChild(baseStyleEl)
    }

    // Always inject dynamic styles (node/edge types) for this canvas instance
    const dynamicStyles = this.generateDynamicStyles()
    if (dynamicStyles) {
      const dynamicStyleEl = document.createElement('style')
      dynamicStyleEl.textContent = dynamicStyles
      document.head.appendChild(dynamicStyleEl)
    }

    // Build color mode class
    const colorModeClass = this.colorMode !== 'system' ? `g3p-${this.colorMode}` : ''

    this.container = (<div
      className={`g3p-canvas-container ${colorModeClass}`.trim()}
      ref={(el: HTMLElement) => this.container = el}
      onContextMenu={this.onContextMenu.bind(this)}
    >
      <svg
        ref={(el: SVGElement) => this.root = el}
        className="g3p-canvas-root"
        width={this.width}
        height={this.height}
        viewBox={this.viewBox()}
        preserveAspectRatio="xMidYMid meet"
        onClick={this.onClick.bind(this)}
        onDblClick={this.onDoubleClick.bind(this)}
      >
        <defs>
          {Object.values(markerDefs).map(marker => marker(this.markerSize, false))}
          {Object.values(markerDefs).map(marker => marker(this.markerSize, true))}
        </defs>
        <g
          ref={(el: SVGElement) => this.group = el}
          transform={this.groupTransform()}
        />
      </svg>
    </div>) as HTMLElement
  }

  // ==================== Pan-Zoom ====================

  private setupPanZoom() {
    // Mouse wheel zoom
    this.container!.addEventListener('wheel', this.onWheel.bind(this), { passive: false })

    // Pan with left mouse button
    this.container!.addEventListener('mousedown', this.onMouseDown.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))

    // Keyboard handler for escape to cancel new-edge mode
    document.addEventListener('keydown', this.onKeyDown.bind(this))

    // Create zoom controls
    this.createZoomControls()
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.editMode.isCreatingEdge) {
      this.endNewEdge(true) // cancelled
    }
  }

  /** Convert screen coordinates to canvas-relative coordinates */
  private screenToCanvas(screen: ScreenPos): CanvasPos {
    const rect = this.container!.getBoundingClientRect()
    return canvasPos(screen.x - rect.left, screen.y - rect.top)
  }

  /** Convert canvas coordinates to graph coordinates */
  private canvasToGraph(canvas: CanvasPos): GraphPos {
    const vb = this.currentViewBox()
    const { scale, offsetX, offsetY } = this.getEffectiveScale()

    // Convert canvas position to graph position, accounting for centering
    return graphPos(
      vb.x - offsetX + canvas.x * scale,
      vb.y - offsetY + canvas.y * scale
    )
  }

  /** Convert screen coordinates to graph coordinates */
  private screenToGraph(screen: ScreenPos): GraphPos {
    const canvas = this.screenToCanvas(screen)
    return this.canvasToGraph(canvas)
  }

  /**
   * Get the effective scale from canvas pixels to graph units,
   * accounting for preserveAspectRatio="xMidYMid meet" which uses
   * the smaller scale (to fit) and centers the content.
   */
  private getEffectiveScale(): { scale: number, offsetX: number, offsetY: number } {
    const vb = this.currentViewBox()
    const rect = this.container!.getBoundingClientRect()

    const scaleX = vb.w / rect.width
    const scaleY = vb.h / rect.height

    // "meet" uses the larger scale value (smaller zoom) to fit content
    const scale = Math.max(scaleX, scaleY)

    // Calculate offset due to centering (xMidYMid)
    const actualW = rect.width * scale
    const actualH = rect.height * scale
    const offsetX = (actualW - vb.w) / 2
    const offsetY = (actualH - vb.h) / 2

    return { scale, offsetX, offsetY }
  }

  /** Get current viewBox as an object */
  private currentViewBox(): { x: number, y: number, w: number, h: number } {
    const p = this.padding
    const t = this.transform
    const baseX = this.bounds.min.x - p
    const baseY = this.bounds.min.y - p
    const baseW = this.bounds.max.x - this.bounds.min.x + p * 2
    const baseH = this.bounds.max.y - this.bounds.min.y + p * 2

    // Apply transform: scale around center, then translate
    const cx = baseX + baseW / 2
    const cy = baseY + baseH / 2
    const w = baseW / t.scale
    const h = baseH / t.scale
    const x = cx - w / 2 - t.x
    const y = cy - h / 2 - t.y

    return { x, y, w, h }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault()

    const zoomFactor = 1.1
    const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor

    // Get cursor position in canvas coordinates
    const screenCursor = screenPos(e.clientX, e.clientY)
    const canvasCursor = this.screenToCanvas(screenCursor)

    // Get cursor position in graph coordinates BEFORE zoom
    const graphCursor = this.canvasToGraph(canvasCursor)

    // Apply zoom
    const oldScale = this.transform.scale
    const newScale = Math.max(0.1, Math.min(10, oldScale * delta))
    this.transform.scale = newScale

    // Get cursor position in graph coordinates AFTER zoom
    const newGraphCursor = this.canvasToGraph(canvasCursor)

    // Adjust translation to keep cursor at same graph position
    this.transform.x += (newGraphCursor.x - graphCursor.x)
    this.transform.y += (newGraphCursor.y - graphCursor.y)

    this.applyTransform()
  }

  private onMouseDown(e: MouseEvent) {
    // Only handle left button
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.g3p-zoom-controls')) return

    const hit = this.hitTest(e.clientX, e.clientY)

    // In editable mode, schedule new-edge from node or port (not dummy nodes)
    // Use a timeout to allow double-click to cancel the drag
    if (this.editMode.editable && (hit.type === 'node' || hit.type === 'port')) {
      const node = hit.node
      if (node.isDummy) return // Dummy nodes can't be edge endpoints

      e.preventDefault()
      e.stopPropagation()
      const startGraph = this.screenToGraph(hit.center)
      const portId = hit.type === 'port' ? hit.port : undefined

      // Schedule drag start after a short delay (to allow double-click)
      this.pendingDrag = {
        timeout: window.setTimeout(() => {
          if (this.pendingDrag) {
            this.startNewEdge(this.pendingDrag.nodeId, this.pendingDrag.startGraph, this.pendingDrag.portId)
            this.pendingDrag = null
          }
        }, 200),
        nodeId: node.data.id,
        startGraph,
        portId,
      }
      return
    }

    // Start panning on canvas
    if (hit.type === 'canvas' || hit.type === 'edge') {
      const startCanvas = this.screenToCanvas(screenPos(e.clientX, e.clientY))
      this.editMode.startPan(startCanvas, { ...this.transform })

      const { scale } = this.getEffectiveScale()
      this.panScale = { x: scale, y: scale }

      this.container!.style.cursor = 'grabbing'
      e.preventDefault()
    }
  }

  private onMouseMove(e: MouseEvent) {
    // Handle new-edge mode
    if (this.editMode.isCreatingEdge) {
      const screenCursor = screenPos(e.clientX, e.clientY)
      const canvasCursor = this.screenToCanvas(screenCursor)
      const graphCursor = this.canvasToGraph(canvasCursor)
      this.editMode.updateNewEdgePosition(graphCursor)
      this.updateNewEdgeVisual()

      // Detect hover target using elementFromPoint
      this.detectHoverTarget(e.clientX, e.clientY)
      return
    }

    // Handle panning
    if (!this.editMode.isPanning || !this.panScale) return

    const panState = this.editMode.state
    if (panState.type !== 'panning') return

    const current = this.screenToCanvas(screenPos(e.clientX, e.clientY))

    // Calculate delta in canvas pixels
    const dx = current.x - panState.startCanvas.x
    const dy = current.y - panState.startCanvas.y

    // Update transform using scale captured at pan start
    this.transform.x = panState.startTransform.x + dx * this.panScale.x
    this.transform.y = panState.startTransform.y + dy * this.panScale.y

    this.applyTransform()
  }

  private onMouseUp(e: MouseEvent) {
    // Cancel any pending drag that didn't start
    if (this.pendingDrag) {
      window.clearTimeout(this.pendingDrag.timeout)
      this.pendingDrag = null
    }

    // Handle new-edge mode
    if (this.editMode.isCreatingEdge) {
      this.endNewEdge(false)
      return
    }

    // Handle panning
    if (!this.editMode.isPanning) return
    this.editMode.reset()
    this.panScale = null
    this.container!.style.cursor = ''
  }

  private applyTransform() {
    const vb = this.currentViewBox()
    this.root!.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`)
    this.updateZoomLevel()
  }

  private createZoomControls() {
    this.zoomControls = (<div className="g3p-zoom-controls">
      <button className="g3p-zoom-btn" onClick={() => this.zoomIn()}>+</button>
      <div className="g3p-zoom-level" id="g3p-zoom-level">100%</div>
      <button className="g3p-zoom-btn" onClick={() => this.zoomOut()}>−</button>
      <button className="g3p-zoom-btn g3p-zoom-reset" onClick={() => this.zoomReset()}>⟲</button>
    </div>) as HTMLElement

    this.container!.appendChild(this.zoomControls)
  }

  private updateZoomLevel() {
    const level = this.container!.querySelector('#g3p-zoom-level')
    if (level) {
      level.textContent = `${Math.round(this.transform.scale * 100)}%`
    }
  }

  zoomIn() {
    this.transform.scale = Math.min(10, this.transform.scale * 1.2)
    this.applyTransform()
  }

  zoomOut() {
    this.transform.scale = Math.max(0.1, this.transform.scale / 1.2)
    this.applyTransform()
  }

  zoomReset() {
    this.transform = { x: 0, y: 0, scale: 1 }
    this.applyTransform()
  }

  // ==================== New-Edge Mode ====================

  /** Start creating a new edge from a node */
  startNewEdge(sourceNodeId: string, startGraph: GraphPos, sourcePortId?: string) {
    this.editMode.startNewEdge(sourceNodeId, startGraph, sourcePortId)
    this.updateNewEdgeVisual()
    this.container!.style.cursor = 'crosshair'
  }

  /** Update the new-edge visual during drag */
  private updateNewEdgeVisual() {
    const state = this.editMode.getNewEdgeState()
    if (!state) {
      this.removeNewEdgeVisual()
      return
    }

    // Remove old element
    if (this.newEdgeEl) {
      this.newEdgeEl.remove()
    }

    // Create new element
    this.newEdgeEl = renderNewEdge({
      start: state.startGraph,
      end: state.currentGraph,
    })

    this.group!.appendChild(this.newEdgeEl)
  }

  /** Remove the new-edge visual */
  private removeNewEdgeVisual() {
    if (this.newEdgeEl) {
      this.newEdgeEl.remove()
      this.newEdgeEl = undefined
    }
  }

  /** Complete or cancel the new-edge creation */
  endNewEdge(cancelled: boolean = false) {
    const state = this.editMode.getNewEdgeState()
    if (!state) return

    if (!cancelled) {
      const { target, source } = state
      if (target?.type == 'node') {
        this.api.handleAddEdge({ id: '', source, target })
      } else {
        this.api.handleNewNodeFrom(source)
      }
    }

    this.removeNewEdgeVisual()
    this.clearDropTargetHighlight()
    this.editMode.reset()
    this.container!.style.cursor = ''
  }

  /** Find node data by internal ID */
  private findNodeDataById(nodeId: string): any | null {
    for (const node of this.curNodes.values()) {
      if (node.data?.id === nodeId) {
        return node.data.data
      }
    }
    return null
  }

  /** Set hover target for new-edge mode */
  setNewEdgeHoverTarget(id: string, port?: string) {
    // Clear previous highlight
    this.clearDropTargetHighlight()
    this.editMode.setHoverTarget({ type: 'node', id, port })
    if (port) {
      const portEl = this.container?.querySelector(`.g3p-node-port[data-node-id="${id}"][data-port-id="${port}"]`)
      if (portEl) portEl.classList.add('g3p-drop-target')
    } else {
      const node = this.curNodes.get(id)
      if (node?.container) node.container.classList.add('g3p-drop-target')
    }
  }

  /** Clear hover target for new-edge mode */
  clearNewEdgeHoverTarget() {
    this.clearDropTargetHighlight()
    this.editMode.setHoverTarget(null)
  }

  /** Remove drop target highlight from all elements */
  private clearDropTargetHighlight() {
    // Clear from nodes
    for (const node of this.curNodes.values()) {
      node.container?.classList.remove('g3p-drop-target')
    }
    // Clear from ports
    this.container?.querySelectorAll('.g3p-drop-target').forEach(el => {
      el.classList.remove('g3p-drop-target')
    })
  }

  /** Detect hover target during new-edge drag using elementFromPoint */
  private detectHoverTarget(clientX: number, clientY: number) {
    // Temporarily hide the new-edge visual so it doesn't block hit testing
    if (this.newEdgeEl) {
      this.newEdgeEl.style.display = 'none'
    }

    const el = document.elementFromPoint(clientX, clientY)

    // Restore the new-edge visual
    if (this.newEdgeEl) {
      this.newEdgeEl.style.display = ''
    }

    if (!el) {
      this.clearNewEdgeHoverTarget()
      return
    }

    // Check for port first (more specific)
    const portEl = el.closest('.g3p-node-port')
    if (portEl) {
      const nodeId = portEl.getAttribute('data-node-id')
      const portId = portEl.getAttribute('data-port-id')
      if (nodeId && portId) {
        const node = this.curNodes.get(nodeId)
        if (node && !node.isDummy) {
          this.setNewEdgeHoverTarget(nodeId, portId)
          return
        }
      }
    }

    // Check for node container
    const nodeEl = el.closest('.g3p-node-container')
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id')
      if (nodeId) {
        const node = this.curNodes.get(nodeId)
        if (node && !node.isDummy) {
          this.setNewEdgeHoverTarget(node.data.id)
          return
        }
      }
    }

    // Not over a node or port
    this.clearNewEdgeHoverTarget()
  }

  // ==================== Hit Testing ====================

  /** Result of a hit test */
  private hitTest(clientX: number, clientY: number): HitTestResult {
    const el = document.elementFromPoint(clientX, clientY)
    if (!el) return { type: 'canvas' }

    const getCenter = (el: Element) => {
      const rect = el.getBoundingClientRect()
      return screenPos(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }

    // Check for port first (more specific)
    const portEl = el.closest('.g3p-node-port')
    if (portEl) {
      const nodeId = portEl.getAttribute('data-node-id')
      const portId = portEl.getAttribute('data-port-id')
      if (nodeId && portId) {
        const center = getCenter(portEl)
        const node = this.curNodes.get(nodeId)
        if (node) {
          return { type: 'port', node, port: portId, center }
        }
      }
    }

    // Check for node
    const nodeEl = el.closest('.g3p-node-container')
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id')
      if (nodeId) {
        const borderEl = el.closest('.g3p-node-border')
        const center = getCenter(borderEl ?? nodeEl)
        const node = this.curNodes.get(nodeId)
        if (node) {
          return { type: 'node', node, center }
        }
      }
    }

    // Check for edge (segment)
    const edgeEl = el.closest('.g3p-seg-container')
    if (edgeEl) {
      const segId = edgeEl.getAttribute('data-edge-id')
      if (segId) {
        return { type: 'edge', segId }
      }
    }

    return { type: 'canvas' }
  }
}

/** Hit test result types */
type HitTestResult =
  | { type: 'canvas' }
  | { type: 'node'; node: Node, center: ScreenPos }
  | { type: 'port'; node: Node; port: string, center: ScreenPos }
  | { type: 'edge'; segId: string }

/** Maps ThemeVars property names to CSS variable names */
const themeVarMap: Partial<Record<keyof ThemeVars, string>> = {
  // Canvas
  bg: '--g3p-bg',
  shadow: '--g3p-shadow',
  // Node
  border: '--g3p-border',
  borderHover: '--g3p-border-hover',
  borderSelected: '--g3p-border-selected',
  text: '--g3p-text',
  textMuted: '--g3p-text-muted',
  // Port
  bgHover: '--g3p-port-bg-hover',
  // Edge
  color: '--g3p-edge-color',
}

function themeToCSS(theme: ThemeVars, selector: string, prefix: string = ''): string {
  const entries = Object.entries(theme).filter(([_, v]) => v !== undefined)
  if (!entries.length) return ''

  let css = `${selector} {\n`
  for (const [key, value] of entries) {
    let cssVar = themeVarMap[key as keyof ThemeVars]
    // Handle 'bg' specially based on context (node vs port)
    if (key === 'bg' && prefix === 'node') {
      cssVar = '--g3p-bg-node'
    } else if (key === 'bg' && prefix === 'port') {
      cssVar = '--g3p-port-bg'
    }
    if (cssVar) {
      css += `  ${cssVar}: ${value};\n`
    }
  }
  css += '}\n'
  return css
}
