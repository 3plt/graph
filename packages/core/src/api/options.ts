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

export type ColorMode = 'light' | 'dark' | 'system'

/** Canvas background and general colors */
export type CanvasTheme = {
  /** Canvas background color */
  bg?: string
  /** Shadow color for floating elements */
  shadow?: string
}

/** Node styling properties */
export type NodeTheme = {
  /** Node background color */
  bg?: string
  /** Node border color */
  border?: string
  /** Node border color on hover */
  borderHover?: string
  /** Node border color when selected */
  borderSelected?: string
  /** Node text color */
  text?: string
  /** Node secondary text color */
  textMuted?: string
}

/** Port styling properties */
export type PortTheme = {
  /** Port background color */
  bg?: string
  /** Port background color on hover */
  bgHover?: string
}

/** Edge styling properties */
export type EdgeTheme = {
  /** Edge stroke color */
  color?: string
}

/** Combined theme with all customizable properties */
export type ThemeVars = CanvasTheme & NodeTheme & PortTheme & EdgeTheme

export type CanvasOptions<N> = {
  width?: number | string
  height?: number | string
  /** Padding inside the canvas viewport (default: 20) */
  padding?: number
  classPrefix?: string
  markerSize?: number
  editable?: boolean
  panZoom?: boolean
  renderNode?: RenderNode<N>
  colorMode?: ColorMode
  theme?: ThemeVars
  nodeTypes?: Record<string, ThemeVars>
  edgeTypes?: Record<string, ThemeVars>
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
  type?: string
  ports?: {
    in?: (string | PortProps)[],
    out?: (string | PortProps)[]
  }
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
}

export type PortProps = {
  id: string
  label?: string
}

type GetNodeProps<N> = (node: N) => NodeProps<N>
type GetEdgeProps<N, E> = (edge: E) => EdgeProps<N>
