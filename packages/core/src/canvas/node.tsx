import { Dims, Pos } from '../common'
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
  dims?: Dims
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
      this.dims = { w: size, h: size }
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

  setDims(dims: Dims) {
    this.dims = dims
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

  styleAttr(key: string): string | number | undefined {
    return this.style(key) as string | number | undefined
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
    if (this.hasPorts() && this.styleAttr('portStyle') == 'inside')
      el = this.renderInsidePorts(el)
    if (this.styleBool('border.draw', true))
      el = this.renderBorder(el)
    if (this.hasPorts() && this.styleAttr('portStyle') == 'outside')
      el = this.renderOutsidePorts(el)
    return el
  }

  renderContainer() {
    const c = styler('node', styles, this.canvas.classPrefix)
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
    const { w, h } = this.dims!
    return (
      <foreignObject width={w} height={h}>
        {this.content}
      </foreignObject>
    ) as SVGElement
  }

  renderDummy(): SVGElement {
    const c = styler('node', styles, this.canvas.classPrefix)
    let { w, h } = this.dims!
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

  renderInsidePorts(el: HTMLElement): HTMLElement {
    return el
  }

  renderOutsidePorts(el: HTMLElement): HTMLElement {
    return el
  }

  renderBorder(el: HTMLElement): HTMLElement {
    const c = styler('node', styles, this.canvas.classPrefix)
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
