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
