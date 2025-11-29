import type { GraphNode } from './node'
import type { GraphEdge } from './edge'

export class Graph<N, E> {
  nodeMap: Map<string, GraphNode<N, E> | null> | undefined
  edgeMap: Map<string, GraphEdge<N, E> | null> | undefined
  prior: Graph<N, E> | undefined
  complete: boolean
  numNodes: number
  numEdges: number

  constructor() {
    this.nodeMap = new Map()
    this.edgeMap = new Map()
    this.numNodes = 0
    this.numEdges = 0
    this.complete = true
  }

  isEmpty() {
    return this.numNodes === 0 && this.numEdges === 0
  }

  // Generic function to walk backwards through the chain of graphs,
  // yielding objects from each graph until hitting a keyframe
  *_walk<T>(mapFn: (graph: Graph<N, E>) => Map<string, T | null> | undefined): IterableIterator<T> {
    const seen = new Set<string>()
    let current: Graph<N, E> | undefined = this

    // Walk backwards through the chain
    while (current) {
      const map = mapFn(current)
      if (map) {
        for (const [id, node] of map) {
          if (!seen.has(id)) {
            seen.add(id)
            if (node !== null) {
              yield node
            }
          }
        }
      }

      // Stop at keyframe
      if (current.complete) break
      current = current.prior
    }
  }

  // Return iterator over current graph nodes
  nodes(): IterableIterator<GraphNode<N, E>> {
    return this._walk(graph => graph.nodeMap)
  }

  // Return iterator over current graph edges
  edges(): IterableIterator<GraphEdge<N, E>> {
    return this._walk(graph => graph.edgeMap)
  }

  // Get a specific node by id (walks back through the chain)
  getNode(id: string): GraphNode<N, E> | undefined {
    let current: Graph<N, E> | undefined = this

    while (current) {
      const node = current.nodeMap?.get(id)
      if (node === null) return undefined
      else if (node !== undefined) return node
      if (current.complete) break
      current = current.prior
    }

    return undefined
  }

  // Get a specific edge by id (walks back through the chain)
  getEdge(id: string): GraphEdge<N, E> | undefined {
    let current: Graph<N, E> | undefined = this

    while (current) {
      const edge = current.edgeMap?.get(id)
      if (edge === null) return undefined
      else if (edge !== undefined) return edge
      if (current.complete) break
      current = current.prior
    }

    return undefined
  }

  // Check if a node exists and is not deleted
  hasNode(id: string): boolean {
    const node = this.getNode(id)
    return node !== undefined
  }

  // Check if an edge exists and is not deleted
  hasEdge(id: string): boolean {
    const edge = this.getEdge(id)
    return edge !== undefined
  }
}
