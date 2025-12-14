import { Set as ISet } from 'immutable'
import { Node } from '../node'
import { Edge } from '../edge'
import { logger } from '../../log'
import { Seg } from '../seg'
import { Graph } from '../graph'
import { Side } from '../../common'

const log = logger('dummy')

export class Dummy {
  static updateDummies(g: Graph) {
    // check all dirty edges to see if they need segments added or removed
    for (const edgeId of g.dirtyEdges) {
      const edge = g.getEdge(edgeId)
      const { type, style } = edge
      const sourceLayer = edge.sourceNode(g).layerIndex(g)
      const targetLayer = edge.targetNode(g).layerIndex(g)
      let segIndex = 0
      let changed = false
      let source = edge.source
      // adjust edge segments
      const segs = edge.segIds
      // loop over layers between source and target
      for (let layerIndex = sourceLayer + 1; layerIndex <= targetLayer; layerIndex++) {
        const layer = g.layerAt(layerIndex)
        // update segments until the current layer is reached
        while (true) {
          const segId = segs[segIndex]
          let seg = segId ? g.getSeg(segId) : null
          const segLayer = seg ? seg.targetNode(g).layerIndex(g) : null
          if (segIndex == segs.length || segLayer! > layerIndex) {
            // either a gap existed, or we reached the end; either way, add a new segment
            let target: Edge['target']
            if (layerIndex == targetLayer) {
              target = edge.target
            } else {
              const dummy = Node.addDummy(g, {
                edgeIds: [edgeId],
                layerId: layer.id,
              })
              target = { id: dummy.id }
            }
            seg = Seg.add(g, { source, target, type, style, edgeIds: ISet([edgeId]) })
            segs.splice(segIndex, 0, seg.id)
            changed = true
          } else if (
            segLayer! < layerIndex ||
            seg!.source.id != source.id ||
            seg!.source.port != source.port ||
            layerIndex == targetLayer && (
              seg!.target.id != edge.target.id ||
              seg!.target.port != edge.target.port
            )
          ) {
            seg = seg!.delEdgeId(g, edgeId)
            segs.splice(segIndex, 1)
            changed = true
            continue
          }
          // advance to next segment, keep track of source id chain
          source = seg!.target
          segIndex++
          break
        }
      }
      // remove any remaining segments
      while (segIndex < segs.length) {
        g.getSeg(segs[segIndex]).delEdgeId(g, edgeId)
        segs.splice(segIndex, 1)
        changed = true
        segIndex++
      }
      // update edge with new segments if a change occurred
      if (changed) {
        edge.setSegIds(g, segs)
      }
    }
  }

  static mergeDummies(g: Graph) {
    for (const side of g.options.mergeOrder)
      Dummy.mergeScan(g, side)
  }

  static mergeScan(g: Graph, side: Side) {
    // find dirty layers
    let layerIds = [...g.layerList]
      .filter(layerId => g.dirtyLayers.has(layerId))
    if (side == 'target') layerIds.reverse()
    const dir = side == 'source' ? 'in' : 'out'
    const altSide = side == 'source' ? 'target' : 'source'
    const altDir = altSide == 'source' ? 'in' : 'out'
    for (const layerId of layerIds) {
      // for each layer, we'll find merge-able dummy nodes
      let layer = g.getLayer(layerId)
      const groups: Map<string, Set<Node>> = new Map()
      // group layer dummies by edge-based keys
      for (const nodeId of layer.nodeIds) {
        if (!Node.isDummyId(nodeId)) continue
        const node = g.getNode(nodeId)
        if (node.isMerged) continue
        const edge = g.getEdge(node.edgeIds[0])
        const key = Edge.key(edge, 'k:', side)
        if (!groups.has(key)) groups.set(key, new Set())
        groups.get(key)!.add(node)
      }
      // for each group, we'll merge the dummies
      for (const [key, group] of groups) {
        if (group.size == 1) continue
        const edgeIds = [...group].map(node => node.edgeId)
        const dummy = Node.addDummy(g, { edgeIds, layerId, isMerged: true })
        let seg: Seg | undefined
        // all 'in' segs are merged into a single new in seg
        for (const old of group) {
          let edge = g.getEdge(old.edgeIds[0])
          for (const segId of old.relIds('segs', dir)) {
            if (!seg) {
              const example = g.getSeg(segId)
              seg = Seg.add(g, {
                ...example,
                edgeIds: ISet([old.edgeId]),
                [altSide]: { ...example[altSide], id: dummy.id },
              })
            }
            edge = edge.replaceSegId(g, segId, seg.id)
          }
        }
        // all 'out' segs are replaced with individual new out segs
        for (const old of group) {
          let edge = g.getEdge(old.edgeIds[0])
          for (const segId of old.relIds('segs', altDir)) {
            const example = g.getSeg(segId)
            const seg = Seg.add(g, {
              ...example,
              edgeIds: ISet([old.edgeId]),
              [side]: { ...example[side], id: dummy.id },
            })
            edge = edge.replaceSegId(g, segId, seg.id)
          }
        }
      }
    }
  }
}