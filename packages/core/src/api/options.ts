import {
  MergeOrder,
  NodeAlign,
  Orientation,
  LayoutStep,
  Pos,
  PortStyle,
} from '../common'
import { MarkerType } from '../canvas/marker'

export type APIArguments<N, E> = {
  options?: APIOptions<N, E>
  nodes?: N[]
  edges?: E[]
  history?: Update<N, E>[]
  root: string
}

export type APIOptions<N, E> = {
  graph?: GraphOptions
  canvas?: CanvasOptions<N>
  props?: PropsOptions<N, E>
}

export type GraphOptions = {
  mergeOrder?: MergeOrder
  nodeMargin?: number
  dummyNodeSize?: number
  nodeAlign?: NodeAlign
  edgeSpacing?: number
  turnRadius?: number
  orientation?: Orientation
  layerMargin?: number
  alignIterations?: number
  alignThreshold?: number
  separateTrackSets?: boolean
  markerSize?: number
  layoutSteps?: LayoutStep[] | null
}

export type RenderNode<N> = (node: N) => HTMLElement

export type CanvasOptions<N> = {
  width?: number | string
  height?: number | string
  nodeStyle?: NodeStyle
  edgeStyle?: EdgeStyle
  classPrefix?: string
  markerSize?: number
  editable?: boolean
  panZoom?: boolean
  renderNode?: RenderNode<N>
}

export type PropsOptions<N, E> = {
  node?: GetNodeProps<N>
  edge?: GetEdgeProps<N, E>
}

export type BorderStyle = {
  color?: string
  width?: number
  style?: string
  radius?: number
}

export type FillStyle = {
  color?: string
  opacity?: number
}

export type ShadowStyle = {
  color?: string
  blur?: number
  offset?: Pos
}

export type EdgeStyle = {
  width?: number
  style?: string
  color?: string
  turnRadius?: number
  classPrefix?: string
  marker?: {
    source?: MarkerType
    target?: MarkerType
  }
}

export type NodeStyle = {
  border?: BorderStyle
  fill?: FillStyle
  shadow?: ShadowStyle
  portStyle?: PortStyle
  classPrefix?: string
}

export type Update<N, E> = {
  addNodes?: N[]
  removeNodes?: N[]
  updateNodes?: N[]
  addEdges?: E[]
  removeEdges?: E[]
  updateEdges?: E[]
  description?: string
}

export type NodeProps<N> = {
  id?: string
  title?: string
  text?: string
  ports?: {
    in?: (string | PortProps)[],
    out?: (string | PortProps)[]
  }
  style?: NodeStyle
  render?: RenderNode<N>
}

export type EdgeEnd<N> =
  string |
  N |
  { id: string, port?: string, marker?: MarkerType } |
  { node: N, port?: string, marker?: MarkerType }

export type EdgeProps<N> = {
  id?: string
  label?: string
  source: EdgeEnd<N>
  target: EdgeEnd<N>
  type?: string
  style?: EdgeStyle
}

export type PortProps = {
  id: string
  label?: string
}

type GetNodeProps<N> = (node: N) => NodeProps<N>
type GetEdgeProps<N, E> = (edge: E) => EdgeProps<N>
