import { Pos, Orientation } from '../common'
import { Node } from './node'
import { Seg } from './seg'
import { Dims } from '../common'
import { CanvasOptions, RenderNode } from '../api/options'
import { NodeId, NodeKey, PublicNodeData, Node as GraphNode } from '../graph/node'
import { SegId, Seg as GraphSeg } from '../graph/seg'
import { logger } from '../log'
import { markerDefs, styles as markerStyles } from './marker'

import styles from './canvas.css?raw'
import styler from './styler'

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
      node = new Node(this, gnode)
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

  addSeg(gseg: GraphSeg) {
    if (this.curSegs.has(gseg.id))
      throw new Error('seg already exists')
    const seg = new Seg(this, gseg)
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
    return `${this.bounds.min.x} ${this.bounds.min.y} ${this.bounds.max.x - this.bounds.min.x} ${this.bounds.max.y - this.bounds.min.y}`
  }

  private createCanvasContainer() {
    const style = document.createElement('style')
    style.textContent = markerStyles
    document.head.appendChild(style)
    const c = styler('canvas', styles, this.classPrefix)
    this.container = (<div
      className={c('container')}
      ref={(el: HTMLElement) => this.container = el}
      // {...panZoomHandlers}
      // style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
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

}