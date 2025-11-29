// Shared type definitions

export interface NodeProps {
  id: string
  inPorts?: string[]
  outPorts?: string[]
}

export interface EdgeProps {
  sourceId: string
  targetId: string
  label?: string
  sourcePort?: string
  targetPort?: string
}

export type NodeExtractor<N> = (node: N) => NodeProps
export type EdgeExtractor<E> = (edge: E) => EdgeProps
