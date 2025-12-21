import { Map as IMap, List as IList, Set as ISet } from 'immutable'
import { Dims, Pos } from '../common'
import { GraphOptions } from '../api/options'
import { Node, NodeId, PublicNodeData } from './node'
import { Edge, EdgeId, PublicEdgeData } from './edge'
import { Seg, SegId } from './seg'
import { Layer, LayerId } from './layer'
import { Mutator } from './mutator'
import { Cycles } from './services/cycles'
import { Dummy } from './services/dummy'
import { Layers } from './services/layers'
import { Layout } from './services/layout'
import { Lines } from './services/lines'
import { logger } from '../log'

const log = logger('graph')

type GraphArgs = {
  changes?: Changes
  options?: Required<GraphOptions>
  prior?: Graph
}

export type Changes = {
  addedNodes: PublicNodeData[],
  removedNodes: { id: string }[],
  updatedNodes: PublicNodeData[],
  addedEdges: PublicEdgeData[],
  removedEdges: { id: string }[],
  updatedEdges: PublicEdgeData[],
  description?: string,
}

const emptyChanges: Changes = {
  addedNodes: [],
  removedNodes: [],
  updatedNodes: [],
  addedEdges: [],
  removedEdges: [],
  updatedEdges: [],
}

export class Graph {
  prior?: Graph
  nodes!: IMap<NodeId, Node>
  edges!: IMap<EdgeId, Edge>
  segs!: IMap<SegId, Seg>
  layers!: IMap<LayerId, Layer>
  layerList!: IList<LayerId>
  nextLayerId!: number
  nextDummyId!: number
  options: Required<GraphOptions>
  changes: Changes

  dirtyNodes!: Set<NodeId>
  dirtyEdges!: Set<EdgeId>
  dirtyLayers!: Set<LayerId>
  dirtySegs!: Set<SegId>
  dirty!: boolean

  delNodes!: Set<NodeId>
  delEdges!: Set<EdgeId>
  delSegs!: Set<SegId>

  r: boolean
  v: boolean
  n: boolean
  h: keyof Dims
  w: keyof Dims
  x: keyof Pos
  y: keyof Pos
  d: Pos

  constructor({ prior, changes, options }: GraphArgs) {
    this.options = prior?.options ?? options!
    this.changes = changes ?? emptyChanges
    this.initFromPrior(prior)

    // Set orientation-based properties
    this.r = this.options.orientation === 'BT' || this.options.orientation === 'RL'
    this.v = this.options.orientation === 'TB' || this.options.orientation === 'BT'
    this.h = this.v ? 'h' : 'w'
    this.w = this.v ? 'w' : 'h'
    this.x = this.v ? 'x' : 'y'
    this.y = this.v ? 'y' : 'x'
    this.d = {
      x: this.v ? 0 : (this.r ? -1 : 1),
      y: this.v ? (this.r ? -1 : 1) : 0,
    }

    // n means the node alignment follows the natural orientation
    // For each orientation, we map it to the corresponding alignment
    const natAligns = { TB: 'top', BT: 'bottom', LR: 'left', RL: 'right' };
    if (this.options.nodeAlign == 'natural')
      this.n = true
    else
      this.n = natAligns[this.options.orientation] == this.options.nodeAlign

    if (this.dirty) this.processUpdate()
  }

  processUpdate() {
    try {
      this.beginMutate()
      this.applyChanges()
      Cycles.checkCycles(this)
      Layers.updateLayers(this)
      Dummy.updateDummies(this)
      Dummy.mergeDummies(this)
      Layout.positionNodes(this)
      Layout.alignAll(this)
      Lines.trackEdges(this)
      Layout.getCoords(this)
      Lines.pathEdges(this)
    } catch (e) {
      this.initFromPrior(this.prior)
      throw e
    } finally {
      this.endMutate()
    }
  }

  applyChanges() {
    for (const edge of this.changes.removedEdges)
      Edge.del(this, edge)
    for (const node of this.changes.removedNodes)
      Node.del(this, node)
    for (const node of this.changes.addedNodes)
      Node.addNormal(this, node)
    for (const edge of this.changes.addedEdges)
      Edge.add(this, edge)
    for (const node of this.changes.updatedNodes)
      Node.update(this, node)
    for (const edge of this.changes.updatedEdges)
      Edge.update(this, edge)
  }

  layerAt(index: number): Layer {
    while (index >= this.layerList.size)
      this.addLayer()
    const layerId = this.layerList.get(index)!
    return this.getLayer(layerId)
  }

  private addLayer() {
    const id = `${Layer.prefix}${this.nextLayerId++}`
    this.layers.set(id, new Layer({
      id,
      index: this.layerList.size,
      nodeIds: ISet()
    }))
    this.layerList.push(id)
    this.dirtyLayers.add(id)
  }

  isEdgeId(id: string): boolean {
    return id.startsWith(Edge.prefix)
  }

  isSegId(id: string): boolean {
    return id.startsWith(Seg.prefix)
  }

  getNode(nodeId: NodeId): Node {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`cannot find node ${nodeId}`)
    return node
  }

  getEdge(edgeId: EdgeId): Edge {
    const edge = this.edges.get(edgeId)
    if (!edge) throw new Error(`cannot find edge ${edgeId}`)
    return edge
  }

  getSeg(segId: SegId): Seg {
    const seg = this.segs.get(segId)
    if (!seg) throw new Error(`cannot find seg ${segId}`)
    return seg
  }

  getLayer(layerId: LayerId): Layer {
    const layer = this.layers.get(layerId)
    if (!layer) throw new Error(`cannot find layer ${layerId}`)
    return layer
  }

  layerIndex(nodeId: NodeId): number {
    return this.getNode(nodeId).layerIndex(this)
  }

  getRel(relId: EdgeId | SegId): Edge | Seg {
    return this.isSegId(relId)
      ? this.getSeg(relId)
      : this.getEdge(relId)
  }

  * getNodes(includeDummy: boolean = false): Generator<Node> {
    const gen = this.nodes.values()
    for (const node of this.nodes.values())
      if (includeDummy || !node.isDummy)
        yield node
  }

  * getEdges(): Generator<Edge> {
    yield* this.edges.values()
  }

  * getSegs(): Generator<Seg> {
    yield* this.segs.values()
  }

  withMutations(callback: (mut: Mutator) => void): Graph {
    const mut = new Mutator()
    callback(mut)
    return new Graph({ prior: this, changes: mut.changes })
  }

  addNode(node: PublicNodeData) {
    return this.withMutations(mutator => {
      mutator.addNode(node)
    })
  }

  addNodes(...nodes: PublicNodeData[]) {
    return this.withMutations(mutator => {
      nodes.forEach(node => mutator.addNode(node))
    })
  }

  removeNodes(...nodes: { id: string }[]) {
    return this.withMutations(mutator => {
      nodes.forEach(node => mutator.removeNode(node))
    })
  }

  removeNode(node: { id: string }) {
    return this.withMutations(mutator => {
      mutator.removeNode(node)
    })
  }

  addEdges(...edges: PublicEdgeData[]) {
    return this.withMutations(mutator => {
      edges.forEach(edge => mutator.addEdge(edge))
    })
  }

  addEdge(edge: PublicEdgeData) {
    return this.withMutations(mutator => {
      mutator.addEdge(edge)
    })
  }

  removeEdges(...edges: PublicEdgeData[]) {
    return this.withMutations(mutator => {
      edges.forEach(edge => mutator.removeEdge(edge))
    })
  }

  removeEdge(edge: PublicEdgeData) {
    return this.withMutations(mutator => {
      mutator.removeEdge(edge)
    })
  }

  mutateNode(node: Node): Node {
    if (node.mutable) return node
    node = node.asMutable().set('mutable', true)
    this.nodes.set(node.id, node)
    this.dirtyNodes.add(node.id)
    return node
  }

  mutateEdge(edge: Edge): Edge {
    if (edge.mutable) return edge
    edge = edge.asMutable().set('mutable', true)
    this.edges.set(edge.id, edge)
    this.dirtyEdges.add(edge.id)
    return edge
  }

  mutateLayer(layer: Layer): Layer {
    if (layer.mutable) return layer
    layer = layer.asMutable().set('mutable', true)
    this.layers.set(layer.id, layer)
    this.dirtyLayers.add(layer.id)
    return layer
  }

  mutateSeg(seg: Seg): Seg {
    if (seg.mutable) return seg
    seg = seg.asMutable().set('mutable', true)
    this.segs.set(seg.id, seg)
    this.dirtySegs.add(seg.id)
    return seg
  }

  private initFromPrior(prior?: Graph) {
    this.nodes = prior?.nodes ?? IMap()
    this.edges = prior?.edges ?? IMap()
    this.layers = prior?.layers ?? IMap()
    this.layerList = prior?.layerList ?? IList()
    this.segs = prior?.segs ?? IMap()
    this.nextLayerId = prior?.nextLayerId ?? 0
    this.nextDummyId = prior?.nextDummyId ?? 0
    this.prior = prior
    this.dirtyNodes = new Set()
    this.dirtyEdges = new Set()
    this.dirtyLayers = new Set()
    this.dirtySegs = new Set()
    this.delNodes = new Set()
    this.delEdges = new Set()
    this.delSegs = new Set()
    this.dirty =
      this.changes.addedNodes.length > 0 ||
      this.changes.removedNodes.length > 0 ||
      this.changes.updatedNodes.length > 0 ||
      this.changes.addedEdges.length > 0 ||
      this.changes.removedEdges.length > 0
  }

  private beginMutate() {
    this.nodes = this.nodes.asMutable()
    this.edges = this.edges.asMutable()
    this.layers = this.layers.asMutable()
    this.layerList = this.layerList.asMutable()
    this.segs = this.segs.asMutable()
  }

  private endMutate() {
    for (const nodeId of this.dirtyNodes)
      if (this.nodes.has(nodeId))
        this.nodes.set(nodeId, this.nodes.get(nodeId)!.final())
    for (const edgeId of this.dirtyEdges)
      if (this.edges.has(edgeId))
        this.edges.set(edgeId, this.edges.get(edgeId)!.final())
    for (const segId of this.dirtySegs)
      if (this.segs.has(segId))
        this.segs.set(segId, this.segs.get(segId)!.final())
    for (const layerId of this.dirtyLayers)
      if (this.layers.has(layerId))
        this.layers.set(layerId, this.layers.get(layerId)!.final())
    this.nodes = this.nodes.asImmutable()
    this.edges = this.edges.asImmutable()
    this.layers = this.layers.asImmutable()
    this.layerList = this.layerList.asImmutable()
    this.segs = this.segs.asImmutable()
  }

}
