import type { EdgeProps } from './types'
import type { GraphNode } from './node'

export type { EdgeProps, EdgeExtractor } from './types'

export class GraphEdge<N, E> {
  id: string
  props: EdgeProps
  data: E
  source: GraphNode<N, E>
  target: GraphNode<N, E>

  constructor(props: EdgeProps, data: E, source: GraphNode<N, E>, target: GraphNode<N, E>) {
    this.id = `${props.sourceId}-${props.targetId}`
    this.props = props
    this.data = data
    this.source = source
    this.target = target
  }
}
