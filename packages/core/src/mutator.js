export class Mutator {
  constructor() {
    this.changes = {
      addedNodes: [],
      removedNodes: [],
      addedEdges: [],
      removedEdges: [],
    }
  }

  addNode(node) {
    this.changes.addedNodes.push(node)
  }

  addNodes(...nodes) {
    nodes.forEach(node => this.addNode(node))
  }

  addEdge(edge) {
    this.changes.addedEdges.push(edge)
  }

  addEdges(...edges) {
    edges.forEach(edge => this.addEdge(edge))
  }

  removeNode(node) {
    if (typeof (node) == 'string')
      this.changes.removedNodes.push({ id: node })
    else
      this.changes.removedNodes.push(node)
  }

  removeNodes(...nodes) {
    nodes.forEach(node => this.removeNode(node))
  }

  removeEdge(edge) {
    this.changes.removedEdges.push(edge)
  }

  removeEdges(...edges) {
    edges.forEach(edge => this.removeEdge(edge))
  }
}