import { GraphPos } from '../common'

import styles from './newEdge.css?raw'

export type NewEdgeProps = {
  start: GraphPos
  end: GraphPos
}

/**
 * Renders the animated dashed line during new-edge creation mode.
 */
export function renderNewEdge({ start, end }: NewEdgeProps): SVGElement {
  return (
    <g className="g3p-new-edge-container">
      {/* Origin indicator */}
      <circle
        cx={start.x}
        cy={start.y}
        r={4}
        className="g3p-new-edge-origin"
      />
      {/* Animated dashed line */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        className="g3p-new-edge-line"
      />
      {/* End indicator */}
      <circle
        cx={end.x}
        cy={end.y}
        r={3}
        className="g3p-new-edge-end"
      />
    </g>
  ) as SVGElement
}
