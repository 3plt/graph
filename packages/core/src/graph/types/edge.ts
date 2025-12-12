import { Record } from 'immutable'
import { NodeId, Node } from "./node"
import { PortId } from "./port"
import { Graph } from "./graph"
import { Side } from "./enums"
import { SegId, Seg, SegUserProps } from "./seg"

export type EdgeId = string

export type EdgeEnd = {
  id: NodeId
  port?: PortId
}

export type EdgeUserProps = {
  source: EdgeEnd
  target: EdgeEnd
  type?: string
}

export type EdgeProps = EdgeUserProps & {
  id: EdgeId
  segIds: SegId[]
  mutable: boolean
}

const defaultEdgeProps: EdgeProps = {
  id: '',
  source: { id: '' },
  target: { id: '' },
  mutable: false,
  segIds: [],
}

export class Edge extends Record(defaultEdgeProps) {
  static prefix = 'e:'

  mut(g: Graph): Edge {
    if (this.mutable) return this
    return g.mutateEdge(this)
  }

  final(): Edge {
    if (!this.mutable) return this
    return this.merge({
      mutable: false
    }).asImmutable()
  }

  link(g: Graph): Edge {
    this.sourceNode(g).addOutEdge(g, this.id)
    this.targetNode(g).addInEdge(g, this.id)
    return this
  }

  unlink(g: Graph): Edge {
    this.sourceNode(g).delOutEdge(g, this.id)
    this.targetNode(g).delInEdge(g, this.id)
    return this
  }

  delSelf(g: Graph): null {
    for (const seg of this.segs(g))
      seg.delEdgeId(g, this.id)
    this.unlink(g)
    g.edges.delete(this.id)
    g.dirtyEdges.delete(this.id)
    g.delEdges.add(this.id)
    return null
  }

  delSegId(g: Graph, segId: SegId): Edge {
    return this.setSegIds(g, this.segIds.filter(id => id != segId))
  }

  replaceSegId(g: Graph, oldId: SegId, newId: SegId): Edge {
    return this.setSegIds(g, this.segIds.map(id => id == oldId ? newId : id))
  }

  setSegIds(g: Graph, segIds: SegId[]): Edge {
    if (segIds.join(',') == this.segIds.join(',')) return this
    return this.mut(g).set('segIds', segIds)
  }

  *segs(g: Graph): Generator<Seg> {
    for (const segId of this.segIds)
      yield g.getSeg(segId)
  }

  node(g: Graph, side: Side): Node {
    return g.getNode(this[side].id)
  }

  sourceNode(g: Graph): Node {
    return this.node(g, 'source')
  }

  targetNode(g: Graph): Node {
    return this.node(g, 'target')
  }

  get str(): string {
    return Edge.str(this)
  }

  static str(edge: EdgeUserProps): string {
    let source = edge.source.id
    if (edge.source.port)
      source = `${source} (port ${edge.source.port})`
    let target = edge.target.id
    if (edge.target.port)
      target = `${target} (port ${edge.target.port})`
    let str = `edge from ${source} to ${target}`
    if (edge.type) str += ` of type ${edge.type}`
    return str
  }

  static id(edge: EdgeUserProps | SegUserProps, prefix: string = Edge.prefix, side: Side | 'both' = 'both'): string {
    let source = '', target = ''
    if (side == 'source' || side == 'both') {
      source = edge.source.id
      if (edge.source.port)
        source = `${source}.${edge.source.port}`
      source += '-'
    }
    if (side == 'target' || side == 'both') {
      target = edge.target.id
      if (edge.target.port)
        target = `${target}.${edge.target.port}`
      target = '-' + target
    }
    const type = edge.type || ''
    return `${prefix}${source}${type}${target}`
  }

  static add(g: Graph, props: EdgeUserProps): Edge {
    const edge = new Edge({
      ...props,
      id: Edge.id(props),
      segIds: [],
    })
    edge.link(g)
    g.edges.set(edge.id, edge)
    g.dirtyEdges.add(edge.id)
    return edge
  }
}