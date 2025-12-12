import { renderNode as defaultRenderNode } from './canvas/render-node'
import { Pos, Dims } from './graph/types/enums'
import { Graph, GraphOptions, defaultOptions as defaultGraphOptions } from './graph/types/graph'
import { CanvasOptions, Canvas, NodeAttributes, EdgeAttributes } from './canvas/canvas'
import { Edge as GraphEdge } from './graph/types/edge'
import { Mutator } from './graph/types/mutator'
import { Map as IMap } from 'immutable'
import { NodeUserProps } from './graph/types/node'

type StructuredNode<P> = {
  id: string
  title?: string
  text?: string
  ports?: { in?: P[], out?: P[] }
}

type StructuredEdge = {
  source: { id: string, port?: string }
  target: { id: string, port?: string }
  type?: string
}

type StructuredPort = {
  id: string
  label: string
}

type Nav = 'first' | 'last' | 'prev' | 'next'

type NodeProps<N, P> = (node: N) => StructuredNode<P>
type EdgeProps<E> = (edge: E) => StructuredEdge
type PortProps<P> = (port: P) => StructuredPort

type APIOptions<N, E, P> = GraphOptions & CanvasOptions<N> & {
  nodeProps?: NodeProps<N, P>
  edgeProps?: EdgeProps<E>
  portProps?: PortProps<P>
}

type APIArguments<N, E, P> = APIOptions<N, E, P> & {
  nodes?: N[]
  edges?: E[]
}

type NodeData<N, P> = {
  id: string
  data?: N
  node?: StructuredNode<P>
  pos?: Pos
  dims?: Dims
  attrs?: NodeAttributes
  isDummy?: boolean
}

type EdgeData<E> = {
  id: string
  data: E
  edge: StructuredEdge
  attrs?: EdgeAttributes
}

type SegData = {
  segId: string
  edgeId: string
  svg: string
  targetDummy: boolean
  edgeData: any
  attrs?: EdgeAttributes
}

type PortData<P> = {
  data: P
  port: StructuredPort
}

type State<N, E, P> = {
  nodes: IMap<string, NodeData<N, P>>
  edges: IMap<string, EdgeData<E>>
  ports: IMap<string, PortData<P>>
  segs: IMap<string, SegData>
  graph?: Graph
  update?: Update<N, E>
}

const identity = <T>(x: T) => x

const defaultOptions = <N, E, P>(): Required<APIOptions<N, E, P>> => ({
  ...defaultGraphOptions as Required<GraphOptions>,
  nodeProps: identity as NodeProps<N, P>,
  edgeProps: identity as EdgeProps<E>,
  portProps: identity as PortProps<P>,
  renderNode: defaultRenderNode,
  nodeStyle: (() => ({})),
  edgeStyle: (() => ({})),
  portStyle: 'outside',
  width: '100%',
  height: '100%',
  classPrefix: 'g3p',
})

class API<N, E, P> {
  private state: State<N, E, P>
  private seq: State<N, E, P>[]
  private index: number
  private canvas: Canvas<N>
  private _options: Required<APIOptions<N, E, P>>
  options: Required<APIOptions<N, E, P>>

  constructor(options: APIOptions<N, E, P>) {
    // Set defaults
    this._options = {
      ...defaultOptions<N, E, P>(),
      ...options,
    } as Required<APIOptions<N, E, P>>

    // Create proxy for options access
    this.options = new Proxy(this._options, {
      set: (target, prop: string, value) => {
        (target as any)[prop] = value
        this._onOptionChange(prop as keyof APIOptions<N, E, P>)
        return true
      }
    })

    // create initial state
    this.state = {
      nodes: IMap(),
      edges: IMap(),
      ports: IMap(),
      segs: IMap(),
    }

    // build initial graph
    let graph = new Graph({ options: this._options })
    this.state.graph = graph
    this.seq = [this.state]
    this.index = 0

    // create canvas
    this.canvas = new Canvas(this._options)
    this.canvas.render()
  }

  render(): HTMLElement {
    return this.canvas.container!
  }

  nav(nav: Nav) {
    let newIndex: number
    switch (nav) {
      case 'first':
        newIndex = 0
        break
      case 'last':
        newIndex = this.seq.length - 1
        break
      case 'prev':
        newIndex = this.index - 1
        break
      case 'next':
        newIndex = this.index + 1
        break
    }
    if (newIndex < 0 ||
      newIndex >= this.seq.length ||
      newIndex == this.index)
      return
    this.applyDiff(this.index, newIndex)
    this.index = newIndex
    this.state = this.seq[this.index]
  }

  private applyDiff(oldIndex: number, newIndex: number) {
    const oldState = this.seq[oldIndex]
    const newState = this.seq[newIndex]
    this.canvas.update(() => {
      for (const oldNode of oldState.nodes.values()) {
        const newNode = newState.nodes.get(oldNode.id)
        if (!newNode) {
          this.canvas.deleteNode(oldNode)
        } else if (oldNode.data !== newNode.data) {
          this.canvas.deleteNode(oldNode)
          this.canvas.addNode(newNode)
        } else if (oldNode.pos!.x !== newNode.pos!.x ||
          oldNode.pos!.y !== newNode.pos!.y) {
          this.canvas.updateNode(newNode)
        }
      }
      for (const newNode of newState.nodes.values()) {
        if (!oldState.nodes.has(newNode.id))
          this.canvas.addNode(newNode)
      }
      for (const oldSeg of oldState.segs.values()) {
        const newSeg = newState.segs.get(oldSeg.segId)
        if (!newSeg)
          this.canvas.deleteSeg(oldSeg)
        else if (oldSeg.svg != newSeg.svg)
          this.canvas.updateSeg(newSeg)
      }
      for (const newSeg of newState.segs.values()) {
        if (!oldState.segs.has(newSeg.segId))
          this.canvas.addSeg(newSeg)
      }
    })
  }

  async addNode(node: N) {
    await this.update(update => update.addNode(node))
  }

  async deleteNode(node: N) {
    await this.update(update => update.deleteNode(node))
  }

  async updateNode(node: N) {
    await this.update(update => update.updateNode(node))
  }

  async addEdge(edge: E) {
    await this.update(update => update.addEdge(edge))
  }

  async deleteEdge(edge: E) {
    await this.update(update => update.deleteEdge(edge))
  }

  async update(callback: (update: Update<N, E>) => void) {
    // collect updates from the caller
    const update = new Update<N, E>()
    callback(update)
    // measure new or updated nodes
    await this.measureNodes(update)
    // apply updates to get a new version of the graph
    const newGraph = this.state.graph!.withMutations((mut: Mutator) => {
      this.state = {
        nodes: this.state.nodes.asMutable(),
        edges: this.state.edges.asMutable(),
        ports: this.state.ports.asMutable(),
        segs: this.state.segs.asMutable(),
      }
      for (const node of update.updatedNodes)
        this._updateNode(node, mut)
      for (const edge of update.updatedEdges)
        this._updateEdge(edge, mut)
      for (const node of update.addedNodes)
        this._addNode(node, mut)
      for (const node of update.removedNodes)
        this._removeNode(node, mut)
      for (const edge of update.addedEdges)
        this._addEdge(edge, mut)
      for (const edge of update.removedEdges)
        this._removeEdge(edge, mut)
    })
    console.log('new graph:', newGraph) // XXX
    // update positions of dirty nodes and add dummy nodes
    for (const nodeId of newGraph.dirtyNodes.values()) {
      const node = newGraph.getNode(nodeId)
      console.log(`got pos of node ${nodeId}:`, node.pos) // XXX
      if (node.isDummy) {
        this.state.nodes.set(nodeId, { id: nodeId, pos: node.pos, isDummy: true })
      } else {
        const myNode = this.state.nodes.get(nodeId)
        this.state.nodes.set(nodeId, { ...myNode!, pos: node.pos })
      }
    }
    // remove deleted nodes; already removed real nodes, but
    // we need to remove dummies as well
    for (const nodeId of newGraph.delNodes)
      this.state.nodes.delete(nodeId)
    // update segments
    for (const segId of newGraph.delSegs)
      this.state.segs.delete(segId)
    for (const segId of newGraph.dirtySegs) {
      const seg = newGraph.getSeg(segId)
      const edge = this.state.edges.get(seg.edgeIds.values().next().value)!
      const target = seg.targetNode(newGraph)
      this.state.segs.set(seg.id, {
        segId: seg.id,
        edgeId: edge.id,
        svg: seg.svg!,
        attrs: edge.attrs,
        targetDummy: target.isDummy,
        edgeData: edge.data,
      })
    }
    // finalize state
    this.state = {
      nodes: this.state.nodes.asImmutable(),
      edges: this.state.edges.asImmutable(),
      ports: this.state.ports.asImmutable(),
      segs: this.state.segs.asImmutable(),
      graph: newGraph,
      update,
    }
    // add the new state, then nav to it
    this.seq.splice(this.index + 1)
    this.seq.push(this.state)
    this.nav('last')
  }

  private async measureNodes(update: Update<N, E>) {
    const nodes = update.updatedNodes.concat(update.addedNodes)
    await this.canvas.measure(nodes)
  }

  private getDims(node: N) {
    return this.canvas.getDims(node)
  }

  private _updateNode(node: N, mut: Mutator) {
    const props = this._options.nodeProps(node)
    const oldData = this.state.nodes.get(props.id)
    if (oldData === undefined)
      throw new Error(`updating node ${props.id} which does not exist`)
    const attrs = this._options.nodeStyle(node)
    mut.updateNode({ id: props.id, dims: this.getDims(node) })
    const data = { id: props.id, attrs, orig: node, node: props }
    this.state.nodes.set(props.id, data)
  }

  private _updateEdge(edge: E, mut: Mutator) {
    const props = this._options.edgeProps(edge)
    const id = GraphEdge.id(props), str = GraphEdge.str(props)
    const oldData = this.state.edges.get(id)
    if (oldData === undefined)
      throw new Error(`updating edge ${str} which does not exist`)
    const attrs = props.type ? this._options.edgeStyle(props.type) : undefined
    const data = { id, attrs, data: edge, edge: props }
    this.state.edges.set(id, data)
    if (props.type !== oldData.edge.type) {
      // if type changed, graph considers this a new edge
      mut.removeEdge(oldData.edge)
      mut.addEdge(props)
    } else {
      // otherwise, tell the canvas to re-render the edge
      // TODO
    }
  }

  private _addNode(node: N, mut: Mutator) {
    const props = this._options.nodeProps(node)
    if (this.state.nodes.has(props.id))
      throw new Error(`node with id ${props.id} already exists`)
    props.ports = { in: [], out: [], ...props.ports }
    const attrs = this._options.nodeStyle(node)
    const data = { id: props.id, attrs, data: node, node: props }
    this.state.nodes.set(props.id, data)
    console.log('adding node:', { ...props, dims: this.getDims(node) })
    mut.addNode({ ...props, dims: this.getDims(node) } as NodeUserProps)
  }

  private _removeNode(node: N, mut: Mutator) {
    const props = this._options.nodeProps(node)
    if (!this.state.nodes.has(props.id))
      throw new Error(`removing node ${props.id} which does not exist`)
    this.state.nodes.delete(props.id)
    mut.removeNode(props)
  }

  private _addEdge(edge: E, mut: Mutator) {
    const props = this._options.edgeProps(edge)
    const id = GraphEdge.id(props), str = GraphEdge.str(props)
    if (this.state.edges.has(id))
      throw new Error(`edge ${str} already exists`)
    const attrs = props.type ? this._options.edgeStyle(props.type) : undefined
    const data = { id, attrs, data: edge, edge: props }
    this.state.edges.set(id, data)
    mut.addEdge(props)
  }

  private _removeEdge(edge: E, mut: Mutator) {
    const props = this._options.edgeProps(edge)
    const id = GraphEdge.id(props), str = GraphEdge.str(props)
    if (!this.state.edges.has(id))
      throw new Error(`removing edge ${str} which does not exist`)
    this.state.edges.delete(id)
    mut.removeEdge(props)
  }

  private _onOptionChange(prop: keyof APIOptions<N, E, P>) {
    // TODO
  }
}

class Update<N, E> {
  addedNodes: N[]
  removedNodes: N[]
  updatedNodes: N[]
  addedEdges: E[]
  removedEdges: E[]
  updatedEdges: E[]
  desc?: string

  constructor() {
    this.addedNodes = []
    this.removedNodes = []
    this.updatedNodes = []
    this.addedEdges = []
    this.removedEdges = []
    this.updatedEdges = []
  }

  describe(desc: string) {
    this.desc = desc
  }

  addNode(node: N) {
    this.addedNodes.push(node)
  }

  deleteNode(node: N) {
    this.removedNodes.push(node)
  }

  updateNode(node: N) {
    this.updatedNodes.push(node)
  }

  addEdge(edge: E) {
    this.addedEdges.push(edge)
  }

  deleteEdge(edge: E) {
    this.removedEdges.push(edge)
  }

  updateEdge(edge: E) {
    this.updatedEdges.push(edge)
  }
}

async function graph<N, E, P>(args: APIArguments<N, E, P> = {}) {
  const { nodes = [], edges = [], ...options } = args
  const api = new API(options)
  if (nodes.length > 0 || edges.length > 0) {
    await api.update((update) => {
      for (const node of nodes)
        update.addNode(node)
      for (const edge of edges)
        update.addEdge(edge)
    })
  }
  return api
}

export { graph }
export default graph