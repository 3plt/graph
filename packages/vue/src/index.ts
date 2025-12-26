/**
 * @3plate/graph-vue - Vue components for @3plate/graph graph visualization
 */

// Components
export { Graph } from './Graph'
export { Playground } from './Playground'

// Types
export type { GraphProps } from './Graph'
export type { PlaygroundProps } from './Playground'

// Re-export types from core for convenience
export type {
  // API types
  API,
  APIArguments,
  APIOptions,
  Update,
  IngestionConfig,
  EventsOptions,
  // Callback parameter types
  NewNode,
  NewEdge,
  NodeProps,
  EdgeProps,
  PortProps,
  RenderNode,
  // Ingestion types
  IngestMessage,
  SnapshotMessage,
  UpdateMessage,
  HistoryMessage,
  // WebSocket types
  WebSocketStatus,
  WebSocketStatusListener,
  // Theming types
  ColorMode,
  ThemeVars,
  CanvasTheme,
  NodeTheme,
  PortTheme,
  EdgeTheme,
  // Common types
  Orientation,
  NodeAlign,
  PortStyle,
} from '@3plate/graph-core'
