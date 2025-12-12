import { EdgeAttributes } from './canvas'
import { Side } from '../graph/types/enums'
import styles from './seg.css?raw'
import styler from './styler'

type SegEvent = (data: any, e: MouseEvent) => void

export type SegOptions = {
  segId: string
  edgeId: string
  edgeData: any
  svg: string
  el?: SVGElement

  attrs?: EdgeAttributes
  onClick?: SegEvent
  onMouseEnter?: SegEvent
  onMouseLeave?: SegEvent
  onContextMenu?: SegEvent
  classPrefix?: string
  targetDummy: boolean
}

export interface Seg extends Required<SegOptions> { }

export class Seg {
  selected: boolean
  hovered: boolean

  constructor(options: SegOptions) {
    this.selected = false
    this.hovered = false

    Object.assign(this, {
      onClick: () => { },
      onMouseEnter: () => { },
      onMouseLeave: () => { },
      onContextMenu: () => { },
      classPrefix: 'g3p',
      ...options
    })

    this.attrs ??= {}
    this.attrs.targetTerminal ??= 'arrow'
  }

  handleClick(e: MouseEvent) {
    e.stopPropagation()
    this.onClick?.(this.edgeData, e)
  }

  handleMouseEnter(e: MouseEvent) {
    this.onMouseEnter?.(this.edgeData, e)
  }

  handleMouseLeave(e: MouseEvent) {
    this.onMouseLeave?.(this.edgeData, e)
  }

  handleContextMenu(e: MouseEvent) {
    if (this.onContextMenu) {
      e.stopPropagation()
      this.onContextMenu(this.edgeData, e)
    }
  }

  renderTerminals() {
    return {
      source: this.renderTerminal(this.attrs.sourceTerminal, 'source'),
      target: this.renderTerminal(this.attrs.targetTerminal, 'target'),
    }
  }

  setSVG(svg: string) {
    this.svg = svg
    const n = this.el!.childElementCount;
    (this.el!.childNodes[n - 2] as SVGPathElement).setAttribute('d', svg);
    (this.el!.childNodes[n - 1] as SVGPathElement).setAttribute('d', svg);
  }

  render(): SVGElement {
    const c = styler('edge', styles, this.classPrefix)
    const styleAttrs = {
      stroke: this.attrs.color,
      strokeWidth: this.attrs.width,
      strokeDasharray: this.attrs.style,
    }
    const hoverAttrs = {
      ...styleAttrs,
      strokeWidth: styleAttrs.strokeWidth ? Math.max(styleAttrs.strokeWidth * 3, 10) : undefined,
    }
    const { source, target } = this.renderTerminals()
    return (
      <g
        ref={(el: SVGElement) => this.el = el}
        id={`g3p-seg-${this.segId}`}
        className={c('container')}
        onClick={this.handleClick.bind(this)}
        onMouseEnter={this.handleMouseEnter.bind(this)}
        onMouseLeave={this.handleMouseLeave.bind(this)}
        onContextMenu={this.handleContextMenu.bind(this)}
      >
        {source?.defs}
        {target?.defs}
        <path
          d={this.svg}
          {...styleAttrs}
          fill="none"
          className={c('line')}
          markerStart={source ? `url(#${source.id})` : undefined}
          markerEnd={target ? `url(#${target.id})` : undefined}
        />
        <path
          d={this.svg}
          {...hoverAttrs}
          stroke="transparent"
          fill="none"
          className={c('hitbox')}
          style={{ cursor: 'pointer' }}
        />
      </g>
    ) as SVGElement
  }

  renderTerminal(type: string | undefined | null, side: Side) {
    if (!type)
      return null
    const id = `g3p-seg-${this.segId}-${side}-${type}`
    const defs = (
      <defs>
        <marker
          id={id}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L0,6 L9,3 z" />
        </marker>
      </defs>
    ) as SVGElement
    return { id, defs }
  }
}
