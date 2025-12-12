import { Dims, Pos } from '../graph/types/enums'
import styles from './node.css?raw'
import styler from './styler'

export type NodeEvent = (node: any, e: MouseEvent) => void

export type NodeOptions = {
  data?: any
  renderNode?: (data: any) => HTMLElement
  onClick?: NodeEvent
  onMouseEnter?: NodeEvent
  onMouseLeave?: NodeEvent
  onContextMenu?: NodeEvent
  onMouseDown?: NodeEvent
  onMouseUp?: NodeEvent
  classPrefix?: string
  isDummy?: boolean
  pos?: Pos
}

export interface Node extends Required<NodeOptions> { }

export class Node {
  selected!: boolean
  hovered!: boolean
  container?: SVGElement
  dims?: Dims
  content?: HTMLElement
  measured: boolean
  isDummy: boolean

  constructor(options: NodeOptions) {
    this.isDummy = false

    Object.assign(this, {
      selected: false,
      hovered: false,
      renderNode: () => null,
      onClick: () => null,
      onMouseEnter: () => null,
      onMouseLeave: () => null,
      onContextMenu: () => null,
      onMouseDown: () => null,
      onMouseUp: () => null,
      classPrefix: 'g3p',
      ...options,
    })

    if (!this.isDummy) {
      this.content = this.renderNode(this.data)
      this.measured = false
    } else {
      this.measured = true
    }
  }

  getSize() {
    const rect = this.content!.getBoundingClientRect()
    this.dims = { w: rect.width, h: rect.height }
    this.measured = true
  }

  handleClick(e: MouseEvent) {
    e.stopPropagation()
    this.onClick?.(this.data, e)
  }

  handleMouseEnter(e: MouseEvent) {
    this.onMouseEnter?.(this.data, e)
  }

  handleMouseLeave(e: MouseEvent) {
    this.onMouseLeave?.(this.data, e)
  }

  handleContextMenu(e: MouseEvent) {
    if (this.onContextMenu) {
      e.stopPropagation()
      this.onContextMenu(this.data, e)
    }
  }

  handleMouseDown(e: MouseEvent) {
    this.onMouseDown?.(this.data, e)
  }

  handleMouseUp(e: MouseEvent) {
    this.onMouseUp?.(this.data, e)
  }

  setPos(pos: Pos) {
    console.log(`setPos:`, this, pos) // XXX
    this.pos = pos
    this.container!.setAttribute('transform', `translate(${this.pos!.x}, ${this.pos!.y})`)
  }

  // render will be called once the node is measured
  render(): SVGElement {
    const c = styler('node', styles, this.classPrefix)
    return (
      <g
        ref={(el: SVGElement) => this.container = el}
        className={`${c('container')} ${c('dummy', this.isDummy)}`}
        // transform={`translate(${this.pos!.x}, ${this.pos!.y})`}
        onClick={this.handleClick.bind(this)}
        onMouseEnter={this.handleMouseEnter.bind(this)}
        onMouseLeave={this.handleMouseLeave.bind(this)}
        onContextMenu={this.handleContextMenu.bind(this)}
        onMouseDown={this.handleMouseDown.bind(this)}
        onMouseUp={this.handleMouseUp.bind(this)}
        style={{ cursor: 'pointer' }}
      >
        {this.isDummy ? this.renderDummy() : this.renderContent()}
      </g>
    ) as SVGElement
  }

  renderDummy(): SVGElement {
    const c = styler('node', styles, this.classPrefix)
    let { w, h } = this.dims!
    w /= 2
    h /= 2
    return (<>
      <ellipse
        cx={w} cy={h} rx={w} ry={h}
        className={c('background')}
      />
      <ellipse
        cx={w} cy={h} rx={w} ry={h}
        fill="none"
        className={c('border')}
        // strokeWidth={isSelected ? 3 : 2}
        strokeWidth="2"
      />
    </>) as SVGElement
  }

  renderContent(): SVGElement {
    const c = styler('node', styles, this.classPrefix)
    const { w, h } = this.dims!
    return (
      <>
        {/* Background rectangle for node */}
        < rect
          className={c('background')}
          width={w}
          height={h}
          rx={8}
          ry={8}
        />

        {/* Border rectangle */}
        < rect
          className={c('border')}
          width={w}
          height={h}
          rx={8}
          ry={8}
          fill="none"
          // strokeWidth={isSelected ? 3 : 2}
          strokeWidth="2"
        />

        {/* Custom content via foreignObject */}
        < foreignObject
          width={w}
          height={h}
          className={c('content-wrapper')}
        >
          <div
            className={c('content')}
            style={{
              width: `${w}px`,
              height: `${h}px`,
              overflow: 'hidden'
            }}
          >
            {this.content!}
          </div>
        </foreignObject >
      </>
    ) as SVGElement
  }
}
