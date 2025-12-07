import { Set as ISet, Seq } from 'immutable'
import { logger } from './log.js'
const log = logger('layers')

export const GraphLayers = {
  /**
   * Get the index of a node's layer
   * 
   * @param {string} nodeId - Node ID
   * @returns {number} The index of the node's layer
   */
  _nodeLayerIndex(nodeId) {
    return this.getLayer(this.getNode(nodeId).layerId).index
  },


  /**
   * Add a node to a layer.
   * 
   * @param {string} layerId - Layer ID
   * @param {string} nodeId - Node ID
   */
  _layerAddNode(layerId, nodeId) {
    const layer = this.getLayer(layerId)
    this.layers.set(layerId, {
      ...layer,
      nodes: layer.nodes.add(nodeId)
    })
  },

  /**
   * Remove a node from a layer.
   * 
   * @param {string} layerId - Layer ID
   * @param {string} nodeId - Node ID
   */
  _layerDeleteNode(layerId, nodeId) {
    const layer = this.getLayer(layerId)
    let sorted = layer.sorted
    if (sorted) {
      const idx = sorted.findIndex(id => id == nodeId)
      if (idx >= 0) {
        sorted = sorted.filter(id => id != nodeId)
        for (let i = idx; i < sorted.length; i++) {
          const node = this.getNode(sorted[i])
          this.nodes.set(sorted[i], { ...node, index: i })
        }
      }
    }
    this.layers.set(layerId, {
      ...layer,
      nodes: layer.nodes.delete(nodeId),
      sorted,
    })
    if (this._layerIsEmpty(layerId))
      this._deleteLayer(layerId)
  },


  /**
   * Update layers in two passes:
   * 
   *  - Move children up or down to just below lowest parent
   *  - Move parents down to just above highest child
   * 
   * While moving nodes between layers, if any layer becomes empty,
   * remove it from the list; at the end, renumber the remaining layers
   */
  _updateLayers() {
    // phase 1: DFS to fix child layers based on parents
    // visit at least each dirty node
    const stack = [...this._dirtyNodes].filter(id => {
      const node = this.nodes.get(id)
      if (!node || node.isDummy) return false
      return true
    })
    stack.sort((a, b) => this._nodeLayerIndex(b) - this._nodeLayerIndex(a))
    const phase2 = new Set(stack)
    const moved = new Set()
    while (stack.length > 0) {
      const id = stack.pop()
      const parentIds = [...this._adjIds(id, 'edges', 'in')]
      let correctLayer
      if (parentIds.length == 0) {
        // this only happens for new nodes or removed edges; move to top
        correctLayer = 0
      } else {
        // otherwise, move to just below max parent
        const maxParent = Seq(parentIds).map(id => this._nodeLayerIndex(id)).max()
        correctLayer = maxParent + 1
      }
      const curLayer = this._nodeLayerIndex(id)
      // if needs a move, move it and push children to stack
      // also add parents to phase 2
      if (curLayer != correctLayer) {
        moved.add(id)
        this._moveNodeLayer(id, correctLayer)
        stack.push(...this._adjIds(id, 'edges', 'out'))
        for (const parentId of parentIds)
          phase2.add(parentId)
      }
    }
    // phase 2: reverse topo order to fix parents based on children
    const byLayer = new Map()
    // start by grouping by layer
    const addParent = (nodeId) => {
      let set
      const layerId = this.getNode(nodeId).layerId
      if (!byLayer.has(layerId)) {
        set = new Set()
        byLayer.set(layerId, set)
      } else {
        set = byLayer.get(layerId)
      }
      set.add(nodeId)
    }
    for (const id of phase2) addParent(id)
    // take layers in reverse topo order
    const layerIds = [...byLayer.keys()].sort(
      (a, b) => this.layers.get(b).index - this.layers.get(a).index)
    for (const layerId of layerIds) {
      const curLayer = this.layers.get(layerId).index
      // visit each parent of this layer
      for (const parentId of byLayer.get(layerId)) {
        const children = [...this._adjIds(parentId, 'edges', 'out')]
        if (children.length == 0) continue
        // should be just above min child
        const minChild = Seq(children).map(id => this._nodeLayerIndex(id)).min()
        const correctLayer = minChild - 1
        // if needs a move, move it and push parents to stack
        if (curLayer != correctLayer) {
          moved.add(parentId)
          this._moveNodeLayer(parentId, correctLayer)
          for (const grandParentId of this._adjIds(parentId, 'edges', 'in'))
            addParent(grandParentId)
        }
      }
    }
    // mark edges as dirty
    for (const id of moved)
      for (const edgeId of this._relIds(id, 'edges', 'both'))
        this._dirtyEdges.add(edgeId)
    for (const edge of this.changes.addedEdges)
      this._dirtyEdges.add(this._edgeId(edge))
  },

  /**
   * Move the node to a new layer, crushing the original layer
   * if it becomes empty
   * 
   * @param {string} nodeId - Node ID
   * @param {number} newIndex - New layer index
   */
  _moveNodeLayer(nodeId, newIndex) {
    log.debug(`moving node ${nodeId} to layer ${newIndex}`)
    const node = this.getNode(nodeId)
    const oldLayerId = node.layerId
    const newLayerId = this._layerAtIndex(newIndex).id
    this._layerDeleteNode(oldLayerId, nodeId)
    this._layerAddNode(newLayerId, nodeId)
    this.nodes.set(nodeId, { ...node, layerId: newLayerId })
  },

  /**
   * Get the layer at the given index, creating it if necessary
   * 
   * @param {number} index - Layer index
   * @returns {Object} The layer
   */
  _layerAtIndex(index) {
    while (index >= this.layerList.size)
      this._addLayer()
    const layerId = this.layerList.get(index)
    return this.layers.get(layerId)
  },

  /**
   * Add a new layer. The caller should add a node to it so that
   * it's not empty.
   */
  _addLayer() {
    const id = `l:${this.nextLayerId++}`
    this.layers.set(id, {
      id,
      index: this.layerList.size,
      nodes: ISet()
    })
    this.layerList.push(id)
    this.dirtyLayers.add(id)
  },

  /**
   * Check if a layer is empty
   * 
   * @param {string} layerId - Layer ID
   * @returns {boolean} True if the layer is empty
   */
  _layerIsEmpty(layerId) {
    return this.layers.get(layerId).nodes.size == 0
  },

  /**
   * Delete a layer and renumber the remaining layers
   * 
   * @param {string} layerId - Layer ID
   */
  _deleteLayer(layerId) {
    const layer = this.getLayer(layerId)
    const index = layer.index
    log.debug(`deleting layer ${layerId} at index ${index} / ${this.layerList.size}`)
    this.layerList.remove(index)
    this.layers.delete(layerId)
    for (let i = index; i < this.layerList.size; i++) {
      const id = this.layerList.get(i)
      this.layers.set(id, {
        ...this.layers.get(id),
        index: i
      })
    }
  },
}