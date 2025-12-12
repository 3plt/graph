import { Set as ISet, Seq } from 'immutable'
import { Graph } from '../types/graph'
import { Node, NodeId } from '../types/node'
import { logger } from '../../log'
import { LayerId } from '../types/layer'

const log = logger('layers')

export class Layers {
  static updateLayers(g: Graph) {
    // phase 1: DFS to fix child layers based on parents
    // visit at least each dirty node
    const stack: NodeId[] = [...g.dirtyNodes]
      .map(id => g.getNode(id))
      .filter(node => !node.isDummy)
      .sort((a, b) => b.layerIndex(g) - a.layerIndex(g))
      .map(node => node.id)
    const phase2 = new Set(stack)
    const moved: Set<NodeId> = new Set()
    while (stack.length > 0) {
      let node = g.getNode(stack.pop()!)
      const curLayer = node.layerIndex(g)
      let correctLayer = 0
      const parents = node.inNodes(g)
      for (const parent of parents) {
        const pidx = parent.layerIndex(g)
        if (pidx >= correctLayer) correctLayer = pidx + 1
      }
      // if needs a move, move it and push children to stack
      // also add parents to phase 2
      if (curLayer != correctLayer) {
        node = node.moveToLayerIndex(g, correctLayer)
        stack.push(...node.outNodeIds(g))
        moved.add(node.id)
        for (const parent of parents)
          phase2.add(parent.id)
      }
    }
    // phase 2: reverse topo order to fix parents based on children
    const byLayer: Map<LayerId, Set<NodeId>> = new Map()
    // start by grouping by layer
    const addParent = (nodeId: NodeId) => {
      let set: Set<NodeId>
      const layerId = g.getNode(nodeId).layerId
      if (!byLayer.has(layerId)) {
        set = new Set()
        byLayer.set(layerId, set)
      } else {
        set = byLayer.get(layerId)!
      }
      set.add(nodeId)
    }
    for (const id of phase2) addParent(id)
    // take layers in reverse topo order
    const layerIds = [...byLayer.keys()].sort(
      (a, b) => g.getLayer(b).index - g.getLayer(a).index)
    for (const layerId of layerIds) {
      const curLayer = g.getLayer(layerId).index
      // visit each parent of this layer
      for (const parentId of byLayer.get(layerId)!) {
        let parent = g.getNode(parentId)
        const children = [...parent.outNodes(g)]
        if (children.length == 0) continue
        // should be just above min child
        const minChild = Seq(children).map(node => node.layerIndex(g)).min()!
        const correctLayer = minChild - 1
        // if needs a move, move it and push parents to stack
        if (curLayer != correctLayer) {
          moved.add(parentId)
          parent = parent.moveToLayerIndex(g, correctLayer)
          for (const gpId of parent.inNodeIds(g))
            addParent(gpId)
        }
      }
    }
    // mark edges as dirty
    for (const id of moved)
      for (const edgeId of g.getNode(id).relIds('edges'))
        g.dirtyEdges.add(edgeId)
  }
}