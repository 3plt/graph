export const GraphCycle = {
  /**
   * Get the cycle info for a node
   * 
   * @param {string} nodeId - Node ID
   * @returns {string} The cycle info
   */
  _cycleInfo(nodeId) {
    return nodeId
  },

  /**
   * Check for cycles in the graph. If any are detected, throw an error.
   * Depending on the size of the graph and the number of changes, use
   * different algorithms.
   */
  _checkCycles() {
    const totalNodes = this.nodes.size
    const newStuff = this.changes.addedNodes.length + this.changes.addedEdges.length
    const changeRatio = newStuff / totalNodes
    if (changeRatio > 0.2 || totalNodes < 20)
      this._checkCyclesFull()
    else
      this._checkCyclesIncremental()
  },

  /**
   * Use a graph traversal algorithm to check for cycles.
   */
  _checkCyclesFull() {
    const colorMap = new Map()
    const parentMap = new Map()
    const white = 0, gray = 1, black = 2
    let start, end

    const visit = (nodeId) => {
      colorMap.set(nodeId, gray)
      for (const nextId of this._adjIds(nodeId, 'edges', 'out')) {
        switch (colorMap.get(nextId) ?? white) {
          case gray:
            start = nextId
            end = nodeId
            return true
          case white:
            parentMap.set(nextId, nodeId)
            if (visit(nextId)) return true
        }
      }
      colorMap.set(nodeId, black)
      return false
    }

    for (const nodeId of this._nodeIds())
      if ((colorMap.get(nodeId) ?? white) == white)
        if (visit(nodeId)) break

    if (!start) return

    const cycle = [this._cycleInfo(start)]
    let nodeId = end
    while (nodeId != start) {
      cycle.push(this._cycleInfo(nodeId))
      nodeId = parentMap.get(nodeId)
    }
    cycle.push(this._cycleInfo(start))
    cycle.reverse()
    const error = new Error(`Cycle detected: ${cycle.join(' → ')}`)
    error.cycle = cycle
    throw error
  },

  /**
   * Check for cycles in the graph incrementally. For each potential
   * new edge, if the source is < the target, there won't be a cycle.
   * Otherwise, check if there is a route from the target to the source;
   * if so, throw an error.
   */
  _checkCyclesIncremental() {
    for (const edge of this.changes.addedEdges) {
      const layer1 = this._nodeLayerIndex(edge.source.id)
      const layer2 = this._nodeLayerIndex(edge.target.id)
      if (layer1 < layer2) continue
      const route = this._findRoute(edge.target.id, edge.source.id)
      if (!route) continue
      const cycle = route.map(id => this._cycleInfo(id))
      cycle.reverse()
      const error = new Error(`Cycle detected: ${cycle.join(' → ')}`)
      error.cycle = cycle
      throw error
    }
  },

  /**
   * Find a route from the source to the target.
   * 
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @returns {Array} The route, or null if no route exists
   */
  _findRoute(sourceId, targetId) {
    const parentMap = new Map()
    const queue = [sourceId]
    const visited = new Set([sourceId])

    while (queue.length > 0) {
      const nodeId = queue.shift()
      if (nodeId == targetId) {
        const route = []
        let currId = targetId
        while (currId != sourceId) {
          route.push(currId)
          currId = parentMap.get(currId)
        }
        route.push(sourceId)
        route.reverse()
        return route
      }

      for (const nextId of this._adjIds(nodeId, 'edges', 'out')) {
        if (!visited.has(nextId)) {
          visited.add(nextId)
          parentMap.set(nextId, nodeId)
          queue.push(nextId)
        }
      }
    }

    return null
  }
}