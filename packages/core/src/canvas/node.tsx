import { Dims, Pos, Orientation, Dir } from '../common'
import { Canvas } from './canvas'
import { PublicNodeData } from '../graph/node'

export class Node {
  selected: boolean
  hovered: boolean
  container!: SVGElement
  content!: HTMLElement
  canvas: Canvas<any, any>
  data: PublicNodeData
  isDummy: boolean
  pos?: Pos

  constructor(canvas: Canvas<any, any>, data: PublicNodeData, isDummy: boolean = false) {
    this.canvas = canvas
    this.data = data
    this.selected = false
    this.hovered = false
    this.isDummy = isDummy

    if (this.isDummy) {
      const size = canvas.dummyNodeSize
    } else {
      const render = data!.render ?? canvas.renderNode
      this.content = this.renderContent(render(data!.data, data!))
    }
  }

  remove() {
    this.container.remove()
  }

  append() {
    this.canvas.group!.appendChild(this.container)
  }

  needsContentSize(): boolean {
    return !this.isDummy && this.content instanceof HTMLElement
  }

  needsContainerSize(): boolean {
    return !this.isDummy
  }

  setPos(pos: Pos) {
    this.pos = pos
    const { x, y } = pos
    this.container!.setAttribute('transform', `translate(${x}, ${y})`)
  }

  hasPorts(): boolean {
    return !!this.data?.ports?.in?.length || !!this.data?.ports?.out?.length
  }

  renderContent(el: HTMLElement): HTMLElement {
    const hasPorts = this.hasPorts()
    // Ports rendered outside by default
    el = this.renderBorder(el)
    if (hasPorts)
      el = this.renderOutsidePorts(el)
    return el
  }

  renderContainer() {
    const hasPorts = this.hasPorts()
    const inner = this.isDummy ? this.renderDummy() : this.renderForeign()
    const nodeType = this.data?.type
    const typeClass = nodeType ? `g3p-node-type-${nodeType}` : ''
    this.container = (
      <g
        className={`g3p-node-container ${this.isDummy ? 'g3p-node-dummy' : ''} ${typeClass}`.trim()}
        data-node-id={this.data?.id}
      >
        {inner}
      </g>
    ) as SVGElement
  }

  renderForeign(): SVGElement {
    const { w, h } = this.data!.dims!
    return (
      <foreignObject width={w} height={h}>
        {this.content}
      </foreignObject>
    ) as SVGElement
  }

  renderDummy(): SVGElement {
    let w = this.canvas.dummyNodeSize
    let h = this.canvas.dummyNodeSize
    w /= 2
    h /= 2
    return (<g>
      <ellipse
        cx={w} cy={h} rx={w} ry={h}
        className="g3p-node-background"
      />
      <ellipse
        cx={w} cy={h} rx={w} ry={h}
        fill="none"
        className="g3p-node-border"
      />
    </g>) as SVGElement
  }

  measure(isVertical: boolean) {
    const rect = this.content.getBoundingClientRect()
    const data = this.data!
    data.dims = { w: rect.width, h: rect.height }
    for (const dir of ['in', 'out'] as const) {
      const ports = data.ports?.[dir]
      if (!ports) continue
      for (const port of ports) {
        const el = this.content.querySelector(`.g3p-node-port[data-node-id="${data.id}"][data-port-id="${port.id}"]`)
        if (!el) continue
        const portRect = el.getBoundingClientRect()
        if (isVertical) {
          port.offset = portRect.left - rect.left
          port.size = portRect.width
        } else {
          port.offset = portRect.top - rect.top
          port.size = portRect.height
        }
      }
    }
  }

  private getPortPosition(dir: Dir): 'top' | 'bottom' | 'left' | 'right' {
    const o = this.canvas.orientation
    if (dir === 'in') {
      if (o === 'TB') return 'top'
      if (o === 'BT') return 'bottom'
      if (o === 'LR') return 'left'
      return 'right' // RL
    } else {
      if (o === 'TB') return 'bottom'
      if (o === 'BT') return 'top'
      if (o === 'LR') return 'right'
      return 'left' // RL
    }
  }

  private isVerticalOrientation(): boolean {
    const o = this.canvas.orientation
    return o === 'TB' || o === 'BT'
  }

  private isReversedOrientation(): boolean {
    const o = this.canvas.orientation
    return o === 'BT' || o === 'RL'
  }

  private renderPortRow(dir: Dir, inout: Dir): HTMLElement | null {
    const ports = this.data?.ports?.[dir]
    if (!ports?.length) return null

    const pos = this.getPortPosition(dir)
    const isVertical = this.isVerticalOrientation()
    const layoutClass = isVertical ? 'row' : 'col'
    const rotateLabels = false // TODO: make configurable via CSS class
    const rotateClass = rotateLabels ? `port-rotated-${pos}` : ''

    return (
      <div className={`g3p-node-ports g3p-node-ports-${layoutClass}`}>
        {ports.map(port => (
          <div
            className={`g3p-node-port g3p-node-port-${inout}-${pos} ${rotateClass}`}
            data-node-id={this.data!.id}
            data-port-id={port.id}
          >
            {port.label ?? port.id}
          </div>
        ))}
      </div>
    ) as HTMLElement
  }

  renderInsidePorts(el: HTMLElement): HTMLElement {
    const isVertical = this.isVerticalOrientation()
    const isReversed = this.isReversedOrientation()
    let inPorts = this.renderPortRow('in', 'in')
    let outPorts = this.renderPortRow('out', 'in')

    if (!inPorts && !outPorts) return el
    if (isReversed) [inPorts, outPorts] = [outPorts, inPorts]
    const wrapperClass = isVertical ? 'v' : 'h'

    return (
      <div className={`g3p-node-with-ports g3p-node-with-ports-${wrapperClass}`}>
        {inPorts}
        {el}
        {outPorts}
      </div>
    ) as HTMLElement
  }

  renderOutsidePorts(el: HTMLElement): HTMLElement {
    const isVertical = this.isVerticalOrientation()
    const isReversed = this.isReversedOrientation()
    let inPorts = this.renderPortRow('in', 'out')
    let outPorts = this.renderPortRow('out', 'out')

    if (!inPorts && !outPorts) return el
    if (isReversed) [inPorts, outPorts] = [outPorts, inPorts]
    const wrapperClass = isVertical ? 'v' : 'h'

    return (
      <div className={`g3p-node-with-ports g3p-node-with-ports-${wrapperClass}`}>
        {inPorts}
        {el}
        {outPorts}
      </div>
    ) as HTMLElement
  }

  renderBorder(el: HTMLElement): HTMLElement {
    return <div className="g3p-node-border">
      {el}
    </div> as HTMLElement
  }
}
