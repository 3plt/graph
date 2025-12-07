/**
 * @3plate/graph-react - React components for @3plate/graph graph visualization
 */

import type { Graph } from '@3plate/graph-core'

export interface GraphViewProps {
  graph: Graph<any, any>
  width?: number
  height?: number
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
}

// Placeholder - will be implemented with actual React component
export function GraphView(props: GraphViewProps) {
  // Placeholder component
  return null
}
