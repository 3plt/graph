/**
 * React SteadyFlow - React components for SteadyFlow graph visualization
 */

import { Graph, GraphData, LayoutOptions } from 'steadyflow'

export interface GraphViewProps {
  graph: Graph
  width?: number
  height?: number
  layoutOptions?: LayoutOptions
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
}

// Placeholder - will be implemented with actual React component
export function GraphView(props: GraphViewProps): null {
  // TODO: Implement React component
  return null
}

export { Graph, GraphData, LayoutOptions, createGraph } from 'steadyflow'
