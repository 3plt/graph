import { Canvas } from './canvas'
import { normalize } from './marker'
import { EdgeStyle } from '../api/options'
import { Seg as GraphSeg } from '../graph/seg'
import { MarkerType } from './marker'
import { logger } from '../log'

import styles from './seg.css?raw'
import styler from './styler'

const log = logger('canvas')

type SegEvent = (data: any, e: MouseEvent) => void

export class Seg {
  id: string
  selected: boolean
  hovered: boolean
  canvas: Canvas
  classPrefix: string
  style: EdgeStyle | undefined
  svg: string
  el: SVGElement
  source: { marker?: MarkerType }
  target: { marker?: MarkerType }

  constructor(canvas: Canvas, data: GraphSeg) {
    this.id = data.id
    this.canvas = canvas
    this.selected = false
    this.hovered = false
    this.svg = data.svg!
    this.classPrefix = canvas.classPrefix
    this.source = data.source
    this.target = data.target
    this.style = data.style
    this.el = this.render()
  }

  handleClick(e: MouseEvent) {
    e.stopPropagation()
    // this.onClick?.(this.edgeData, e)
  }

  handleMouseEnter(e: MouseEvent) {
    // this.onMouseEnter?.(this.edgeData, e)
  }

  handleMouseLeave(e: MouseEvent) {
    // this.onMouseLeave?.(this.edgeData, e)
  }

  handleContextMenu(e: MouseEvent) {
    // if (this.onContextMenu) {
    //   e.stopPropagation()
    //   this.onContextMenu(this.edgeData, e)
    // }
  }

  append() {
    this.canvas.group!.appendChild(this.el!)
  }

  remove() {
    this.el!.remove()
  }

  update(data: GraphSeg) {
    this.svg = data.svg!
    this.style = data.style
    this.source = data.source
    this.target = data.target
    this.remove()
    this.el = this.render()
    this.append()
  }

  render(): SVGElement {
    const c = styler('seg', styles, this.classPrefix)
    const styleAttrs = {
      stroke: this.style?.color,
      strokeWidth: this.style?.width,
      strokeDasharray: this.style?.style,
    }
    const { source, target } = normalize(this)
    return (
      <g
        ref={(el: SVGElement) => this.el = el}
        id={`g3p-seg-${this.id}`}
        className={c('container')}
        onClick={this.handleClick.bind(this)}
        onMouseEnter={this.handleMouseEnter.bind(this)}
        onMouseLeave={this.handleMouseLeave.bind(this)}
        onContextMenu={this.handleContextMenu.bind(this)}
      >
        <path
          d={this.svg}
          {...styleAttrs}
          fill="none"
          className={c('line')}
          markerStart={source ? `url(#g3p-marker-${source}-reverse)` : undefined}
          markerEnd={target ? `url(#g3p-marker-${target})` : undefined}
        />
        <path
          d={this.svg}
          {...styleAttrs}
          stroke="transparent"
          fill="none"
          className={c('hitbox')}
          style={{ cursor: 'pointer' }}
        />
      </g>
    ) as SVGElement
  }
}
