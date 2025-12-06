import { Graph } from './graph'
import { Mutator } from './mutator'

export const GraphAPI = {
  isEmpty() {
    return this.nodes.isEmpty()
  },

  numNodes() {
    return this.nodes.size
  },

  numEdges() {
    return this.edges.size
  },

  getNode(nodeId) {
    const node = this.nodes.get(nodeId)
    if (node) return node
    throw new Error(`cannot find node ${nodeId}`)
  },

  getEdge(edgeId) {
    const edge = this.edges.get(edgeId)
    if (edge) return edge
    throw new Error(`cannot find edge ${edgeId}`)
  },

  getSeg(segId) {
    const seg = this.segs.get(segId)
    if (seg) return seg
    throw new Error(`cannot find segment ${segId}`)
  },

  getLayer(layerId) {
    const layer = this.layers.get(layerId)
    if (layer) return layer
    throw new Error(`cannot find layer ${layerId}`)
  },

  hasNode(nodeId) {
    return this.nodes.has(nodeId)
  },

  hasEdge(edgeId) {
    return this.edges.has(edgeId)
  },

  withMutations(callback) {
    const mut = new Mutator()
    callback(mut)
    return new Graph({ prior: this, changes: mut.changes })
  },

  addNodes(...nodes) {
    return this.withMutations(mutator => {
      nodes.forEach(node => mutator.addNode(node))
    })
  },

  addNode(node) {
    return this.withMutations(mutator => {
      mutator.addNode(node)
    })
  },

  addEdges(...edges) {
    return this.withMutations(mutator => {
      edges.forEach(edge => mutator.addEdge(edge))
    })
  },

  addEdge(edge) {
    return this.withMutations(mutator => {
      mutator.addEdge(edge)
    })
  },

  removeNodes(...nodes) {
    return this.withMutations(mutator => {
      nodes.forEach(node => mutator.removeNode(node))
    })
  },

  removeNode(node) {
    return this.withMutations(mutator => {
      mutator.removeNode(node)
    })
  },

  removeEdges(...edges) {
    return this.withMutations(mutator => {
      edges.forEach(edge => mutator.removeEdge(edge))
    })
  },

  removeEdge(edge) {
    return this.withMutations(mutator => {
      mutator.removeEdge(edge)
    })
  },
}