import { Graph } from '../graph/graph'
import { Canvas } from '../canvas/canvas'
import { EdgeId, PublicEdgeData } from '../graph/edge'
import { SegId } from '../graph/seg'
import { Mutator } from '../graph/mutator'
import { MarkerType } from '../canvas/marker'
import { APIArguments, Update, NodeProps, EdgeProps, EdgeEnd, EventsOptions, NewNode, NewEdge } from './options'
import { Defaults, applyDefaults } from './defaults'
import { PublicNodeData, NodeId, PortId } from '../graph/node'
import { Node } from '../canvas/node'
import { Nav, Dir } from '../common'
import { Updater } from './updater'
import { logger } from '../log'

const log = logger('api')

type State<N, E> = {
  graph: Graph
  update: Update<N, E> | null
}

export type EditNodeProps = NewNode & {
  id: string
}

export type EditEdgeProps = {
  id: string
  type?: string
  source: { id: string, port?: string, marker?: MarkerType }
  target: { id: string, port?: string, marker?: MarkerType }
}

/** Core graph API */
export class API<N, E> {
  private state: State<N, E>
  private seq: State<N, E>[]
  private index: number
  private canvas: Canvas<N, E>
  private options: Defaults<N, E>
  private history: Update<N, E>[]
  private nodeIds: Map<N, string>
  private edgeIds: Map<E, string>
  private nodeVersions: Map<N, number>
  private nodeOverrides: Map<N, Partial<NodeProps<N>>>
  private edgeOverrides: Map<E, Partial<EdgeProps<N>>>
  private nodeFields: Map<string, 'string' | 'number' | 'boolean'>
  private nextNodeId: number
  private nextEdgeId: number
  private events: EventsOptions<N, E>
  private root: string

  constructor(args: APIArguments<N, E>) {
    this.root = args.root
    this.options = applyDefaults(args.options)

    // build initial empty graph
    let graph = new Graph({ options: this.options.graph })
    this.state = { graph, update: null }
    this.events = args.events || {}
    this.seq = [this.state]
    this.index = 0
    this.nodeIds = new Map()
    this.edgeIds = new Map()
    this.nodeVersions = new Map()
    this.nodeOverrides = new Map()
    this.edgeOverrides = new Map()
    this.nodeFields = new Map()
    this.nextNodeId = 1
    this.nextEdgeId = 1

    // create canvas
    this.canvas = new Canvas<N, E>(this, {
      ...this.options.canvas,
      dummyNodeSize: this.options.graph.dummyNodeSize,
      orientation: this.options.graph.orientation,
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

  /** Current history index (0-based) */
  getHistoryIndex(): number {
    return this.index
  }

  /** Current history length */
  getHistoryLength(): number {
    return this.seq.length
  }

  /** Toggle canvas editable mode without re-creating the graph */
  setEditable(editable: boolean): void {
    this.canvas.editMode.editable = editable
  }

  /** Replace entire history (clears prior) */
  async replaceHistory(frames: Update<N, E>[]) {
    this.history = frames
    // Reset state/seq and re-init into current canvas
    this.seq = [this.state]
    this.index = 0
    for (const update of this.history)
      await this.applyUpdate(update)
  }

  /** Rebuild from snapshot (nodes/edges) */
  async rebuildFromSnapshot(nodes: N[], edges: E[], description?: string) {
    this.history = [
      {
        addNodes: nodes,
        addEdges: edges,
        description,
      }
    ]
    this.seq = [this.state]
    this.index = 0
    for (const update of this.history)
      await this.applyUpdate(update)
  }

  private get graph() {
    return this.state.graph
  }

  /** Initialize the API */
  async init() {
    const root = document.getElementById(this.root)
    if (!root) throw new Error('root element not found')
    root.appendChild(this.canvas.container!)
    for (const update of this.history)
      await this.applyUpdate(update)
  }

  /** Navigate to a different state */
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
    // Notify history change
    if (this.events.historyChange)
      this.events.historyChange(this.index, this.seq.length)
  }

  private applyDiff(oldIndex: number, newIndex: number) {
    const oldGraph = this.seq[oldIndex].graph
    const newGraph = this.seq[newIndex].graph

    for (const oldNode of oldGraph.nodes.values()) {
      const newNode = newGraph.nodes.get(oldNode.id)
      if (!newNode) this.canvas.deleteNode(oldNode)
    }
    for (const newNode of newGraph.nodes.values()) {
      const oldNode = oldGraph.nodes.get(newNode.id)
      if (!oldNode) {
        this.canvas.addNode(newNode)
      } else if (oldNode.key !== newNode.key) {
        // Node version changed (e.g., during rebuild) - delete old and add new
        this.canvas.deleteNode(oldNode)
        this.canvas.addNode(newNode)
      } else if (oldNode.pos !== newNode.pos) {
        // Same node, just update position
        this.canvas.getNode(newNode.key).setPos(newNode.pos!)
      }
    }
    for (const oldSeg of oldGraph.segs.values()) {
      const newSeg = newGraph.segs.get(oldSeg.id)
      if (!newSeg) {
        this.canvas.deleteSeg(oldSeg)
      } else if (oldSeg !== newSeg) {
        this.canvas.updateSeg(newSeg, newGraph)
      }
    }
    for (const newSeg of newGraph.segs.values()) {
      if (!oldGraph.segs.has(newSeg.id)) {
        this.canvas.addSeg(newSeg, newGraph)
      }
    }

    this.canvas.update()
  }

  /** Add a node */
  async addNode(node: N) {
    await this.update(update => update.addNode(node))
  }

  /** Delete a node */
  async deleteNode(node: N) {
    await this.update(update => update.deleteNode(node))
  }

  /** Update a node */
  async updateNode(node: N) {
    await this.update(update => update.updateNode(node))
  }

  /** Add an edge */
  async addEdge(edge: E) {
    await this.update(update => update.addEdge(edge))
  }

  /** Delete an edge */
  async deleteEdge(edge: E) {
    await this.update(update => update.deleteEdge(edge))
  }

  /** Update an edge */
  async updateEdge(edge: E) {
    await this.update(update => update.updateEdge(edge))
  }

  /** Perform a batch of updates */
  async update(callback: (updater: Updater<N, E>) => void) {
    // collect updates from the caller
    const updater = new Updater<N, E>()
    callback(updater)
    await this.applyUpdate(updater.update)
  }

  /** Rebuild the graph from scratch (removes all then re-adds all nodes/edges) */
  async rebuild() {
    // Collect current nodes and edges from the nodeIds/edgeIds maps
    const nodes: N[] = [...this.nodeIds.keys()]
    const edges: E[] = [...this.edgeIds.keys()]

    await this.update(updater => {
      // Remove all edges and nodes
      for (const edge of edges) updater.deleteEdge(edge)
      for (const node of nodes) updater.deleteNode(node)
      // Re-add all nodes first, then edges
      for (const node of nodes) updater.addNode(node)
      for (const edge of edges) updater.addEdge(edge)
    })
  }

  private async applyUpdate(update: Update<N, E>) {
    log.info('applyUpdate', update)
    // create nodes in canvas and wait for their measurements
    const nodes = await this.measureNodes(update)
    // apply updates to get a new version of the graph
    const graph = this.state.graph!.withMutations((mut: Mutator) => {
      for (const edge of update.removeEdges ?? [])
        this._removeEdge(edge, mut)
      for (const node of update.removeNodes ?? [])
        this._removeNode(node, mut)
      for (const node of update.addNodes ?? [])
        this._addNode(nodes.get(node)!, mut)
      for (const node of update.updateNodes ?? [])
        this._updateNode(nodes.get(node)!, mut)
      for (const edge of update.addEdges ?? [])
        this._addEdge(edge, mut)
      for (const edge of update.updateEdges ?? [])
        this._updateEdge(edge, mut)
      this.nodeOverrides.clear()
      this.edgeOverrides.clear()
    })
    // add the new state, then nav to it
    this.state = { graph, update }
    this.setNodePositions()
    this.seq.splice(this.index + 1)
    this.seq.push(this.state)
    this.nav('last')
    // In case the consumer doesn't call nav, still notify
    if (this.events.historyChange)
      this.events.historyChange(this.index, this.seq.length)
  }

  private setNodePositions() {
    const { graph } = this.state
    for (const nodeId of graph.dirtyNodes) {
      const node = graph.getNode(nodeId)
      if (!node.isDummy)
        this.canvas.getNode(node.key).setPos(node.pos!)
    }
  }

  private async measureNodes(update: Update<N, E>): Promise<Map<N, Node>> {
    const data: PublicNodeData[] = []
    for (const set of [update.updateNodes, update.addNodes])
      for (const node of set ?? [])
        data.push(this.parseNode(node, true))
    return await this.canvas.measureNodes(data)
  }

  private parseNode(data: N, bumpVersion: boolean = false): PublicNodeData {
    const get = this.options.props.node
    let props: NodeProps<N>
    if (get) props = get(data)
    else if (!data) throw new Error(`invalid node ${data}`)
    else if (typeof data == 'string') props = { id: data }
    else if (typeof data == 'object') props = data
    else throw new Error(`invalid node ${JSON.stringify(data)}`)
    // Detect fields from the raw node data
    this.detectNodeFields(data)
    // Apply overrides (from built-in modal edits on opaque types)
    const overrides = this.nodeOverrides.get(data)
    if (overrides) props = { ...props, ...overrides }
    let { id, title, text, type, render } = props
    id ??= this.getNodeId(data)
    const ports = this.parsePorts(props.ports)
    let version = this.nodeVersions.get(data)
    if (!version) version = 1
    else if (bumpVersion) version++
    this.nodeVersions.set(data, version)
    return { id, data, ports, title, text, type, render, version }
  }

  private detectNodeFields(data: N) {
    if (typeof data != 'object' || !data) return
    // Skip internal/complex fields
    const skip = new Set(['id', 'ports', 'render', 'version'])
    for (const [key, value] of Object.entries(data)) {
      if (skip.has(key)) continue
      if (value === null || value === undefined) continue
      const type = typeof value
      if (type === 'string' || type === 'number' || type === 'boolean') {
        this.nodeFields.set(key, type)
      }
    }
  }

  getNodeFields(): Map<string, 'string' | 'number' | 'boolean'> {
    return this.nodeFields
  }

  private parseEdge(data: E): PublicEdgeData {
    const get = this.options.props.edge
    let props: Partial<EdgeProps<N>>
    if (get) props = get(data)
    else if (!data) throw new Error(`invalid edge ${data}`)
    else if (typeof data == 'string') props = this.parseStringEdge(data)
    else if (typeof data == 'object') props = data
    else throw new Error(`invalid edge ${data}`)
    // Apply overrides (from built-in modal edits on opaque types)
    const overrides = this.edgeOverrides.get(data)
    if (overrides) props = { ...props, ...overrides }
    let { id, source, target, type } = props
    if (!id) id = this.getEdgeId(data)
    source = this.parseEdgeEnd(source)
    target = this.parseEdgeEnd(target)
    const edge = { id, source, target, type, data }
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
        // port must be string or undefined; if it's something else, return as-is
        if (end.port !== undefined && typeof end.port != 'string') return end
        keys.splice(pidx, 1)
      }
      if (keys.length != 1) return end
      if (keys[0] == 'id') return end
      if (keys[0] != 'node') return end
      const id = this.nodeIds.get(end.node)
      if (!id) throw new Error(`edge end references unknown node ${end.node}`)
      return { id, port: end.port }
    }
    throw new Error(`invalid edge end ${end}`)
  }

  private parseStringEdge(str: string): EdgeProps<N> {
    const [source, target] = str.split(/\s*(?::|-+>?)\s*/)
    return { source, target }
  }

  private parsePorts(ports?: NodeProps<N>['ports']): PublicNodeData['ports'] {
    const fixed: PublicNodeData['ports'] = {}
    for (const key of ['in', 'out'] as Dir[]) {
      if (ports?.[key] && ports[key].length > 0)
        fixed[key] = ports[key].map(port =>
          typeof port == 'string' ? { id: port } : port)
    }
    return fixed
  }

  getNode(id: NodeId): PublicNodeData {
    return this.graph.getNode(id)
  }

  getEdge(id: EdgeId): PublicEdgeData {
    return this.graph.getEdge(id)
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

  private _addNode(node: Node, mut: Mutator) {
    const { data, id: newId } = node.data!
    const oldId = this.nodeIds.get(data)
    if (oldId && oldId != newId)
      throw new Error(`node id of ${data} changed from ${oldId} to ${newId}`)
    this.nodeIds.set(data, newId)
    mut.addNode(node.data!)
  }

  private _removeNode(node: any, mut: Mutator) {
    const id = this.nodeIds.get(node)
    if (!id) throw new Error(`removing node ${JSON.stringify(node)} which does not exist`)
    mut.removeNode({ id })
  }

  private _updateNode(node: Node, mut: Mutator) {
    const { data, id: newId } = node.data!
    const oldId = this.nodeIds.get(data)
    if (!oldId) throw new Error(`updating unknown node ${JSON.stringify(node)} `)
    if (oldId != newId) throw new Error(`node id changed from ${oldId} to ${newId} `)
    mut.updateNode(node.data!)
  }

  private _addEdge(edge: any, mut: Mutator) {
    const data = this.parseEdge(edge)
    const id = this.edgeIds.get(edge)
    if (id && id != data.id)
      throw new Error(`edge id changed from ${id} to ${data.id} `)
    this.edgeIds.set(edge, data.id)
    mut.addEdge(data)
  }

  private _removeEdge(edge: any, mut: Mutator) {
    const id = this.edgeIds.get(edge)
    if (!id) throw new Error(`removing edge ${JSON.stringify(edge)} which does not exist`)
    mut.removeEdge(this.parseEdge(edge))
  }

  private _updateEdge(edge: any, mut: Mutator) {
    const id = this.edgeIds.get(edge)
    if (!id) throw new Error(`updating unknown edge ${JSON.stringify(edge)} `)
    const data = this.parseEdge(edge)
    if (data.id !== id) throw new Error(`edge id changed from ${id} to ${data.id} `)
    mut.updateEdge(data)
  }

  // Event Handlers

  handleClickNode(id: NodeId) {
    const handler = this.events.nodeClick
    const node = this.graph.getNode(id)
    if (handler) handler(node.data)
  }

  handleClickEdge(id: SegId) {
    const handler = this.events.edgeClick
    if (!handler) return
    const seg = this.graph.getSeg(id)
    if (seg.edgeIds.size != 1) return
    const edge = this.graph.getEdge(seg.edgeIds.values().next().value)
    handler(edge.data)
  }

  async handleNewNode() {
    const gotNode = async (node: N) => {
      await this.addNode(node)
    }
    if (this.events.newNode)
      this.events.newNode(gotNode)
    else
      this.canvas.showNewNodeModal(async (data) => {
        if (this.events.addNode)
          this.events.addNode(data, gotNode)
        else
          await gotNode(data as N)
      })
  }

  async handleNewNodeFrom(source: { id: string, port?: string }) {
    const gotNode = async (node: N) => {
      const gotEdge = async (edge: E) => {
        await this.update(u => {
          u.addNode(node).addEdge(edge)
        })
      }
      const data = this.graph.getNode(source.id).data
      const newEdge: NewEdge<N> = {
        source: { node: data, port: source.port },
        target: { node }
      }
      if (this.events.addEdge)
        this.events.addEdge(newEdge, gotEdge)
      else
        await gotEdge(newEdge as E)
    }
    if (this.events.newNode)
      this.events.newNode(gotNode)
    else
      this.canvas.showNewNodeModal(async (data: Record<string, any>) => {
        if (this.events.addNode)
          this.events.addNode(data, gotNode)
        else
          await gotNode(data as N)
      })
  }

  async handleEditNode(id: NodeId) {
    const node = this.graph.getNode(id)
    const gotNode = async (node: N) => {
      if (node) await this.updateNode(node)
    }
    if (this.events.editNode)
      this.events.editNode(node.data, gotNode)
    else {
      this.canvas.showEditNodeModal(node, async (data: Record<string, any>) => {
        if (this.events.updateNode)
          this.events.updateNode(node.data, data, gotNode)
        else {
          // Store overrides for opaque N types, then update with original data
          this.nodeOverrides.set(node.data, data)
          await gotNode(node.data)
        }
      })
    }
  }

  async handleEditEdge(id: SegId) {
    const seg = this.graph.getSeg(id)
    if (seg.edgeIds.size != 1) return
    const edge = this.graph.getEdge(seg.edgeIds.values().next().value)
    const gotEdge = async (edge: E | null) => {
      if (edge) await this.updateEdge(edge)
    }
    if (this.events.editEdge)
      this.events.editEdge(edge.data, gotEdge)
    else
      this.canvas.showEditEdgeModal(edge, async (data: EditEdgeProps) => {
        const sourceNode = edge.sourceNode(this.graph)
        const targetNode = edge.targetNode(this.graph)
        const update: NewEdge<N> = {
          source: { node: sourceNode.data, port: data.source.port, marker: data.source.marker },
          target: { node: targetNode.data, port: data.target.port, marker: data.target.marker },
        }
        if (this.events.updateEdge)
          this.events.updateEdge(edge.data, update, gotEdge)
        else {
          // Store overrides for opaque E types, then update with original data
          this.edgeOverrides.set(edge.data, {
            source: { id: sourceNode.id, port: data.source.port, marker: data.source.marker },
            target: { id: targetNode.id, port: data.target.port, marker: data.target.marker },
            type: data.type,
          })
          await gotEdge(edge.data)
        }
      })
  }

  async handleAddEdge(data: EditEdgeProps) {
    const gotEdge = async (edge: E | null) => {
      if (edge) await this.addEdge(edge)
    }
    const newEdge: NewEdge<N> = {
      source: { node: this.graph.getNode(data.source.id).data, port: data.source.port, marker: data.source.marker },
      target: { node: this.graph.getNode(data.target.id).data, port: data.target.port, marker: data.target.marker },
    }
    if (this.events.addEdge)
      this.events.addEdge(newEdge, gotEdge)
    else
      await gotEdge(data as E)
  }

  async handleDeleteNode(id: NodeId) {
    const node = this.getNode(id)
    if (this.events.removeNode)
      this.events.removeNode(node.data, async (remove) => {
        if (remove) await this.deleteNode(node.data)
      })
    else
      await this.deleteNode(node.data)
  }

  async handleDeleteEdge(id: EdgeId) {
    const edge = this.getEdge(id)
    if (this.events.removeEdge)
      this.events.removeEdge(edge.data, async (remove) => {
        if (remove) await this.deleteEdge(edge.data)
      })
    else
      await this.deleteEdge(edge.data)
  }
}
