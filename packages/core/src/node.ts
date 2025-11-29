import type { NodeProps } from './types'
import type { GraphEdge } from './edge'

export type { NodeProps, NodeExtractor } from './types'

export class GraphNode<N, E> {
  props: NodeProps
  data: N
  sourceMap: Map<GraphEdge<N, E>, GraphNode<N, E> | null> | undefined
  targetMap: Map<GraphEdge<N, E>, GraphNode<N, E> | null> | undefined
  prior: GraphNode<N, E> | undefined
  complete: boolean

  constructor(props: NodeProps, data: N) {
    this.props = props
    this.data = data
    this.sourceMap = new Map()
    this.targetMap = new Map()
    this.complete = true
  }

  *_walk(
    mapFn: (node: GraphNode<N, E>) => Map<GraphEdge<N, E>, GraphNode<N, E> | null> | undefined
  ): IterableIterator<GraphEdge<N, E>> {
    let current: GraphNode<N, E> | undefined = this
    const seen = new Set<string>()

    while (current) {
      const map = mapFn(current)
      if (map) {
        for (const [edge, node] of map) {
          if (!seen.has(edge.id)) {
            seen.add(edge.id)
            if (node !== null) {
              yield edge
            }
          }
        }
      }

      // Stop at keyframe
      if (current.complete) break
      current = current.prior
    }
  }

  sourceEdges(): IterableIterator<GraphEdge<N, E>> {
    return this._walk(node => node.sourceMap)
  }

  targetEdges(): IterableIterator<GraphEdge<N, E>> {
    return this._walk(node => node.targetMap)
  }

  *sourceNodes(): IterableIterator<GraphNode<N, E>> {
    for (const edge of this.sourceEdges()) {
      yield edge.source
    }
  }

  *targetNodes(): IterableIterator<GraphNode<N, E>> {
    for (const edge of this.targetEdges()) {
      yield edge.target
    }
  }
}
