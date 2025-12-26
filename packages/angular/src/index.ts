/**
 * @3plate/graph-angular - Angular components for @3plate/graph graph visualization
 */

export { GraphComponent } from './graph.component'
export { PlaygroundComponent } from './playground.component'

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
