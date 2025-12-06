import { logger } from './log'
const log = logger('edges')

/**
 * Mixin for edge operations
 * 
 * @typedef {import('./graph').Graph} Graph
 */
export const GraphEdges = {
  /**
   * Get a relationship (edge or segment) by ID
   * 
   * @param {string} relId - Relationship ID
   * @returns {Object} The relationship
   */
  _getRel(relId) {
    return relId.startsWith('e:')
      ? this.getEdge(relId)
      : this.getSeg(relId)
  },

  /**
   * Generate the ID of an edge or segment. The ID is in the format
   * 
   * {type}:{source.id}[.{source.port}]-[{type}]-{target.id}[.{target.port}]
   * 
   * Examples:
   * 
   * e:n1--n2
   * e:n1.out1--n2
   * e:n1--n2.in1
   * e:n1.out1--n2.in1
   * e:n1.out1-bold-n2.in1
   * 
   * @param {Object} obj - Edge or segment
   * @param {string} type - Type of relationship
   * @returns {string} The relationship ID
   */
  _edgeSegId(obj, type, side = 'both') {
    let source = '', target = ''
    if (side == 'source' || side == 'both') {
      source = obj.source.id
      if (obj.source.port) source += `.${obj.source.port}`
      source += '-'
    }
    if (side == 'target' || side == 'both') {
      target = '-' + obj.target.id
      if (obj.target.port) target += `.${obj.target.port}`
    }
    return `${type}:${source}${obj.type || ''}${target}`
  },

  /**
   * Generate the ID of an edge
   * 
   * @param {Object} edge - Edge
   * @returns {string} The edge ID
   */
  _edgeId(edge) {
    return this._edgeSegId(edge, 'e')
  },

  /**
   * Generate the ID of a segment
   * 
   * @param {Object} seg - Segment
   * @returns {string} The segment ID
   */
  _segId(seg) {
    return this._edgeSegId(seg, 's')
  },

  /**
   * Generate a new layer ID
   * 
   * @returns {string} A new layer ID
   */
  _newLayerId() {
    return `l:${this.nextLayerId++}`
  },

  /**
   * Link a segment to its source and target nodes
   * 
   * @param {Object} seg - Segment
   */
  _linkSeg(seg) {
    this._linkObj(seg, 'segs')
  },

  /**
   * Link an edge to its source and target nodes
   * 
   * @param {Object} edge - Edge
   */
  _linkEdge(edge) {
    this._linkObj(edge, 'edges')
  },

  /**
   * Unlink a segment from its source and target nodes
   * 
   * @param {Object} seg - Segment
   */
  _unlinkSeg(seg) {
    this._unlinkRel(seg, 'segs')
  },

  /**
   * Unlink an edge from its source and target nodes
   * 
   * @param {Object} edge - Edge
   */
  _unlinkEdge(edge) {
    this._unlinkRel(edge, 'edges')
  },

  /**
   * Link a relationship (edge or segment) to its source and target nodes
   * 
   * @param {Object} rel - Relationship
   * @param {string} type - Type of relationship
   */
  _linkObj(rel, type) {
    this._addRel(rel.source.id, rel.id, type, 'out')
    this._addRel(rel.target.id, rel.id, type, 'in')
  },

  /**
   * Unlink a relationship (edge or segment) from its source and target nodes
   * 
   * @param {Object} rel - Relationship
   * @param {string} type - Type of relationship
   */
  _unlinkRel(rel, type) {
    log.debug(`unlinking rel ${rel.id} from ${rel.source.id} and ${rel.target.id}`)
    this._deleteRel(rel.source.id, rel.id, type, 'out')
    this._deleteRel(rel.target.id, rel.id, type, 'in')
  },

  /**
   * Modify a relationship (edge or segment) in the graph.
   * Either adds or deletes the relation from the appropriate
   * immutable set on the node.
   * 
   * @param {string} nodeId - Node ID
   * @param {string} relId - Relationship ID
   * @param {string} type - Type of relationship
   * @param {string} dir - Direction of relationship
   * @param {string} op - Operation (add or delete)
   */
  _modRel(nodeId, relId, type, dir, op) {
    log.debug(`${op} rel ${relId} on ${nodeId} ${type} ${dir}`)
    let node = this.getNode(nodeId)
    let sets = node[type]
    let set = sets[dir]
    const exists = set.has(relId)
    if (op == 'add' && exists) return
    else if (op == 'delete' && !exists) return
    set = set[op](relId)
    sets = { ...sets, [dir]: set }
    node = { ...node, [type]: sets }
    this.nodes.set(nodeId, node)
  },

  /**
   * Add a relationship (edge or segment) to its source and target nodes
   * 
   * @param {string} nodeId - Node ID
   * @param {string} relId - Relationship ID
   * @param {string} type - Type of relationship
   * @param {string} dir - Direction of relationship
   */
  _addRel(nodeId, relId, type, dir) {
    this._modRel(nodeId, relId, type, dir, 'add')
  },

  /**
   * Delete a relationship (edge or segment) from its source and target nodes
   * 
   * @param {string} nodeId - Node ID
   * @param {string} relId - Relationship ID
   * @param {string} type - Type of relationship
   * @param {string} dir - Direction of relationship
   */
  _deleteRel(nodeId, relId, type, dir) {
    this._modRel(nodeId, relId, type, dir, 'delete')
  },

  /**
   * Add a new edge to the graph and link it to its source and target nodes
   * 
   * @param {Object} props - Edge properties
   * @returns {Object} The edge object
   */
  _addEdge(props) {
    const edge = {
      ...props,
      id: this._edgeId(props),
      segs: [],
    }
    this.edges.set(edge.id, edge)
    this._linkEdge(edge)
    return edge
  },

  /**
   * Remove an edge from the graph and unlink it from its source and target nodes.
   * Also remove it from the edge list of any segments it includes. Any segments
   * that become unused are deleted.
   * 
   * @param {string} edgeId - Edge ID
   */
  _deleteEdge(edgeId) {
    log.debug(`deleting edge ${edgeId}`)
    const edge = this.edges.get(edgeId)
    if (!edge) return
    log.debug(`unlinking edge ${edgeId}`)
    this._unlinkEdge(edge)
    for (const segId of edge.segs)
      this._segDeleteEdge(segId, edgeId)
    this.edges.delete(edgeId)
  },

  /**
   * Add a new segment to the graph and link it to its source and target nodes
   * 
   * @param {Object} props - Segment properties
   * @returns {Object} The segment object
   */
  _addSeg(props) {
    const seg = {
      ...props,
      id: this._segId(props),
    }
    this.segs.set(seg.id, seg)
    this._linkSeg(seg)
    return seg
  },

  /**
   * Remove a segment from the graph and unlink it from its source and target nodes.
   * If a source or target is a dummy node and becomes unlinked (no segments), delete it.
   * 
   * @param {string} segId - Segment ID
   */
  _deleteSeg(segId) {
    const seg = this.segs.get(segId)
    if (!seg) return
    this._unlinkSeg(seg)
    this.segs.delete(segId)
    for (const side of ['source', 'target']) {
      const node = this.getNode(seg[side].id)
      if (node.isDummy && this._nodeIsUnlinked(node.id))
        this._deleteNode(node.id)
    }
  },

  /**
   * Remove a relationship (edge or segment) from the graph and unlink it from its source and target nodes
   * 
   * @param {string} relId - Relationship ID
   */
  _deleteRelById(relId) {
    if (relId.startsWith('e:'))
      this._deleteEdge(relId)
    else
      this._deleteSeg(relId)
  },

  /**
   * Return an iterator over the relationships (edges and segments) of a node.
   * 
   * @param {string} nodeId - Node ID
   * @param {string} type - Type of relationship (defaults to 'both')
   * @param {string} dir - Direction of relationship (defaults to 'both')
   * @returns {Iterator} Iterator over the relationships
   */
  *_relIds(nodeId, type = 'both', dir = 'both') {
    const node = this.getNode(nodeId)
    const types = type == 'both' ? ['edges', 'segs'] : [type]
    const dirs = dir == 'both' ? ['in', 'out'] : [dir]
    for (const type of types)
      for (const dir of dirs)
        yield* node[type][dir]
  },

  /**
   * Return an iterator over the relationships (edges and segments) of a node.
   * 
   * @param {string} nodeId - Node ID
   * @param {string} type - Type of relationship (defaults to 'both')
   * @param {string} dir - Direction of relationship (defaults to 'both')
   * @returns {Iterator} Iterator over the relationships
   */
  *_rels(nodeId, type = 'both', dir = 'both') {
    log.debug(`getting rels for ${nodeId} ${type} ${dir}`)
    for (const relId of this._relIds(nodeId, type, dir))
      yield this._getRel(relId)
  },

  /**
   * Return an iterator over the neighbors of a node.
   * 
   * @param {string} nodeId - Node ID
   * @param {string} type - Type of relationship (defaults to 'both')
   * @param {string} dir - Direction of relationship (defaults to 'both')
   * @returns {Iterator} Iterator over the neighbors
   */
  *_adjIds(nodeId, type = 'both', dir = 'both') {
    const nodeIds = new Set()
    if (dir == 'both' || dir == 'in')
      for (const rel of this._rels(nodeId, type, 'in'))
        nodeIds.add(rel.source.id)
    if (dir == 'both' || dir == 'out')
      for (const rel of this._rels(nodeId, type, 'out'))
        nodeIds.add(rel.target.id)
    yield* nodeIds
  },

  /**
   * Return an iterator over the neighbors of a node.
   * 
   * @param {string} nodeId - Node ID
   * @param {string} type - Type of relationship (defaults to 'both')
   * @param {string} dir - Direction of relationship (defaults to 'both')
   */
  *_adjs(nodeId, type = 'both', dir = 'both') {
    for (const adjId of this._adjIds(nodeId, type, dir))
      yield this.getNode(adjId)
  },

  /**
   * Remove a segment from an edge
   * 
   * @param {string} edgeId - Edge ID
   * @param {string} segId - Segment ID
   */
  _edgeDeleteSeg(edgeId, segId) {
    const edge = this.getEdge(edgeId)
    const segs = edge.segs.filter(id => id == segId)
    this.edges.set(edgeId, { ...edge, segs })
  },

  /**
   * Remove an edge from a segment and delete the segment if it becomes empty.
   * 
   * @param {string} segId - Segment ID
   * @param {string} edgeId - Edge ID
   */
  _segDeleteEdge(segId, edgeId) {
    const seg = this.getSeg(segId)
    const edges = seg.edges.remove(edgeId)
    if (edges.size == 0)
      this._deleteSeg(segId)
    else
      this.segs.set(segId, { ...seg, edges })
  },

  /**
   * Replace a segment in an edge
   * 
   * @param {string} edgeId - Edge ID
   * @param {string} oldSegId - Old segment ID
   * @param {string} newSegId - New segment ID
   */
  _edgeReplaceSeg(edgeId, oldSegId, newSegId) {
    log.debug(`edge ${edgeId}: replacing segment ${oldSegId} with ${newSegId}`)
    this._segDeleteEdge(oldSegId, edgeId)
    const edge = this.getEdge(edgeId)
    const segs = edge.segs.map(id => id == oldSegId ? newSegId : id)
    this.edges.set(edgeId, { ...edge, segs })
  }
}