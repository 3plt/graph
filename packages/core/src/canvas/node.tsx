import { Dims, Pos, Orientation, Dir } from '../common'
import { Canvas } from './canvas'
import { PublicNodeData } from '../graph/node'
import { logger } from '../log'

import styles from './node.css?raw'
import styler from './styler'

const log = logger('canvas')

export type NodeEvent = (node: any, e: MouseEvent) => void

export class Node {
  selected: boolean
  hovered: boolean
  container!: SVGElement
  content!: HTMLElement
  canvas: Canvas
  data?: PublicNodeData
  classPrefix: string
  isDummy: boolean
  pos?: Pos

  constructor(canvas: Canvas, data?: PublicNodeData) {
    this.canvas = canvas
    this.data = data
    this.selected = false
    this.hovered = false
    this.classPrefix = data?.style?.classPrefix ?? canvas.classPrefix
    this.isDummy = !data

    if (this.isDummy) {
      const size = canvas.dummyNodeSize
    } else {
      const render = data!.render ?? canvas.renderNode
      this.content = this.renderContent(render(data!.data))
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

  handleClick(e: MouseEvent) {
    e.stopPropagation()
    // this.onClick?.(this.data, e)
  }

  handleMouseEnter(e: MouseEvent) {
    // this.onMouseEnter?.(this.data, e)
  }

  handleMouseLeave(e: MouseEvent) {
    // this.onMouseLeave?.(this.data, e)
  }

  handleContextMenu(e: MouseEvent) {
    // if (this.onContextMenu) {
    //   e.stopPropagation()
    //   this.onContextMenu(this.data, e)
    // }
  }

  handleMouseDown(e: MouseEvent) {
    // this.onMouseDown?.(this.data, e)
  }

  handleMouseUp(e: MouseEvent) {
    // this.onMouseUp?.(this.data, e)
  }

  setPos(pos: Pos) {
    this.pos = pos
    const { x, y } = pos
    this.container!.setAttribute('transform', `translate(${x}, ${y})`)
  }

  styleAttr(key: string, def?: string | number): string | number | undefined {
    return this.style(key, def) as string | number | undefined
  }

  styleBool(key: string, def?: boolean): boolean {
    return this.style(key, def) as boolean
  }

  style(key: string, def?: string | number | boolean): string | number | boolean | undefined {
    const path = key.split('.')
    let value: any = this.data!.style
    for (const k of path) {
      value = value?.[k]
      if (value === undefined) break
    }
    if (value !== undefined) return value
    value = this.canvas.nodeStyle
    for (const k of path) {
      value = value?.[k]
      if (value === undefined) break
    }
    return value ?? def
  }

  hasPorts(): boolean {
    return !!this.data?.ports?.in?.length || !!this.data?.ports?.out?.length
  }

  renderContent(el: HTMLElement): HTMLElement {
    const hasPorts = this.hasPorts()
    const portStyle = this.styleAttr('portStyle', 'outside')
    if (hasPorts && portStyle == 'inside')
      el = this.renderInsidePorts(el)
    if (this.styleBool('border.draw', true))
      el = this.renderBorder(el)
    if (hasPorts && portStyle == 'outside')
      el = this.renderOutsidePorts(el)
    return el
  }

  renderContainer() {
    const c = styler('node', styles, this.classPrefix)
    const hasPorts = this.hasPorts()
    const inner = this.isDummy ? this.renderDummy() : this.renderForeign()
    this.container = (
      <g
        className={`${c('container')} ${c('dummy', this.isDummy)}`}
        onClick={(e) => this.handleClick(e)}
        onMouseEnter={(e) => this.handleMouseEnter(e)}
        onMouseLeave={(e) => this.handleMouseLeave(e)}
        onContextMenu={(e) => this.handleContextMenu(e)}
        onMouseDown={(e) => this.handleMouseDown(e)}
        onMouseUp={(e) => this.handleMouseUp(e)}
        style={{ cursor: 'pointer' }}
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
    const c = styler('node', styles, this.classPrefix)
    let w = this.canvas.dummyNodeSize
    let h = this.canvas.dummyNodeSize
    const s = this.styleAttr('border.size')
    w /= 2
    h /= 2
    return (<g>
      <ellipse
        cx={w} cy={h} rx={w} ry={h}
        className={c('background')}
      />
      <ellipse
        cx={w} cy={h} rx={w} ry={h}
        fill="none"
        className={c('border')}
        strokeWidth={s}
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
        const el = this.content.querySelector(`#g3p-port-${data.id}-${port.id}`)
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

    const c = styler('node', styles, this.classPrefix)
    const pos = this.getPortPosition(dir)
    const isVertical = this.isVerticalOrientation()
    const layoutClass = isVertical ? 'row' : 'col'
    const rotateLabels = !isVertical && this.styleBool('portLabelRotate', false)
    const rotateClass = rotateLabels ? `port-rotated-${pos}` : ''

    return (
      <div className={`${c('ports')} ${c(`ports-${layoutClass}`)}`}>
        {ports.map(port => (
          <div
            id={`g3p-port-${this.data!.id}-${port.id}`}
            className={`${c('port')} ${c(`port-${inout}-${pos}`)} ${c(rotateClass)}`}
          >
            {port.label ?? port.id}
          </div>
        ))}
      </div>
    ) as HTMLElement
  }

  renderInsidePorts(el: HTMLElement): HTMLElement {
    const c = styler('node', styles, this.classPrefix)
    const isVertical = this.isVerticalOrientation()
    const isReversed = this.isReversedOrientation()
    let inPorts = this.renderPortRow('in', 'in')
    let outPorts = this.renderPortRow('out', 'in')

    if (!inPorts && !outPorts) return el
    if (isReversed) [inPorts, outPorts] = [outPorts, inPorts]
    const wrapperClass = isVertical ? 'v' : 'h'

    return (
      <div className={`${c('with-ports')} ${c(`with-ports-${wrapperClass}`)}`}>
        {inPorts}
        {el}
        {outPorts}
      </div>
    ) as HTMLElement
  }

  renderOutsidePorts(el: HTMLElement): HTMLElement {
    const c = styler('node', styles, this.classPrefix)
    const isVertical = this.isVerticalOrientation()
    const isReversed = this.isReversedOrientation()
    let inPorts = this.renderPortRow('in', 'out')
    let outPorts = this.renderPortRow('out', 'out')

    if (!inPorts && !outPorts) return el
    if (isReversed) [inPorts, outPorts] = [outPorts, inPorts]
    const wrapperClass = isVertical ? 'v' : 'h'

    return (
      <div className={`${c('with-ports')} ${c(`with-ports-${wrapperClass}`)}`}>
        {inPorts}
        {el}
        {outPorts}
      </div>
    ) as HTMLElement
  }

  renderBorder(el: HTMLElement): HTMLElement {
    const c = styler('node', styles, this.classPrefix)
    const r = this.styleAttr('border.radius')
    const s = this.styleAttr('border.size')
    return <div
      className={c('border')}
      style={{ borderRadius: r, borderWidth: s }}
    >
      {el}
    </div> as HTMLElement
  }
}
