import { PublicNodeData } from './node'
import { PublicEdgeData } from './edge'
import { Changes } from './graph'

export class Mutator {
  changes: Changes

  constructor() {
    this.changes = {
      addedNodes: [],
      removedNodes: [],
      updatedNodes: [],
      addedEdges: [],
      removedEdges: [],
      updatedEdges: [],
    }
  }

  describe(description: string) {
    this.changes.description = description
  }

  addNode(node: PublicNodeData) {
    this.changes.addedNodes.push(node)
  }

  addNodes(...nodes: PublicNodeData[]) {
    nodes.forEach(node => this.addNode(node))
  }

  removeNode(node: { id: string }) {
    this.changes.removedNodes.push(node)
  }

  removeNodes(...nodes: { id: string }[]) {
    nodes.forEach(node => this.removeNode(node))
  }

  updateNode(node: PublicNodeData) {
    this.changes.updatedNodes.push(node)
  }

  updateNodes(...nodes: PublicNodeData[]) {
    nodes.forEach(node => this.updateNode(node))
  }

  addEdge(edge: PublicEdgeData) {
    this.changes.addedEdges.push(edge)
  }

  addEdges(...edges: PublicEdgeData[]) {
    edges.forEach(edge => this.addEdge(edge))
  }

  removeEdge(edge: PublicEdgeData) {
    this.changes.removedEdges.push(edge)
  }

  removeEdges(...edges: PublicEdgeData[]) {
    edges.forEach(edge => this.removeEdge(edge))
  }

  updateEdge(edge: PublicEdgeData) {
    this.changes.updatedEdges.push(edge)
  }

  updateEdges(...edges: PublicEdgeData[]) {
    edges.forEach(edge => this.updateEdge(edge))
  }
}