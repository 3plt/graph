import { Record, Set as ISet } from 'immutable'
import { Node, NodeId, PortId } from './node'
import { EdgeId, Edge } from './edge'
import { Graph } from './graph'
import { Side } from '../common'
import { EdgeStyle } from '../api/options'
import { MarkerType } from '../canvas/marker'

export type SegId = string

type SegEnd = {
  id: NodeId
  port?: PortId
  pos?: number
  marker?: MarkerType
}

type SegData = {
  id: string
  source: SegEnd
  target: SegEnd
  type?: string
  style?: EdgeStyle
  edgeIds: ISet<EdgeId>
  trackPos?: number
  svg?: string
  mutable: boolean
}

const defSegData: SegData = {
  id: '',
  source: { id: '' },
  target: { id: '' },
  type: undefined,
  style: undefined,
  edgeIds: ISet(),
  trackPos: undefined,
  svg: undefined,
  mutable: false,
}

export class Seg extends Record(defSegData) {
  static prefix = 's:'

  mut(g: Graph): Seg {
    if (this.mutable) return this
    return g.mutateSeg(this)
  }

  final(): Seg {
    if (!this.mutable) return this
    return this.merge({
      edgeIds: this.edgeIds.asImmutable(),
      mutable: false,
    }).asImmutable()
  }

  get p1(): number {
    return this.source.pos!
  }

  get p2(): number {
    return this.target.pos!
  }

  anySameEnd(other: Seg): boolean {
    return this.sameEnd(other, 'source') || this.sameEnd(other, 'target')
  }

  sameEnd(other: Seg, side: Side): boolean {
    const mine = this[side]
    const yours = other[side]
    return mine.id === yours.id && mine.port === yours.port
  }

  setPos(g: Graph, source: number, target: number): Seg {
    return this.mut(g).merge({
      source: { ...this.source, pos: source },
      target: { ...this.target, pos: target },
    })
  }

  setTrackPos(g: Graph, trackPos?: number): Seg {
    if (this.trackPos == trackPos) return this
    return this.mut(g).set('trackPos', trackPos)
  }

  setSVG(g: Graph, svg: string): Seg {
    if (this.svg == svg) return this
    return this.mut(g).set('svg', svg)
  }

  link(g: Graph): Seg {
    this.sourceNode(g).addOutSeg(g, this.id)
    this.targetNode(g).addInSeg(g, this.id)
    return this
  }

  unlink(g: Graph): Seg {
    this.sourceNode(g).delOutSeg(g, this.id)
    this.targetNode(g).delInSeg(g, this.id)
    return this
  }

  delSelf(g: Graph): null {
    this.unlink(g)
    g.segs.delete(this.id)
    g.dirtySegs.delete(this.id)
    g.delSegs.add(this.id)
    return null
  }

  *edges(g: Graph): Generator<Edge> {
    for (const edgeId of this.edgeIds)
      yield g.getEdge(edgeId)
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

  addEdgeId(g: Graph, edgeId: EdgeId): Seg {
    if (this.edgeIds.has(edgeId)) return this
    return this.mut(g).set('edgeIds', this.edgeIds.asMutable().add(edgeId))
  }

  delEdgeId(g: Graph, edgeId: EdgeId): Seg | null {
    if (!this.edgeIds.has(edgeId)) return this
    if (this.edgeIds.size == 1) {
      this.delSelf(g)
      return null
    }
    return this.mut(g).set('edgeIds', this.edgeIds.asMutable().remove(edgeId))
  }

  static add(g: Graph, data: Partial<SegData>): Seg {
    const seg = new Seg({
      ...data,
      id: Edge.key(data, Seg.prefix),
    })
    seg.link(g)
    g.segs.set(seg.id, seg)
    g.dirtySegs.add(seg.id)
    return seg
  }
}