import { Record, Set as ISet } from 'immutable'
import { Node, NodeId } from './node'
import { Graph } from './graph'
import { SegId } from './seg'
import { Edge } from './edge'
import { logger } from '../log'

const log = logger('layer')

export type LayerId = string

export type LayerData = {
  id: LayerId
  index: number
  nodeIds: ISet<NodeId>
  sorted: NodeId[]
  tracks: SegId[][]
  size: number
  pos: number
  isSorted: boolean
  mutable: boolean
}

const defLayerData: LayerData = {
  id: '',
  index: 0,
  nodeIds: ISet(),
  sorted: [],
  tracks: [],
  size: 0,
  pos: 0,
  isSorted: false,
  mutable: false,
}

export class Layer extends Record(defLayerData) {
  static prefix = 'l:'

  mut(g: Graph): Layer {
    if (this.mutable) return this
    return g.mutateLayer(this)
  }

  final(): Layer {
    if (!this.mutable) return this
    return this.merge({
      nodeIds: this.nodeIds.asImmutable(),
      mutable: false,
    }).asImmutable()
  }

  get nodeCount(): number {
    return this.nodeIds.size
  }

  *nodes(g: Graph): Generator<Node> {
    for (const nodeId of this.nodeIds.values())
      yield g.getNode(nodeId)
  }

  hasSortOrder(order: NodeId[]): boolean {
    return order.length == this.sorted.length &&
      this.sorted.every((nodeId, i) => order[i] == nodeId)
  }

  canCrush(g: Graph): boolean {
    for (const node of this.nodes(g))
      if (!node.isDummy)
        return false
    return true
  }

  crush(g: Graph): null {
    g.layerList.remove(this.index)
    g.layers.delete(this.id)
    g.dirtyLayers.delete(this.id)
    for (let i = this.index; i < g.layerList.size; i++)
      g.getLayer(g.layerList.get(i)!).setIndex(g, i)
    for (const node of this.nodes(g))
      if (node.isDummy) node.delSelf(g)
    return null
  }

  setIndex(g: Graph, index: number): Layer {
    if (this.index == index) return this
    return this.mut(g).set('index', index)
  }

  setTracks(g: Graph, tracks: SegId[][]): Layer {
    if (this.tracks == tracks) return this
    return this.mut(g).set('tracks', tracks)
  }

  setSize(g: Graph, size: number): Layer {
    if (this.size == size) return this
    return this.mut(g).set('size', size)
  }

  setPos(g: Graph, pos: number): Layer {
    if (this.pos == pos) return this
    return this.mut(g).set('pos', pos)
  }

  addNode(g: Graph, nodeId: NodeId): Layer {
    if (this.nodeIds.has(nodeId)) return this
    return this.mut(g).set('nodeIds', this.nodeIds.asMutable().add(nodeId))
  }

  willCrush(g: Graph, nodeId: NodeId): boolean {
    for (const node of this.nodes(g))
      if (!node.isDummy && node.id != nodeId)
        return false
    return true
  }

  reindex(g: Graph, nodeId: NodeId): NodeId[] | undefined {
    if (!this.isSorted) return undefined
    const sorted = this.sorted.filter(id => id != nodeId)
    for (const [i, id] of this.sorted.entries())
      g.getNode(id).setIndex(g, i)
    return sorted
  }

  delNode(g: Graph, nodeId: NodeId): Layer | null {
    if (!this.nodeIds.has(nodeId)) return this
    if (this.willCrush(g, nodeId)) return this.crush(g)
    const nodeIds = this.nodeIds.asMutable().remove(nodeId)
    const sorted = this.reindex(g, nodeId)
    return this.mut(g).merge({ nodeIds, sorted })
  }

  setSorted(g: Graph, nodeIds: NodeId[]): Layer {
    if (this.hasSortOrder(nodeIds)) return this
    nodeIds.forEach((nodeId, i) => g.getNode(nodeId).setIndex(g, i))
    return this.mut(g).merge({ sorted: nodeIds, isSorted: true })
  }

  *outEdges(g: Graph): Generator<Edge> {
    for (const node of this.nodes(g))
      yield* node.outEdges(g)
  }
}
