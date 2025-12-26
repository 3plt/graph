import { API } from './api/api'
import { APIArguments } from './api/options'

export async function graph<N, E>(args: APIArguments<N, E> = { root: 'app' }) {
  const api = new API<N, E>(args)
  await api.init()
  return api
}

export default graph

export * from './api/ingest'
export * from './api/sources/WebSocketSource'
export * from './api/sources/FileSystemSource'
export * from './api/sources/FileSource'
export * from './playground'

// Export API types
export type { API } from './api/api'
export type {
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
  // Theming types
  ColorMode,
  ThemeVars,
  CanvasTheme,
  NodeTheme,
  PortTheme,
  EdgeTheme,
} from './api/options'
export { Updater } from './api/updater'

// Export common types
export type { Orientation, NodeAlign, PortStyle } from './common'
