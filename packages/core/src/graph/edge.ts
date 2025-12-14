import { Record } from 'immutable'
import { NodeId, Node } from "./node"
import { Graph } from "./graph"
import { Side } from "../common"
import { SegId, Seg } from "./seg"
import { EdgeStyle } from "../api/options"
import { logger } from "../log"
import { MarkerType } from "../canvas/marker"

const log = logger('edge')

export type EdgeId = string

export type PublicEdgeData = {
  id: string
  data: any
  label?: string
  source: { id: string, port?: string, marker?: MarkerType }
  target: { id: string, port?: string, marker?: MarkerType }
  type?: string
  style?: EdgeStyle
}

type EdgeData = PublicEdgeData & {
  segIds: SegId[]
  mutable: boolean
}

const defEdgeData: EdgeData = {
  id: '',
  data: null,
  label: undefined,
  source: { id: '' },
  target: { id: '' },
  type: undefined,
  style: undefined,
  mutable: false,
  segIds: [],
}

export class Edge extends Record(defEdgeData) {
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

  static str(edge: Partial<EdgeData>): string {
    let source = edge.source?.id
    if (!source) throw new Error('edge source is undefined')
    if (edge.source?.port)
      source = `${source} (port ${edge.source.port})`
    let target = edge.target?.id
    if (!target) throw new Error('edge target is undefined')
    if (edge.target?.port)
      target = `${target} (port ${edge.target.port})`
    let str = `edge from ${source} to ${target}`
    if (edge.type) str += ` of type ${edge.type}`
    return str
  }

  static key(edge: Partial<EdgeData>, prefix: string = Edge.prefix, side: Side | 'both' = 'both'): string {
    let source = '', target = ''
    if (side == 'source' || side == 'both') {
      if (!edge.source?.id) throw new Error('edge source is undefined')
      source = edge.source.id
      if (edge.source?.port)
        source = `${source}.${edge.source.port}`
      const marker = edge.source?.marker ?? edge.style?.marker?.source
      if (marker && marker != 'none') source += `[${marker}]`
      source += '-'
    }
    if (side == 'target' || side == 'both') {
      if (!edge.target?.id) throw new Error('edge target is undefined')
      target = edge.target.id
      if (edge.target.port)
        target = `${target}.${edge.target.port}`
      target = '-' + target
      const marker = edge.target?.marker ?? edge.style?.marker?.target ?? 'arrow'
      if (marker && marker != 'none') target += `[${marker}]`
    }
    const type = edge.type || ''
    return `${prefix}${source}${type}${target}`
  }

  static add(g: Graph, data: Partial<EdgeData>): Edge {
    const edge = new Edge({
      ...data,
      segIds: [],
    })
    edge.link(g)
    g.edges.set(edge.id, edge)
    g.dirtyEdges.add(edge.id)
    return edge
  }

  static del(g: Graph, data: PublicEdgeData): null {
    return g.getEdge(data.id).delSelf(g)
  }

  static update(g: Graph, data: PublicEdgeData): Edge {
    let edge = g.getEdge(data.id)
    let relink = false
    if (
      data.source.id !== edge.source.id ||
      data.target.id !== edge.target.id ||
      data.source.port !== edge.source.port ||
      data.target.port !== edge.target.port ||
      data.type !== edge.type
    ) {
      for (const seg of edge.segs(g))
        seg.delEdgeId(g, edge.id)
      edge.unlink(g)
      relink = true
    }
    edge = edge.mut(g).merge(data)
    if (relink)
      edge.link(g)
    return edge
  }
}