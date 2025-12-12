import { renderNode } from './render-node'
import styles from './canvas.css?raw'
import styler from './styler'
import { Pos, Dims } from '../graph/types/enums'
import { Node, NodeOptions } from './node'
import { Seg, SegOptions } from './seg'

export type EdgeAttributes = {
  width?: number
  style?: string
  color?: string
  turnRadius?: number
  sourceTerminal?: string | null
  targetTerminal?: string | null
}

export type NodeAttributes = {
  strokeWidth?: number
  strokeStyle?: string
}

export type RenderNode<N> = (node: N) => HTMLElement
export type EdgeStyle = (type: string) => EdgeAttributes
export type NodeStyle<N> = (node: N) => NodeAttributes

export type PortStyle = 'inside' | 'outside' | 'custom'

export type CanvasOptions<N> = {
  renderNode?: RenderNode<N>
  nodeStyle?: NodeStyle<N>
  edgeStyle?: EdgeStyle
  width?: number | string
  height?: number | string
  portStyle?: PortStyle
  classPrefix?: string
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

export interface Canvas<N> extends Required<CanvasOptions<N>> { }

export class Canvas<N> {
  container?: HTMLElement
  root?: SVGElement
  group?: SVGElement
  transform!: ViewportTransform
  bounds!: Bounds
  measurement?: HTMLElement
  nodes: Map<N, Node>
  segs: Map<string, Seg>
  updating: boolean

  constructor(options?: CanvasOptions<N>) {
    Object.assign(this, {
      renderNode: renderNode,
      nodeStyle: () => ({}),
      edgeStyle: () => ({}),
      portStyle: 'outside',
      classPrefix: 'g3p',
      width: '100%',
      height: '100%',
      transform: { x: 0, y: 0, scale: 1 },
      bounds: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
      ...options,
    })
    this.nodes = new Map()
    this.segs = new Map()
    this.updating = false
    this.createMeasurementContainer()
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

  update(callback: () => void) {
    this.updating = true
    callback()
    this.updating = false
    let bx0 = Infinity, by0 = Infinity
    let bx1 = -Infinity, by1 = -Infinity
    for (const node of this.nodes.values()) {
      const nx0 = node.pos!.x, nx1 = node.pos!.x + node.dims!.w
      const ny0 = node.pos!.y, ny1 = node.pos!.y + node.dims!.h
      bx0 = Math.min(bx0, nx0)
      by0 = Math.min(by0, ny0)
      bx1 = Math.max(bx1, nx1)
      by1 = Math.max(by1, ny1)
    }
    this.bounds = { min: { x: bx0, y: by0 }, max: { x: bx1, y: by1 } }
    console.log('bounds', this.bounds)
    this.root!.setAttribute('viewBox', this.viewBox())
  }

  addNode(opts: NodeOptions) {
    const node = this.nodes.get(opts.data)
    if (!node) throw new Error('node not found')
    if (!node.container) node.render()
    node.setPos(opts.pos!)
    this.group!.appendChild(node.container!)
  }

  updateNode(opts: NodeOptions) {
    const node = this.nodes.get(opts.data)
    if (!node) throw new Error('node not found')
    node.setPos(opts.pos!)
  }

  deleteNode(opts: NodeOptions) {
    const node = this.nodes.get(opts.data)
    if (!node) throw new Error('node not found')
    node.container!.remove()
  }

  addSeg(opts: SegOptions) {
    const seg = new Seg(opts)
    this.segs.set(seg.segId, seg)
    seg.render()
    this.group!.appendChild(seg.el!)
  }

  updateSeg(opts: SegOptions) {
    const seg = this.segs.get(opts.segId)
    if (!seg) throw new Error('seg not found')
    seg.setSVG(opts.svg)
  }

  deleteSeg(opts: SegOptions) {
    const seg = this.segs.get(opts.segId)
    if (!seg) throw new Error('seg not found')
    seg.el!.remove()
    this.segs.delete(seg.segId)
  }

  async measure(nodes: any[]) {
    const newNodes: Node[] = []
    for (const data of nodes) {
      if (this.nodes.has(data)) continue
      const node = new Node({
        data,
        renderNode: this.renderNode,
        classPrefix: this.classPrefix,
        isDummy: false,
      })
      this.nodes.set(node.data, node)
      if (!node.measured) {
        this.measurement!.appendChild(node.content!)
        newNodes.push(node)
      }
    }
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        for (const node of newNodes)
          node.getSize()
        this.measurement!.textContent = ''
        resolve()
      })
    })
  }

  getDims(node: any) {
    return this.nodes.get(node)!.dims!
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

  render(): HTMLElement {
    const c = styler('canvas', styles, this.classPrefix)
    return (<div
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
        <g
          ref={(el: SVGElement) => this.group = el}
          transform={this.groupTransform()}
        />
      </svg>
    </div>) as HTMLElement
  }

}