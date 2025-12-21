import { Record, Set as ISet } from 'immutable'
import { LayerId } from './layer'
import { EdgeId, Edge } from './edge'
import { SegId, Seg } from './seg'
import { Dir, Side, Dims, Pos, LinkType } from '../common'
import { NodeStyle, RenderNode } from '../api/options'
import { Graph } from './graph'
import { Layer } from './layer'
import { logger } from '../log'

const log = logger('node')

export type NodeId = string
export type PortId = string
export type NodeKey = string

export type PortData = {
  id: string,
  label?: string,
  offset?: number,
  size?: number,
}

export type PublicNodeData = {
  id: NodeId,
  data: any,
  version: number,
  title?: string
  text?: string
  type?: string
  ports: { in?: PortData[], out?: PortData[] }
  render?: RenderNode<any>
  dims?: Dims
}

type NodeData = PublicNodeData & {
  aligned: { in?: NodeId, out?: NodeId }
  edges: { in: ISet<EdgeId>, out: ISet<EdgeId> }
  segs: { in: ISet<SegId>, out: ISet<SegId> }
  layerId: LayerId
  isDummy: boolean
  isMerged: boolean
  edgeIds: EdgeId[]
  index?: number
  pos?: Pos
  lpos?: number
  mutable: boolean
}

const defNodeData: NodeData = {
  id: '',
  data: undefined,
  version: 0,
  title: undefined,
  text: undefined,
  type: undefined,
  render: undefined,
  ports: {},
  aligned: {},
  edges: { in: ISet(), out: ISet() },
  segs: { in: ISet(), out: ISet() },
  layerId: '',
  isDummy: false,
  isMerged: false,
  edgeIds: [],
  index: undefined,
  pos: undefined,
  lpos: undefined,
  dims: undefined,
  mutable: false,
}

export class Node extends Record(defNodeData) {
  static dummyPrefix = 'd:'

  // get edgeId(): EdgeId {
  //   if (!this.isDummy)
  //     throw new Error(`node ${this.id} is not a dummy`)
  //   if (this.isMerged)
  //     throw new Error(`node ${this.id} is merged`)
  //   return this.get('edgeIds')[0]
  // }

  // get edgeIds(): EdgeId[] {
  //   if (!this.isDummy)
  //     throw new Error(`node ${this.id} is not a dummy`)
  //   if (!this.isMerged)
  //     throw new Error(`node ${this.id} is not merged`)
  //   return this.get('edgeIds')
  // }

  get key(): NodeKey {
    return this.isDummy ? this.id : Node.key(this)
  }

  static key(node: PublicNodeData): NodeKey {
    return `k:${node.id}:${node.version}`
  }

  static addNormal(g: Graph, data: PublicNodeData): Node {
    const layer = g.layerAt(0)
    const node = new Node({
      ...data,
      edges: { in: ISet(), out: ISet() },
      segs: { in: ISet(), out: ISet() },
      aligned: {},
      edgeIds: [],
      layerId: layer.id,
      lpos: undefined,
      pos: undefined,
    })
    layer.addNode(g, node.id)
    g.nodes.set(node.id, node)
    g.dirtyNodes.add(node.id)
    return node
  }

  static addDummy(g: Graph, data: Partial<NodeData>): Node {
    const layer = g.getLayer(data.layerId!)
    const node = new Node({
      ...data,
      id: `${Node.dummyPrefix}${g.nextDummyId++}`,
      edges: { in: ISet(), out: ISet() },
      segs: { in: ISet(), out: ISet() },
      aligned: {},
      isDummy: true,
      dims: {
        w: g.options.dummyNodeSize,
        h: g.options.dummyNodeSize,
      }
    })
    layer.addNode(g, node.id)
    g.nodes.set(node.id, node)
    g.dirtyNodes.add(node.id)
    return node
  }

  static del(g: Graph, node: { id: string }): null {
    return g.getNode(node.id).delSelf(g)
  }

  static update(g: Graph, data: PublicNodeData): Node {
    return g.getNode(data.id).mut(g).merge(data)
  }

  mut(g: Graph): Node {
    if (this.mutable) return this
    return g.mutateNode(this)
  }

  final(): Node {
    if (!this.mutable) return this
    return this.merge({
      edges: { in: this.edges.in.asImmutable(), out: this.edges.out.asImmutable() },
      segs: { in: this.segs.in.asImmutable(), out: this.segs.out.asImmutable() },
      mutable: false,
    }).asImmutable()
  }

  dirty(g: Graph): Node {
    g.dirtyNodes.add(this.id)
    return this
  }

  cur(g: Graph): Node {
    return g.getNode(this.id)
  }

  isUnlinked(): boolean {
    return this.edges.in.size == 0 &&
      this.edges.out.size == 0 &&
      this.segs.in.size == 0 &&
      this.segs.out.size == 0
  }

  hasPorts(): boolean {
    return !!this.ports?.in?.length || !!this.ports?.out?.length
  }

  layerIndex(g: Graph): number {
    return this.getLayer(g).index
  }

  getLayer(g: Graph): Layer {
    return g.getLayer(this.layerId)
  }

  margin(g: Graph): number {
    return this.isDummy ? g.options.edgeSpacing - g.options.dummyNodeSize : g.options.nodeMargin
  }

  marginWith(g: Graph, other: Node): number {
    return Math.max(this.margin(g), other.margin(g))
  }

  width(g: Graph): number {
    return this.dims?.[g.w] ?? 0
  }

  right(g: Graph): number {
    return this.lpos! + this.width(g)
  }

  setIndex(g: Graph, index: number): Node {
    if (this.index == index) return this
    return this.mut(g).set('index', index)
  }

  setLayerPos(g: Graph, lpos: number): Node {
    if (this.lpos == lpos) return this
    return this.mut(g).set('lpos', lpos)
  }

  setLayer(g: Graph, layerId: LayerId): Node {
    if (this.layerId == layerId) return this
    return this.mut(g).set('layerId', layerId)
  }

  setPos(g: Graph, pos: Pos): Node {
    if (!this.pos || this.pos.x != pos.x || this.pos.y != pos.y)
      return this.mut(g).set('pos', pos)
    return this
  }

  moveToLayer(g: Graph, layer: Layer): Node {
    this.getLayer(g).delNode(g, this.id)
    layer.addNode(g, this.id)
    return this.setLayer(g, layer.id)
  }

  moveToLayerIndex(g: Graph, index: number): Node {
    return this.moveToLayer(g, g.layerAt(index))
  }

  setAligned(g: Graph, dir: Dir, nodeId: NodeId | undefined): Node {
    if (this.aligned[dir] === nodeId) return this
    return this.mut(g).set('aligned', { ...this.aligned, [dir]: nodeId })
  }

  addRel(g: Graph, type: LinkType, dir: Dir, relId: EdgeId | SegId): Node {
    const sets = this.get(type)
    const set = sets[dir]
    if (set.has(relId)) return this
    return this.mut(g).set(type, { ...sets, [dir]: set.asMutable().add(relId) })
  }

  delRel(g: Graph, type: LinkType, dir: Dir, relId: EdgeId | SegId): Node | null {
    let sets = this.get(type)
    const set = sets[dir]
    if (!set.has(relId)) return this
    sets = { ...sets, [dir]: set.asMutable().remove(relId) }
    const node = this.mut(g).set(type, sets)
    if (node.isDummy && node.isUnlinked())
      return node.delSelf(g)
    return node
  }

  delSelf(g: Graph): null {
    // Clear alignment references from partner nodes
    if (this.aligned.in)
      g.getNode(this.aligned.in).setAligned(g, 'out', undefined)
    if (this.aligned.out)
      g.getNode(this.aligned.out).setAligned(g, 'in', undefined)
    this.getLayer(g).delNode(g, this.id)
    for (const rel of this.rels(g))
      rel.delSelf(g)
    g.nodes.delete(this.id)
    g.dirtyNodes.delete(this.id)
    g.delNodes.add(this.id)
    return null
  }

  addInEdge(g: Graph, edgeId: EdgeId): Node {
    return this.addRel(g, 'edges', 'in', edgeId)
  }

  addOutEdge(g: Graph, edgeId: EdgeId): Node {
    return this.addRel(g, 'edges', 'out', edgeId)
  }

  addInSeg(g: Graph, segId: SegId): Node {
    return this.addRel(g, 'segs', 'in', segId)
  }

  addOutSeg(g: Graph, segId: SegId): Node {
    return this.addRel(g, 'segs', 'out', segId)
  }

  delInEdge(g: Graph, edgeId: EdgeId): Node | null {
    return this.delRel(g, 'edges', 'in', edgeId)
  }

  delOutEdge(g: Graph, edgeId: EdgeId): Node | null {
    return this.delRel(g, 'edges', 'out', edgeId)
  }

  delInSeg(g: Graph, segId: SegId): Node | null {
    return this.delRel(g, 'segs', 'in', segId)
  }

  delOutSeg(g: Graph, segId: SegId): Node | null {
    return this.delRel(g, 'segs', 'out', segId)
  }

  *relIds(type: LinkType | 'both' = 'both', dir: Dir | 'both' = 'both'): Generator<EdgeId | SegId> {
    const types: LinkType[] = type == 'both' ? ['edges', 'segs'] : [type]
    const dirs: Dir[] = dir == 'both' ? ['in', 'out'] : [dir]
    for (const type of types)
      for (const dir of dirs)
        yield* this.get(type)[dir]
  }

  rels(g: Graph, type: 'edges', dir?: Dir | 'both'): Generator<Edge>
  rels(g: Graph, type: 'segs', dir?: Dir | 'both'): Generator<Seg>
  rels(g: Graph, type: 'both', dir?: Dir | 'both'): Generator<Edge | Seg>
  rels(g: Graph, type: LinkType | 'both', dir: Dir | 'both'): Generator<Edge | Seg>
  rels(g: Graph, type: LinkType | 'both'): Generator<Edge | Seg>
  rels(g: Graph): Generator<Edge | Seg>
  *rels(g: Graph, type: LinkType | 'both' = 'both', dir: Dir | 'both' = 'both'): Generator<Edge | Seg> {
    for (const relId of this.relIds(type, dir))
      yield g.getRel(relId)
  }

  *adjIds(g: Graph, type: LinkType | 'both' = 'both', dir: Dir | 'both' = 'both'): Generator<NodeId> {
    const dirs: Dir[] = dir == 'both' ? ['in', 'out'] : [dir]
    for (const dir of dirs) {
      const side: Side = dir == 'in' ? 'source' : 'target'
      for (const rel of this.rels(g, type, dir))
        yield rel[side].id
    }
  }

  *adjs(g: Graph, type: LinkType | 'both' = 'both', dir: Dir | 'both' = 'both'): Generator<Node> {
    for (const nodeId of this.adjIds(g, type, dir))
      yield g.getNode(nodeId)
  }

  *inEdgeIds(): Generator<EdgeId> {
    yield* this.relIds('edges', 'in')
  }

  *outEdgeIds(): Generator<EdgeId> {
    yield* this.relIds('edges', 'out')
  }

  *inSegIds(): Generator<SegId> {
    yield* this.relIds('segs', 'in')
  }

  *outSegIds(): Generator<SegId> {
    yield* this.relIds('segs', 'out')
  }

  *inEdges(g: Graph): Generator<Edge> {
    yield* this.rels(g, 'edges', 'in')
  }

  *outEdges(g: Graph): Generator<Edge> {
    yield* this.rels(g, 'edges', 'out')
  }

  *inSegs(g: Graph): Generator<Seg> {
    yield* this.rels(g, 'segs', 'in')
  }

  *outSegs(g: Graph): Generator<Seg> {
    yield* this.rels(g, 'segs', 'out')
  }

  *inNodeIds(g: Graph): Generator<NodeId> {
    yield* this.adjIds(g, 'edges', 'in')
  }

  *outNodeIds(g: Graph): Generator<NodeId> {
    yield* this.adjIds(g, 'edges', 'out')
  }

  *inNodes(g: Graph): Generator<Node> {
    yield* this.adjs(g, 'edges', 'in')
  }

  *outNodes(g: Graph): Generator<Node> {
    yield* this.adjs(g, 'edges', 'out')
  }
}
