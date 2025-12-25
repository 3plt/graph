import { Canvas } from './canvas'
import { normalize } from './marker'
import { Seg as GraphSeg } from '../graph/seg'
import { Graph } from '../graph/graph'
import { MarkerType } from './marker'

export class Seg {
  id: string
  selected: boolean
  hovered: boolean
  canvas: Canvas
  type: string | undefined
  svg: string
  el: SVGElement
  source: { marker?: MarkerType, isDummy?: boolean }
  target: { marker?: MarkerType, isDummy?: boolean }
  edgeIds: string[]

  constructor(canvas: Canvas, data: GraphSeg, g: Graph) {
    this.id = data.id
    this.canvas = canvas
    this.selected = false
    this.hovered = false
    this.svg = data.svg!
    this.source = { ...data.source, isDummy: data.sourceNode(g).isDummy }
    this.target = { ...data.target, isDummy: data.targetNode(g).isDummy }
    this.type = data.type
    this.edgeIds = data.edgeIds.toArray()
    this.el = this.render()
  }

  append() {
    this.canvas.group!.appendChild(this.el!)
  }

  remove() {
    this.el!.remove()
  }

  update(data: GraphSeg, g: Graph) {
    this.svg = data.svg!
    this.type = data.type
    this.source = { ...data.source, isDummy: data.sourceNode(g).isDummy }
    this.target = { ...data.target, isDummy: data.targetNode(g).isDummy }
    this.edgeIds = data.edgeIds.toArray()
    this.remove()
    this.el = this.render()
    this.append()
  }

  render(): SVGElement {
    let { source, target } = normalize(this)
    if (this.source.isDummy) source = undefined
    if (this.target.isDummy) target = undefined
    const typeClass = this.type ? `g3p-edge-type-${this.type}` : ''
    const prefix = this.canvas.markerPrefix
    const markerStartId = source ? (prefix ? `${prefix}-g3p-marker-${source}-reverse` : `g3p-marker-${source}-reverse`) : undefined
    const markerEndId = target ? (prefix ? `${prefix}-g3p-marker-${target}` : `g3p-marker-${target}`) : undefined
    return (
      <g
        ref={(el: SVGElement) => this.el = el}
        id={`g3p-seg-${this.id}`}
        className={`g3p-seg-container ${typeClass}`.trim()}
        data-edge-id={this.id}
      >
        <path
          d={this.svg}
          fill="none"
          className="g3p-seg-line"
          markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
          markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
        />
        <path
          d={this.svg}
          stroke="transparent"
          fill="none"
          className="g3p-seg-hitbox"
          style={{ cursor: 'pointer' }}
        />
      </g>
    ) as SVGElement
  }
}
