import { Set as ISet } from 'immutable'
import { logger } from './log'

const log = logger('dummy')

export const GraphDummy = {
  /**
   * Update dummy nodes and segments. Dummy nodes are inserted along
   * edges that span multiple layers. Segments are one-hop connections
   * between adjacent layers. Edges store an array of their segment IDs.
   * Since segments can be re-used once dummies are merged, the segments
   * also store a set of the edges that use them.
   */
  _updateDummies() {
    // check all dirty edges to see if they need segments added or removed
    for (const edgeId of this._dirtyEdges) {
      const edge = this.getEdge(edgeId)
      const { type } = edge
      const sourceLayer = this._nodeLayerIndex(edge.source.id)
      const targetLayer = this._nodeLayerIndex(edge.target.id)
      let segIndex = 0
      let changed = false
      let source = edge.source
      // adjust edge segments
      const segs = edge.segs
      // loop over layers between source and target
      for (let layerIndex = sourceLayer + 1; layerIndex <= targetLayer; layerIndex++) {
        const layer = this._layerAtIndex(layerIndex)
        // update segments until the current layer is reached
        while (true) {
          const segId = segs[segIndex]
          let seg = segId ? this.getSeg(segId) : null
          const segLayer = seg ? this._nodeLayerIndex(seg.target.id) : null
          if (segIndex == segs.length || segLayer > layerIndex) {
            // either a gap existed, or we reached the end; either way, add a new segment
            let target
            if (layerIndex == targetLayer) {
              target = edge.target
            } else {
              const dummy = this._addDummy({
                edgeId,
                layerId: layer.id,
              })
              target = { ...target, id: dummy.id }
            }
            seg = this._addSeg({ source, target, type, edges: ISet([edgeId]) })
            log.debug(`edge ${edgeId}: adding segment ${seg.id} from ${source.id} at layer ${layerIndex - 1} to ${target.id} at layer ${layerIndex}`)
            segs.splice(segIndex, 0, seg.id)
            changed = true
          } else if (
            segLayer < layerIndex ||
            seg.source.id != source.id ||
            seg.source.port != source.port ||
            layerIndex == targetLayer && (
              seg.target.id != edge.target.id ||
              seg.target.port != edge.target.port
            )
          ) {
            log.debug(`edge ${edgeId}: removing segment ${seg.id} from layer ${layerIndex - 1} to layer ${layerIndex}`)
            this._segDeleteEdge(segId, edgeId)
            segs.splice(segIndex, 1)
            changed = true
            continue
          }
          // advance to next segment, keep track of source id chain
          source = seg.target
          segIndex++
          break
        }
      }
      // remove any remaining segments
      while (segIndex < segs.length) {
        log.debug(`edge ${edgeId}: removing trailing segment ${segs[segIndex]}`)
        this._segDeleteEdge(segs[segIndex], edgeId)
        segs.splice(segIndex, 1)
        changed = true
        segIndex++
      }
      // update edge with new segments if a change occurred
      if (changed) {
        log.debug(`edge ${edgeId}: updated segments to ${segs.join(', ')}`)
        this.edges.set(edgeId, { ...edge, segs })
      }
    }
  },

  _mergeDummies() {
    for (const side of this.options.mergeOrder)
      this._mergeScan(side)
  },

  _mergeScan(side) {
    let layers = [...this.layerList]
    if (side == 'target') layers.reverse()
    const dir = side == 'source' ? 'in' : 'out'
    const altSide = side == 'source' ? 'target' : 'source'
    const altDir = altSide == 'source' ? 'in' : 'out'
    log.debug(`merging dummies by ${side}`)
    for (const layerId of layers) {
      let layer = this.layers.get(layerId)
      const groups = new Map()
      for (const nodeId of layer.nodes) {
        if (!this._isDummyId(nodeId)) continue
        const node = this.getNode(nodeId)
        if (node.merged) continue
        const edge = this.getEdge(node.edgeId)
        const key = this._edgeSegId(edge, 'k', side)
        if (!groups.has(key)) groups.set(key, new Set())
        groups.get(key).add(node)
      }
      for (const [key, group] of groups) {
        if (group.size == 1) continue
        const edgeIds = [...group].map(node => node.edgeId)
        const dummy = this._addDummy({ edgeIds, merged: true })
        this._layerAddNode(layerId, dummy.id)
        let seg
        for (const old of group) {
          for (const segId of this._relIds(old.id, 'segs', dir)) {
            if (!seg) {
              const example = this.getSeg(segId)
              seg = this._addSeg({
                ...example,
                edges: ISet([old.edgeId]),
                [altSide]: { ...example[altSide], id: dummy.id },
              })
            }
            this._edgeReplaceSeg(old.edgeId, segId, seg.id)
          }
        }
        for (const old of group) {
          for (const segId of this._relIds(old.id, 'segs', altDir)) {
            const example = this.getSeg(segId)
            const seg = this._addSeg({
              ...example,
              edges: ISet([old.edgeId]),
              [side]: { ...example[side], id: dummy.id },
            })
            this._edgeReplaceSeg(old.edgeId, segId, seg.id)
          }
          this._deleteNode(old.id)
        }
      }
    }
  },
}