import { NodeId, NodeUserProps } from "./node"
import { EdgeUserProps } from "./edge"
import { Dims } from "./enums"

export interface MutatorChanges {
  addedNodes: NodeUserProps[]
  removedNodes: NodeUserProps[]
  updatedNodes: NodeUserProps[]
  addedEdges: EdgeUserProps[]
  removedEdges: EdgeUserProps[]
}

export class Mutator {
  changes: MutatorChanges

  constructor() {
    this.changes = {
      addedNodes: [],
      removedNodes: [],
      updatedNodes: [],
      addedEdges: [],
      removedEdges: [],
    }
  }

  addNode(node: NodeUserProps) {
    this.changes.addedNodes.push(node)
  }

  addNodes(...nodes: NodeUserProps[]) {
    nodes.forEach(node => this.addNode(node))
  }

  updateNode(node: { id: NodeId, dims?: Dims } | NodeId) {
    if (typeof node === 'string')
      this.changes.updatedNodes.push({ id: node } as NodeUserProps)
    else
      this.changes.updatedNodes.push(node as NodeUserProps)
  }

  updateNodes(...nodes: ({ id: NodeId, dims?: Dims } | NodeId)[]) {
    nodes.forEach(node => this.updateNode(node))
  }

  addEdge(edge: EdgeUserProps) {
    this.changes.addedEdges.push(edge)
  }

  addEdges(...edges: EdgeUserProps[]) {
    edges.forEach(edge => this.addEdge(edge))
  }

  removeNode(node: { id: NodeId } | NodeId) {
    if (typeof node === 'string')
      this.changes.removedNodes.push({ id: node } as NodeUserProps)
    else
      this.changes.removedNodes.push(node as NodeUserProps)
  }

  removeNodes(...nodes: (NodeUserProps | string)[]) {
    nodes.forEach(node => this.removeNode(node))
  }

  removeEdge(edge: EdgeUserProps) {
    this.changes.removedEdges.push(edge)
  }

  removeEdges(...edges: EdgeUserProps[]) {
    edges.forEach(edge => this.removeEdge(edge))
  }
}