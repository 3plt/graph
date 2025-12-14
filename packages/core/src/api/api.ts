import { Graph } from '../graph/graph'
import { Canvas } from '../canvas/canvas'
import { PublicEdgeData } from '../graph/edge'
import { Mutator } from '../graph/mutator'
import { APIArguments, Update, NodeProps, EdgeProps, EdgeEnd } from './options'
import { Defaults, applyDefaults } from './defaults'
import { PublicNodeData, NodeKey, Node } from '../graph/node'
import { Nav, Dir } from '../common'
import { Updater } from './updater'
import { logger } from '../log'

const log = logger('api')

type State<N, E> = {
  graph: Graph
  update: Update<N, E> | null
}

export class API<N, E> {
  private state: State<N, E>
  private seq: State<N, E>[]
  private index: number
  private canvas: Canvas
  private options: Defaults<N, E>
  private history: Update<N, E>[]
  private nodeIds: Map<N, string>
  private edgeIds: Map<E, string>
  private nodeVersions: Map<N, number>
  private nextNodeId: number
  private nextEdgeId: number
  private root: string

  constructor(args: APIArguments<N, E>) {
    this.root = args.root
    this.options = applyDefaults(args.options)
    log.info('options', this.options)

    // build initial empty graph
    let graph = new Graph({ options: this.options.graph })
    this.state = { graph, update: null }
    this.seq = [this.state]
    this.index = 0
    this.nodeIds = new Map()
    this.edgeIds = new Map()
    this.nodeVersions = new Map()
    this.nextNodeId = 1
    this.nextEdgeId = 1

    // create canvas
    this.canvas = new Canvas({
      ...this.options.canvas,
      dummyNodeSize: this.options.graph.dummyNodeSize,
    })

    // store initial update or history
    if (args.history) {
      this.history = args.history
    } else if (args.nodes) {
      this.history = [Updater.add(args.nodes, args.edges || []).update]
    } else {
      this.history = []
    }
  }

  async init() {
    const root = document.getElementById(this.root)
    if (!root) throw new Error('root element not found')
    root.appendChild(this.canvas.container!)
    for (const update of this.history)
      await this.applyUpdate(update)
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
    const oldGraph = this.seq[oldIndex].graph
    const newGraph = this.seq[newIndex].graph

    for (const oldNode of oldGraph.nodes.values()) {
      const newNode = newGraph.nodes.get(oldNode.id)
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
    for (const newNode of newGraph.nodes.values()) {
      if (!oldGraph.nodes.has(newNode.id))
        this.canvas.addNode(newNode)
    }
    for (const oldSeg of oldGraph.segs.values()) {
      const newSeg = newGraph.segs.get(oldSeg.id)
      if (!newSeg)
        this.canvas.deleteSeg(oldSeg)
      else if (oldSeg.svg != newSeg.svg)
        this.canvas.updateSeg(newSeg)
    }
    for (const newSeg of newGraph.segs.values()) {
      if (!oldGraph.segs.has(newSeg.id))
        this.canvas.addSeg(newSeg)
    }

    this.canvas.update()
  }

  async addNode(node: any) {
    await this.update(update => update.addNode(node))
  }

  async deleteNode(node: any) {
    await this.update(update => update.deleteNode(node))
  }

  async updateNode(node: any) {
    await this.update(update => update.updateNode(node))
  }

  async addEdge(edge: any) {
    await this.update(update => update.addEdge(edge))
  }

  async deleteEdge(edge: any) {
    await this.update(update => update.deleteEdge(edge))
  }

  async applyUpdate(update: Update<N, E>) {
    log.info('applyUpdate', update)
    // create nodes in canvas and wait for their measurements
    await this.measureNodes(update)
    // apply updates to get a new version of the graph
    const graph = this.state.graph!.withMutations((mut: Mutator) => {
      for (const edge of update.removeEdges ?? [])
        this._removeEdge(edge, mut)
      for (const node of update.removeNodes ?? [])
        this._removeNode(node, mut)
      for (const node of update.addNodes ?? [])
        this._addNode(node, mut)
      for (const node of update.updateNodes ?? [])
        this._updateNode(node, mut)
      for (const edge of update.addEdges ?? [])
        this._addEdge(edge, mut)
      for (const edge of update.updateEdges ?? [])
        this._updateEdge(edge, mut)
    })
    // add the new state, then nav to it
    this.state = { graph, update }
    this.setNodePositions()
    this.seq.splice(this.index + 1)
    this.seq.push(this.state)
    this.nav('last')
  }

  private setNodePositions() {
    const { graph } = this.state
    for (const nodeId of graph.dirtyNodes) {
      const node = graph.getNode(nodeId)
      this.canvas.getNode(node.key).setPos(node.pos!)
    }
  }

  async update(callback: (updater: Updater<N, E>) => void) {
    // collect updates from the caller
    const updater = new Updater<N, E>()
    callback(updater)
    await this.applyUpdate(updater.update)
  }

  private async measureNodes(update: Update<N, E>) {
    const data: PublicNodeData[] = []
    for (const set of [update.updateNodes, update.addNodes])
      for (const node of set ?? [])
        data.push(this.parseNode(node, true))
    await this.canvas.measureNodes(data)
  }

  private getDims(key: NodeKey) {
    return this.canvas.getDims(key)
  }

  private parseNode(data: N, bumpVersion: boolean = false): PublicNodeData {
    const get = this.options.props.node
    let props: NodeProps<N>
    if (get) props = get(data)
    else if (!data) throw new Error(`invalid node ${data}`)
    else if (typeof data == 'string') props = { id: data }
    else if (typeof data == 'object') props = data
    else throw new Error(`invalid node ${data}`)
    let { id, title, text, style, render } = props
    id ??= this.getNodeId(data)
    const ports = this.parsePorts(props.ports)
    let version = this.nodeVersions.get(data)
    const isNew = !version
    if (!version) version = 1
    else if (bumpVersion) version++
    this.nodeVersions.set(data, version)
    const dims = isNew ? undefined : this.getDims(`${id}:${version}`)
    const node = { id, data, ports, title, text, style, render, dims, version }
    return node
  }

  private parseEdge(data: E): PublicEdgeData {
    const get = this.options.props.edge
    let props: Partial<EdgeProps<N>>
    if (get) props = get(data)
    else if (!data) throw new Error(`invalid edge ${data}`)
    else if (typeof data == 'string') props = this.parseStringEdge(data)
    else if (typeof data == 'object') props = data
    else throw new Error(`invalid edge ${data}`)
    let { id, source, target, type, style } = props
    id ??= this.getEdgeId(data)
    source = this.parseEdgeEnd(source)
    target = this.parseEdgeEnd(target)
    const edge = { id, source, target, type, style, data }
    return edge
  }

  private parseEdgeEnd(end?: EdgeEnd<N>): { id: string, port?: string }
  private parseEdgeEnd(end?: any): { id: string, port?: string } {
    if (!end) throw new Error(`edge has an undefined source or target`)
    if (typeof end == 'string') return { id: end }
    if (typeof end == 'object') {
      const keys = Object.keys(end)
      const pidx = keys.indexOf('port')
      if (pidx != -1) {
        if (typeof end.port != 'string') return end
        keys.splice(pidx, 1)
      }
      if (keys.length != 1) return end
      if (keys[0] == 'id') return end
      if (keys[0] != 'node') return end
      const id = this.nodeIds.get(end.node)
      if (!id) throw new Error(`edge end ${end} references unknown node ${end.node}`)
      return { id, port: end.port }
    }
    throw new Error(`invalid edge end ${end}`)
  }

  private parseStringEdge(str: string): EdgeProps<N> {
    const [source, target] = str.split(/\s*(?::|-+>?)\s*/)
    return { source, target }
  }

  private parsePorts(ports?: NodeProps<N>['ports']): PublicNodeData['ports'] {
    const fixed: PublicNodeData['ports'] = { in: null, out: null }
    for (const key of ['in', 'out'] as Dir[]) {
      if (ports?.[key] && ports[key].length > 0)
        fixed[key] = ports[key].map(port =>
          typeof port == 'string' ? { id: port } : port)
    }
    return fixed
  }

  private getNodeId(node: N): string {
    let id = this.nodeIds.get(node)
    if (!id) {
      id = `n${this.nextNodeId++}`
      this.nodeIds.set(node, id)
    }
    return id
  }

  private getEdgeId(edge: E): string {
    let id = this.edgeIds.get(edge)
    if (!id) {
      id = `e${this.nextEdgeId++}`
      this.edgeIds.set(edge, id)
    }
    return id
  }

  private _addNode(node: any, mut: Mutator) {
    const data = this.parseNode(node)
    const id = this.nodeIds.get(node)
    if (id && id != data.id)
      throw new Error(`node id changed from ${id} to ${data.id}`)
    this.nodeIds.set(node, data.id)
    mut.addNode(data)
  }

  private _removeNode(node: any, mut: Mutator) {
    const id = this.nodeIds.get(node)
    if (!id) throw new Error(`removing node ${node} which does not exist`)
    mut.removeNode(this.parseNode(node))
  }

  private _updateNode(node: N, mut: Mutator) {
    const id = this.nodeIds.get(node)
    if (!id) throw new Error(`updating unknown node ${node}`)
    const data = this.parseNode(node)
    if (data.id !== id) throw new Error(`node id changed from ${id} to ${data.id}`)
    mut.updateNode(data)
  }

  private _addEdge(edge: any, mut: Mutator) {
    const data = this.parseEdge(edge)
    const id = this.edgeIds.get(edge)
    if (id && id != data.id)
      throw new Error(`edge id changed from ${id} to ${data.id}`)
    this.edgeIds.set(edge, data.id)
    mut.addEdge(data)
  }

  private _removeEdge(edge: any, mut: Mutator) {
    const id = this.edgeIds.get(edge)
    if (!id) throw new Error(`removing edge ${edge} which does not exist`)
    mut.removeEdge(this.parseEdge(edge))
  }

  private _updateEdge(edge: any, mut: Mutator) {
    const id = this.edgeIds.get(edge)
    if (!id) throw new Error(`updating unknown edge ${edge}`)
    const data = this.parseEdge(edge)
    if (data.id !== id) throw new Error(`edge id changed from ${id} to ${data.id}`)
    mut.updateEdge(data)
  }
}
