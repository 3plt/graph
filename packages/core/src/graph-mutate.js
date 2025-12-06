export const GraphMutate = {
  /**
   * Put the graph in mutate mode, where all the listed
   * stateful (immutable) collections are also put in
   * mutate mode. Within the callback, the collections
   * are modified in place.
   * 
   * @param {Function} callback - The callback to run
   */
  _mutate(callback) {
    const state = [
      'nodes',
      'edges',
      'layers',
      'layerList',
      'segs',
    ]
    const mut = () => {
      if (state.length == 0) return callback()
      const name = state.shift()
      this[name] = this[name].withMutations(map => {
        this[name] = map
        mut()
      })
    }
    mut()
  },

  /**
   * Update the graph by applying changes and updating
   * the computed graph state.
   */
  _update() {
    if (!this._dirty) return
    this._mutate(() => {
      this._applyChanges()
      this._markDirtyNodes()
      this._checkCycles()
      this._updateLayers()
      this._updateDummies()
      this._mergeDummies()
    })
    this._dirty = false
  },

  /**
   * Based on incoming changes, find nodes which may trigger
   * layout changes and mark them as dirty.
   */
  _markDirtyNodes() {
    for (const node of this.changes.addedNodes)
      this._markDirty(node.id)
    for (const edge of this.changes.addedEdges)
      this._markDirty(edge.target.id)
    for (const edge of this.changes.removedEdges)
      this._markDirty(edge.target.id)
  },

  /**
   * Mark a node as dirty if it exists in the graph.
   * 
   * @param {string} id - Node ID
   */
  _markDirty(id) {
    if (this.nodes.has(id))
      this._dirtyNodes.add(id)
  },

  /**
   * Apply node and edge changes to the graph
   */
  _applyChanges() {
    for (const node of this.changes.addedNodes)
      this._addNode(node)
    for (const node of this.changes.removedNodes)
      this._deleteNode(node.id)
    for (const edge of this.changes.addedEdges)
      this._addEdge(edge)
    for (const edge of this.changes.removedEdges)
      this._deleteEdge(edge.id ?? this._edgeId(edge))
  },
}
