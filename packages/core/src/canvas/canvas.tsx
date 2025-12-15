import { Pos, Orientation, ScreenPos, CanvasPos, GraphPos, screenPos, canvasPos, graphPos } from '../common'
import { Node } from './node'
import { Seg } from './seg'
import { Graph } from '../graph/graph'
import { CanvasOptions, RenderNode, ThemeVars } from '../api/options'
import { NodeId, NodeKey, PublicNodeData, Node as GraphNode } from '../graph/node'
import { SegId, Seg as GraphSeg } from '../graph/seg'
import { logger } from '../log'
import { markerDefs, styles as markerStyles } from './marker'

import styles from './canvas.css?raw'
import zoomStyles from './zoom.css?raw'
import styler from './styler'

const log = logger('canvas')

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

type ViewportTransform = {
  x: number
  y: number
  scale: number
}

type Bounds = {
  min: Pos
  max: Pos
}

type CanvasData = Required<CanvasOptions<any>> & {
  renderNode: RenderNode<any>
  dummyNodeSize: number
  orientation: Orientation
}

export interface Canvas extends CanvasData { }

export class Canvas {
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
  private isPanning: boolean = false
  private panStart: CanvasPos | null = null
  private transformStart: ViewportTransform | null = null
  private panScale: { x: number, y: number } | null = null
  private zoomControls?: HTMLElement

  constructor(options: CanvasData) {
    Object.assign(this, options)
    this.allNodes = new Map()
    this.curNodes = new Map()
    this.curSegs = new Map()
    this.updating = false
    this.bounds = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
    this.transform = { x: 0, y: 0, scale: 1 }
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
      node.setPos(gnode.pos!)
      this.allNodes.set(key, node)
    } else {
      if (!this.allNodes.has(key))
        throw new Error('node has not been measured')
      node = this.getNode(key)
    }
    this.curNodes.set(gnode.id, node)
    node.append()
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

  updateSeg(gseg: GraphSeg) {
    const seg = this.curSegs.get(gseg.id)
    if (!seg) throw new Error('seg not found')
    seg.update(gseg)
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
      const key = `${id}:${version}`
      this.allNodes.set(key, node)
      node.renderContainer()
    }
    this.measurement!.innerHTML = ''
    return newNodes
  }

  private onClick(e: MouseEvent) {
    console.log('click', e)
  }

  private onContextMenu(e: MouseEvent) {
    console.log('context menu', e)
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
    const prefix = this.classPrefix

    // Global theme overrides
    css += themeToCSS(this.theme, `.${prefix}-canvas-container`)

    // Node type styles
    for (const [type, vars] of Object.entries(this.nodeTypes)) {
      css += themeToCSS(vars, `.${prefix}-node-type-${type}`, 'node')
    }

    // Edge type styles
    for (const [type, vars] of Object.entries(this.edgeTypes)) {
      css += themeToCSS(vars, `.${prefix}-edge-type-${type}`)
    }

    return css
  }

  private createCanvasContainer() {
    // Inject marker styles
    const markerStyleEl = document.createElement('style')
    markerStyleEl.textContent = markerStyles
    document.head.appendChild(markerStyleEl)

    // Inject zoom control styles
    const zoomStyleEl = document.createElement('style')
    zoomStyleEl.textContent = zoomStyles
    document.head.appendChild(zoomStyleEl)

    // Inject dynamic theme styles
    const dynamicStyles = this.generateDynamicStyles()
    if (dynamicStyles) {
      const themeStyleEl = document.createElement('style')
      themeStyleEl.textContent = dynamicStyles
      document.head.appendChild(themeStyleEl)
    }

    const c = styler('canvas', styles, this.classPrefix)

    // Build color mode class
    const colorModeClass = this.colorMode !== 'system' ? `g3p-${this.colorMode}` : ''

    this.container = (<div
      className={`${c('container')} ${colorModeClass}`.trim()}
      ref={(el: HTMLElement) => this.container = el}
      onContextMenu={this.onContextMenu.bind(this)}
    >
      <svg
        ref={(el: SVGElement) => this.root = el}
        className={c('root')}
        width={this.width}
        height={this.height}
        viewBox={this.viewBox()}
        preserveAspectRatio="xMidYMid meet"
        onClick={this.onClick.bind(this)}
      >
        <defs>
          {Object.values(markerDefs).map(marker => marker(this.markerSize, this.classPrefix, false))}
          {Object.values(markerDefs).map(marker => marker(this.markerSize, this.classPrefix, true))}
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

    // Create zoom controls
    this.createZoomControls()
  }

  /** Convert screen coordinates to canvas-relative coordinates */
  private screenToCanvas(screen: ScreenPos): CanvasPos {
    const rect = this.container!.getBoundingClientRect()
    return canvasPos(screen.x - rect.left, screen.y - rect.top)
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
    // Only pan with left button, and not on interactive elements
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.g3p-zoom-controls')) return

    this.isPanning = true
    this.panStart = this.screenToCanvas(screenPos(e.clientX, e.clientY))
    this.transformStart = { ...this.transform }

    // Capture scale at start of pan so it stays consistent during drag
    const { scale } = this.getEffectiveScale()
    this.panScale = { x: scale, y: scale }

    this.container!.style.cursor = 'grabbing'
    e.preventDefault()
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isPanning || !this.panStart || !this.transformStart || !this.panScale) return

    const current = this.screenToCanvas(screenPos(e.clientX, e.clientY))

    // Calculate delta in canvas pixels
    const dx = current.x - this.panStart.x
    const dy = current.y - this.panStart.y

    // Update transform using scale captured at pan start
    this.transform.x = this.transformStart.x + dx * this.panScale.x
    this.transform.y = this.transformStart.y + dy * this.panScale.y

    this.applyTransform()
  }

  private onMouseUp(e: MouseEvent) {
    if (!this.isPanning) return
    this.isPanning = false
    this.panStart = null
    this.transformStart = null
    this.panScale = null
    this.container!.style.cursor = ''
  }

  private applyTransform() {
    const vb = this.currentViewBox()
    this.root!.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`)
    this.updateZoomLevel()
  }

  private createZoomControls() {
    const c = styler('zoom', zoomStyles, this.classPrefix)

    this.zoomControls = (<div className={c('controls')}>
      <button className={c('btn')} onClick={() => this.zoomIn()}>+</button>
      <div className={c('level')} id="g3p-zoom-level">100%</div>
      <button className={c('btn')} onClick={() => this.zoomOut()}>−</button>
      <button className={`${c('btn')} ${c('reset')}`} onClick={() => this.zoomReset()}>⟲</button>
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
}