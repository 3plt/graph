import { Set as ISet } from 'immutable'
import { logger } from './log'

const log = logger('nodes')

/**
 * Mixin for node operations
 * 
 * @typedef {import('./graph').Graph} Graph
 */
export const GraphNodes = {
  /**
   * Add a node to the graph
   * 
   * @param {Object} props - Node properties
   * @param {string} props.id - Node ID (required)
   * @param {string} props.layerId - Node layer ID (optional)
   * @returns {Object} The added node
   */
  _addNode(props) {
    const node = {
      ...props,
      edges: { in: ISet(), out: ISet() },
      segs: { in: ISet(), out: ISet() },
    }
    if (!node.layerId)
      node.layerId = this._layerAtIndex(0).id
    this._layerAddNode(node.layerId, node.id)
    this.nodes.set(node.id, node)
    return node
  },

  /**
   * Add a dummy node to the graph
   * 
   * @param {Object} props - Node properties
   * @param {string} props.layerId - Node layer ID (optional)
   * @returns {Object} The added node
   */
  _addDummy(props) {
    return this._addNode({
      ...props,
      id: this._newDummyId(),
      isDummy: true,
    })
  },

  /**
   * Remove a node from the graph
   * 
   * @param {string} nodeId - Node ID
   */
  _deleteNode(nodeId) {
    log.debug(`deleting node ${nodeId}`)
    const node = this.nodes.get(nodeId)
    if (!node) return
    this._layerDeleteNode(node.layerId, nodeId)
    for (const relId of this._relIds(nodeId))
      this._deleteRelById(relId)
    this.nodes.delete(nodeId)
  },

  /**
   * Check if a node is unlinked (has no relationships)
   * 
   * @param {string} nodeId - Node ID
   * @returns {boolean} True if the node is unlinked, false otherwise
   */
  _nodeIsUnlinked(nodeId) {
    const node = this.nodes.get(nodeId)
    if (!node) return false
    return node.edges.in.isEmpty() && node.edges.out.isEmpty() && node.segs.in.isEmpty() && node.segs.out.isEmpty()
  },

  /**
   * Generate a new dummy node ID
   * 
   * @returns {string} A new dummy node ID
   */
  _newDummyId() {
    return `d:${this.nextDummyId++}`
  },

  /**
   * Check if an ID is a dummy node ID
   * 
   * @param {string} nodeId - ID to check (required)
   * @returns {boolean} True if the ID is a dummy node ID, false otherwise
   */
  _isDummyId(nodeId) {
    return nodeId.startsWith('d:')
  },

  /**
   * Iterate over all node IDs
   * 
   * @returns {Iterator} Iterator over node IDs
   */
  *_nodeIds() {
    yield* this.nodes.keySeq()
  },
}
