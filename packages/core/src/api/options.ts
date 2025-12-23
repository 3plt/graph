import {
  MergeOrder,
  NodeAlign,
  Orientation,
  LayoutStep,
  Pos,
  PortStyle,
} from '../common'
import { MarkerType } from '../canvas/marker'

/**
 * Arguments to the API constructor.
 *
 * The caller can specify nodes and edges, or history,
 * but not both.
 *
 * The root element ID is required.
 */
export type APIArguments<N, E> = {
  /** Options for the API */
  options?: APIOptions<N, E>
  /** Initial nodes */
  nodes?: N[]
  /** Initial edges */
  edges?: E[]
  /** Initial history */
  history?: Update<N, E>[]
  /** Events */
  events?: EventsOptions<N, E>
  /** Root element ID */
  root: string
}

/** Options for the API */
export type APIOptions<N, E> = {
  /** Options for the graph */
  graph?: GraphOptions
  /** Options for the canvas */
  canvas?: CanvasOptions<N>
  /** Options for node and edge properties */
  props?: PropsOptions<N, E>
}

/** Options for the graph */
export type GraphOptions = {
  /** Order in which edges are merged; see `MergeOrder` */
  mergeOrder?: MergeOrder
  /** Margin between nodes */
  nodeMargin?: number
  /** Size of dummy nodes */
  dummyNodeSize?: number
  /** Alignment of nodes */
  nodeAlign?: NodeAlign
  /** Spacing between edges */
  edgeSpacing?: number
  /** Turn radius */
  turnRadius?: number
  /** Orientation of the graph */
  orientation?: Orientation
  /** Margin between layers */
  layerMargin?: number
  /** Number of iterations for alignment */
  alignIterations?: number
  /** Alignment threshold */
  alignThreshold?: number
  /** Whether to separate track sets */
  separateTrackSets?: boolean
  /** Marker size */
  markerSize?: number
  /** Layout steps */
  layoutSteps?: LayoutStep[] | null
}

/**
 * Events that can be handled by the user.
 */
export type EventsOptions<N, E> = {
  /** Called when a node is clicked */
  nodeClick?: (node: N) => void
  /** Called when an edge is clicked */
  edgeClick?: (edge: E) => void
  /** Called when a node is double-clicked */
  editNode?: (node: N, callback: (node: N) => void) => void
  /** Called when a node should be added */
  newNode?: (callback: (node: N) => void) => void
  /** Called when an edge is double-clicked */
  editEdge?: (edge: E, callback: (edge: E) => void) => void
  /** Called when a node should be added */
  addNode?: (node: NewNode, callback: (node: N) => void) => void
  /** Called when an edge should be added */
  addEdge?: (edge: NewEdge<N>, callback: (edge: E) => void) => void
  /** Called when an edge should be removed */
  removeEdge?: (edge: E, callback: (remove: boolean) => void) => void
  /** Called when a node should be removed */
  removeNode?: (node: N, callback: (remove: boolean) => void) => void
  /** Called when a node should be updated */
  updateNode?: (node: N, update: Record<string, any>, callback: (node: N) => void) => void
  /** Called when an edge should be updated */
  updateEdge?: (edge: E, update: Record<string, any>, callback: (edge: E) => void) => void
  /** Called when history index/length changes */
  historyChange?: (index: number, length: number) => void
}

/** Function to render a node */
export type RenderNode<N> = (node: N, props?: NodeProps<N>) => HTMLElement

/** Color mode */
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

/** Options for the canvas */
export type CanvasOptions<N> = {
  /** Canvas width in pixels or percentage */
  width?: number | string
  /** Canvas height in pixels or percentage */
  height?: number | string
  /** Padding inside the canvas viewport */
  padding?: number
  /** Whether the canvas is editable */
  editable?: boolean
  /** Whether to enable pan and zoom */
  panZoom?: boolean
  /** Function to render a node */
  renderNode?: RenderNode<N>
  /** Color mode */
  colorMode?: ColorMode
  /** Theme */
  theme?: ThemeVars
  /** Node type themes */
  nodeTypes?: Record<string, ThemeVars>
  /** Edge type themes */
  edgeTypes?: Record<string, ThemeVars>
  /** Marker size in pixels */
  markerSize?: number
}

/** Options for node and edge properties */
export type PropsOptions<N, E> = {
  /** Function to get node properties */
  node?: GetNodeProps<N>
  /** Function to get edge properties */
  edge?: GetEdgeProps<N, E>
}

/** Border styling properties */
export type BorderStyle = {
  /** Border color */
  color?: string
  /** Border width */
  width?: number
  /** Border style */
  style?: string
  /** Border radius */
  radius?: number
}

/** Fill styling properties */
export type FillStyle = {
  /** Fill color */
  color?: string
  /** Fill opacity */
  opacity?: number
}

/** Shadow styling properties */
export type ShadowStyle = {
  /** Shadow color */
  color?: string
  /** Shadow blur radius */
  blur?: number
  /** Shadow offset */
  offset?: Pos
}

/** Edge styling properties */
export type EdgeStyle = {
  /** Edge stroke width */
  width?: number
  /** Edge stroke style */
  style?: string
  /** Edge stroke color */
  color?: string
  /** Turn radius */
  turnRadius?: number
  /** Marker type */
  marker?: {
    /** Source marker type */
    source?: MarkerType
    /** Target marker type */
    target?: MarkerType
  }
}

/** Node styling properties */
export type NodeStyle = {
  /** Border styling */
  border?: BorderStyle
  /** Fill styling */
  fill?: FillStyle
  /** Shadow styling */
  shadow?: ShadowStyle
  /** Port styling */
  portStyle?: PortStyle
}

/** Update to apply to the graph */
export type Update<N, E> = {
  /** Nodes to add */
  addNodes?: N[]
  /** Nodes to remove */
  removeNodes?: N[]
  /** Nodes to update */
  updateNodes?: N[]
  /** Edges to add */
  addEdges?: E[]
  /** Edges to remove */
  removeEdges?: E[]
  /** Edges to update */
  updateEdges?: E[]
  /** Description of the update */
  description?: string
}

/** Node properties */
export type NodeProps<N> = NewNode & {
  /** Node ID */
  id?: string
  /** Function to render a node */
  render?: RenderNode<N>
}

/** New node properties */
export type NewNode = {
  /** Node title */
  title?: string
  /** Node text */
  text?: string
  /** Node type */
  type?: string
  /** Node ports */
  ports?: {
    /** Input ports */
    in?: (string | PortProps)[],
    /** Output ports */
    out?: (string | PortProps)[]
  }
}

/** New edge properties */
export type NewEdge<N> = {
  /** Source node */
  source: { node: N, port?: string, marker?: MarkerType }
  target: { node: N, port?: string, marker?: MarkerType }
  type?: string
}

/** Edge end properties */
export type EdgeEnd<N> =
  /** Edge end node ID */
  string |
  /** Edge end node */
  N |
  /** Structured edge end with id */
  {
    /** Edge end node ID */
    id: string,
    /** Edge end port ID */
    port?: string,
    /** Edge end marker type */
    marker?: MarkerType
  } |
  /** Structured edge end with node object */
  {
    /** Edge end node object */
    node: N,
    /** Edge end port ID */
    port?: string,
    /** Edge end marker type */
    marker?: MarkerType
  }

/** Edge properties */
export type EdgeProps<N> = {
  /** Edge ID */
  id?: string
  /** Edge label */
  label?: string
  /** Edge source */
  source: EdgeEnd<N>
  /** Edge target */
  target: EdgeEnd<N>
  /** Edge type */
  type?: string
}

/** Port properties */
export type PortProps = {
  /** Port ID */
  id: string
  /** Port label */
  label?: string
}

/** Function to get node properties */
type GetNodeProps<N> = (node: N) => NodeProps<N>

/** Function to get edge properties */
type GetEdgeProps<N, E> = (edge: E) => EdgeProps<N>
