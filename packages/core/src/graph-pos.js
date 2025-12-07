import { logger } from './log'
import { Seq } from 'immutable'
const log = logger('pos')

export const GraphPos = {
  /**
   * Find the minimum index of incoming edges to a node
   * 
   * @param {Object} node - Node
   * @returns {number} The minimum index of incoming edges
   */
  _parentIndex(node) {
    const parents = Seq(this._adjs(node.id, 'segs', 'in'))
    const pidx = parents.map(p => p.index).min()
    log.debug(`node ${node.id}: parent index ${pidx}`)
    if (pidx !== undefined) return pidx
    return node.isDummy ? -Infinity : Infinity
  },

  /**
   * Compare two nodes based on their parent index and natural ordering
   * 
   * @param {Object} aId - First node ID
   * @param {Object} bId - Second node ID
   * @returns {number} -1, 0, or 1
   */
  _compareNodes(aId, bId, pidxs) {
    const ai = pidxs.get(aId)
    const bi = pidxs.get(bId)
    if (ai !== bi) return ai - bi
    const a = this.getNode(aId)
    const b = this.getNode(bId)
    if (a.isDummy && !b.isDummy) return -1
    if (!a.isDummy && b.isDummy) return 1
    if (!a.isDummy) return a.id.localeCompare(b.id)
    const minA = a.edgeId ?? Seq(a.edgeIds).min()
    const minB = b.edgeId ?? Seq(b.edgeIds).min()
    return minA.localeCompare(minB)
  },

  /**
   * Does a first pass of assigning X and Y positions to nodes.
   * Nodes in each layer are ordered first by the order of their parents, and
   * then by comparing their natural ordering. The Y position is assigned based
   * on the layer index, and the X position is assigned based on the node index
   * within the layer.
   */
  _positionNodes() {
    for (const nodeId of this._dirtyNodes) {
      const node = this.nodes.get(nodeId)
      if (!node) continue
      const layerId = node.layerId
      this.dirtyLayers.add(layerId)
    }
    let adjustNext = false
    for (const layerId of this.layerList) {
      if (!adjustNext && !this.dirtyLayers.has(layerId)) continue
      adjustNext = false
      const layer = this.getLayer(layerId)
      const pidxs = new Map()
      for (const nodeId of layer.nodes)
        pidxs.set(nodeId, this._parentIndex(this.getNode(nodeId)))
      const sorted = [...layer.nodes].sort((a, b) => this._compareNodes(a, b, pidxs))
      if (layer.sorted && sorted.every((nodeId, i) => layer.sorted[i] == nodeId)) continue
      this.dirtyLayers.add(layerId)
      this.layers.set(layerId, { ...layer, sorted })
      adjustNext = true
      let lpos = 0
      for (let i = 0; i < sorted.length; i++) {
        const node = this.getNode(sorted[i])
        log.debug(`node ${node.id}: final index ${i}`)
        this.nodes.set(node.id, { ...node, index: i, lpos })
        const size = node.dims?.[this._width] ?? 0
        lpos += size + this.options.nodeMargin
      }
    }
  },


  /** 
   * Align the nodes based on either a specified procedure, or a default procedure,
   * which consists of a number of iterations of:
   * 
   *  - Align children to parents
   *  - Align parents to children
   *  - Compact layout
   */
  _alignAll() {
    if (this.options.layoutSteps !== undefined) {
      for (const step of this.options.layoutSteps)
        this[`_${step}`]()
    } else {
      for (let i = 0; i < this.options.alignIterations; i++) {
        let anyChanged =
          this._alignChildren() ||
          this._alignParents() ||
          this._compact()
        if (!anyChanged) break
      }
    }
    return this
  },

  // Align children to their parents.
  // 
  //  - Sweep layers first to last
  //  - Sweep nodes left to right
  //  - Move nodes only to the right
  //  - On overlap, shift the colliding nodes to the right
  _alignChildren() {
    return this._alignNodes(false, false, false, 'in', false)
  },

  // Align parents to their children.
  // 
  //  - Sweep layers last to first
  //  - Sweep nodes right to left
  //  - Move nodes only to the left
  //  - On overlap, abort the shift
  _alignParents() {
    return this._alignNodes(true, true, false, 'out', true)
  },

  /**
   * Aligns nodes in each layer, attempting to align child nodes
   * with their parents (or vice versa). If this causes nodes to overlap as
   * a result, they are pushed to the right (or left, depending on reverseMove).
   * However, if conservative is true, nodes will only be moved if they would
   * not cause a collision with another node.
   * 
   * "Aligned" means that the edge between the nodes is straight. This could mean
   * the nodes themselves are not aligned, if they have different anchor positions.
   * 
   * @param {boolean} reverseLayers - Whether to reverse the order of layers
   * @param {boolean} reverseNodes - Whether to reverse the order of nodes within each layer
   * @param {boolean} reverseMove - Whether to move nodes to the left or right
   * @param {'in' | 'out'} dir - Whether to align nodes based on incoming or outgoing edges
   * @param {boolean} conservative - Whether to move nodes only if they would not cause a collision
   */
  _alignNodes(reverseLayers, reverseNodes, reverseMove, dir, conservative) {
    let layerIds = [...this.layerList]
    let anyChanged = false
    if (reverseLayers) layerIds.reverse()
    let adjustNext = false
    for (const layerId of layerIds) {
      if (!adjustNext && !this.dirtyLayers.has(layerId)) continue
      adjustNext = false
      while (true) {
        let changed = false
        const nodeIds = this._sortLayer(layerId, reverseNodes)
        for (const nodeId of nodeIds) {
          const { isAligned, pos: newPos, nodeId: otherId } = this._nearestNode(nodeId, dir, reverseMove, !reverseMove)
          if (isAligned || (newPos === undefined)) continue
          if (this._shiftNode(nodeId, otherId, dir, newPos, reverseMove, conservative)) {
            changed = true
            anyChanged = true
            break
          }
        }
        if (!changed) break
        this.dirtyLayers.add(layerId)
        adjustNext = true
      }
    }
    return anyChanged
  },

  /**
   * Sort the nodes of a layer by their position and store
   * on layer.sorted. Return the sorted array, reversed if requested.
   * 
   * @param {string} layerId - The ID of the layer to sort
   * @param {boolean} reverseNodes - Whether to reverse the order of nodes within the layer
   * @returns {string[]} The sorted array of node IDs
   */
  _sortLayer(layerId, reverseNodes) {
    const layer = this.getLayer(layerId)
    const sorted = [...layer.nodes]
    sorted.sort((a, b) => this.getNode(a).lpos - this.getNode(b).lpos)
    if (!sorted.every((nodeId, i) => layer.sorted[i] == nodeId)) {
      this.dirtyLayers.add(layerId)
      this.layers.set(layerId, { ...layer, sorted })
      for (let i = 0; i < sorted.length; i++) {
        const node = this.getNode(sorted[i])
        if (node.index !== i)
          this.nodes.set(sorted[i], { ...node, index: i })
      }
    }
    if (reverseNodes)
      return sorted.toReversed()
    return sorted
  },

  /**
   * Find the nearest node in the given relation that is in the correct direction.
   * If the nearest is already aligned, return isAligned: true. Nearest means that the anchor
   * positions are close and in the right direction. Returns both the near node
   * and the position to which the given node should move in order to be aligned.
   * 
   * @param {string} nodeId - The ID of the node to find the nearest node for
   * @param {'in' | 'out'} dir - The direction to find the nearest node in
   * @param {boolean} allowLeft - Whether to allow the nearest node to be to the left of the given node
   * @param {boolean} allowRight - Whether to allow the nearest node to be to the right of the given node
   * @returns {{ nodeId: string, pos: number, isAligned: boolean }} The nearest node and the position to which the given node should move
   */
  _nearestNode(nodeId, dir, allowLeft, allowRight) {
    const node = this.getNode(nodeId)
    let minDist = Infinity
    let bestPos, bestNodeId
    const mySide = dir == 'in' ? 'target' : 'source'
    const altSide = dir == 'in' ? 'source' : 'target'
    for (const seg of this._rels(nodeId, 'segs', dir)) {
      const altId = seg[altSide].id
      const myPos = this._anchorPos(seg, mySide)[this._x]
      const altPos = this._anchorPos(seg, altSide)[this._x]
      const diff = altPos - myPos
      if (diff == 0) return { nodeId: altId, isAligned: true }
      if ((diff < 0) && !allowLeft) continue
      if ((diff > 0) && !allowRight) continue
      const dist = Math.abs(diff)
      if (dist < minDist) {
        minDist = dist
        bestNodeId = altId
        bestPos = node.lpos + diff
      }
    }
    return { nodeId: bestNodeId, pos: bestPos, isAligned: false }
  },

  /**
   * Get the anchor point for an edge connection on a node
   * 
   * @param {Object} seg - The segment to get the anchor point for
   * @param {'source' | 'target'} side - The side of the segment to get the anchor point for
   * @returns {{ x: number, y: number }} The anchor point
   */
  _anchorPos(seg, side) {
    const { _x, _y } = this
    const nodeId = seg[side].id
    const node = this.getNode(nodeId)
    let p = { [_x]: node.lpos, ...(node.pos || {}) }
    let w = node.dims?.[this._width] ?? 0
    let h = node.dims?.[this._height] ?? 0

    if (node.isDummy)
      return { [_x]: p[_x] + w / 2, [_y]: p[_y] + h / 2 }

    p[_x] += this._nodePortOffset(nodeId, seg[side].port)
    if ((side == 'source') == this._reverse)
      p[_y] += h

    return p
  },

  /**
   * Return an offset for a node's port; port is optional.
   * 
   * @param {string} nodeId - Node ID to check
   * @param {string} port - The port to compute offset for
   */
  _nodePortOffset(nodeId, port) {
    if (!port) return this.options.defaultPortOffset
    // TODO: figure out how user passes in port positions
    return this.options.defaultPortOffset
  },

  /** 
   * Shift the node to the given x position, pushing it to the right (or left, depending on reverseMove).
   * If conservative is true, nodes will only be moved if they would not cause a collision with another node.
   * If a collision does occur, recursively move collided nodes to find a valid position. 
   * If the shift is successful, this node and the aligned node are linked explicitly; if the aligned
   * node was already set, it is unlinked first.
   * 
   * @param {string} nodeId - ID of node to shift
   * @param {string} alignId - ID of node we're aligning to
   * @param {'in' | 'out'} dir - Direction of aligned node from this node
   * @param {number} lpos - Position within layer to shift node to
   * @param {boolean} reverseMove - Whether to move nodes to the left or right
   * @param {boolean} conservative - Whether to move nodes only if they would not cause a collision
   */
  _shiftNode(nodeId, alignId, dir, lpos, reverseMove, conservative) {
    const node = this.getNode(nodeId)
    if (!conservative)
      this._markAligned(nodeId, alignId, dir, lpos)
    const space = this.options.nodeMargin
    const nodeWidth = node.dims?.[this._width] ?? 0
    const aMin = lpos - space, aMax = lpos + nodeWidth + space
    repeat:
    for (const otherId of this.getLayer(node.layerId).nodes) {
      if (otherId == nodeId) continue
      const other = this.getNode(otherId)
      const opos = other.lpos
      const otherWidth = other.dims?.[this._width] ?? 0
      const bMin = opos, bMax = opos + otherWidth
      if (aMin < bMax && bMin < aMax) {
        if (conservative) return false
        const safePos = reverseMove ? aMin - otherWidth : aMax
        this._shiftNode(otherId, undefined, dir, safePos, reverseMove, conservative)
        continue repeat
      }
    }
    if (conservative)
      this._markAligned(nodeId, alignId, dir, lpos)
    return true
  },

  /**
   * Mark nodes as aligned, unlinking any existing alignment.
   * 
   * @param {string} nodeId - Node being aligned
   * @param {string} otherId - Node we're aligning to
   * @param {'in' | 'out'} dir - direction of other from node
   * @param {number} lpos - new layer position
   */
  _markAligned(nodeId, otherId, dir, lpos) {
    const node = this.getNode(nodeId)
    const alt = dir == 'in' ? 'out' : 'in'
    if (node.aligned[dir]) {
      const ex = this.getNode(node.aligned[dir])
      this.nodes.set(node.aligned[dir], { ...ex, aligned: { ...ex.aligned, [alt]: undefined } })
    }
    if (otherId) {
      const other = this.getNode(otherId)
      this.nodes.set(otherId, { ...other, aligned: { ...other.aligned, [alt]: nodeId } })
    }
    this.nodes.set(nodeId, { ...node, lpos, aligned: { [dir]: otherId, [alt]: undefined } })
  },

  /**
   * Iterate over all nodes aligned with the given node, including itself,
   * exactly once.
   * 
   * @param {string} nodeId - Node ID
   * @param {'in' | 'out' | 'both'} dir - direction of alignment
   * @returns {Iterator<Object>} Iterator over aligned nodes
   */
  *_aligned(nodeId, dir) {
    const visit = function* (node, dir) {
      const otherId = node.aligned[dir]
      if (!otherId) return
      const other = this.getNode(otherId)
      yield other
      yield* visit.call(this, other, dir)
    }.bind(this)
    const node = this.getNode(nodeId)
    yield node
    if (dir == 'both') {
      yield* visit(node, 'in')
      yield* visit(node, 'out')
    } else {
      yield* visit(node, dir)
    }
  },

  /** 
   * Get the node ID immediately to the left of the given node in the same layer
   * 
   * @param {Object} node - Node to get left of
   * @returns {string | null} Node ID to the left of the given node, or null if there is none
   */
  _leftOf(node) {
    if (node.index == 0) return null
    return this.getLayer(node.layerId).sorted[node.index - 1]
  },

  /**
   * Get the node id immediately to the right of the given node in the same layer
   * 
   * @param {Object} node - Node to get right of
   * @returns {string | null} Node ID to the right of the given node, or null if there is none
   */
  _rightOf(node) {
    const layer = this.getLayer(node.layerId)
    if (node.index == layer.sorted.length - 1) return null
    return layer.sorted[node.index + 1]
  },

  /**
   * Compact tries to eliminate empty space between nodes
   */
  _compact() {
    let anyChanged = false
    for (const layerId of this.layerList) {
      const layer = this.getLayer(layerId)
      if (layer.sorted.length < 2) continue
      for (const nodeId of layer.sorted) {
        const node = this.getNode(nodeId)
        if (node.index == 0) continue
        let minGap = Infinity
        const stack = []
        for (const right of this._aligned(nodeId, 'both')) {
          stack.push(right)
          const leftId = this._leftOf(right)
          if (!leftId) return
          const left = this.getNode(leftId)
          const leftWidth = left.dims?.[this._width] ?? 0
          const gap = right.lpos - left.lpos - leftWidth
          if (gap < minGap) minGap = gap
        }
        const delta = minGap - this.options.nodeMargin
        if (delta <= 0) continue
        anyChanged = true
        for (const right of stack)
          this.nodes.set(right.id, { ...right, lpos: right.lpos - delta })
      }
    }
    return anyChanged
  },

}