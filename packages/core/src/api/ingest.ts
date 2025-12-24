import { Update } from './options'
import { API } from './api'

export type SnapshotMessage<N, E> = {
  type: 'snapshot'
  nodes: N[]
  edges: E[]
  description?: string
}

export type UpdateMessage<N, E> = {
  type: 'update'
  description?: string
} & Update<N, E>

export type HistoryMessage<N, E> = {
  type: 'history'
  frames: Update<N, E>[]
}

export type IngestMessage<N, E> =
  | SnapshotMessage<N, E>
  | UpdateMessage<N, E>
  | HistoryMessage<N, E>

/**
 * Apply an incoming ingest message to the API.
 * - snapshot: rebuild state from nodes/edges (clears prior history)
 * - update: apply incremental update
 * - history: initialize from a set of frames (clears prior history)
 */
export async function applyIngestMessage<N, E>(
  api: API<N, E>,
  msg: IngestMessage<N, E>
): Promise<void> {
  switch (msg.type) {
    case 'snapshot': {
      await api.replaceSnapshot(msg.nodes, msg.edges, msg.description)
      break
    }
    case 'update': {
      await api.update(u => {
        if (msg.addNodes) u.addNodes(...msg.addNodes)
        if (msg.removeNodes) u.deleteNodes(...msg.removeNodes)
        if (msg.updateNodes) u.updateNodes(...msg.updateNodes)
        if (msg.addEdges) u.addEdges(...msg.addEdges)
        if (msg.removeEdges) u.deleteEdges(...msg.removeEdges)
        if (msg.updateEdges) u.updateEdges(...msg.updateEdges)
        if (msg.description) u.describe(msg.description)
      })
      break
    }
    case 'history': {
      await api.replaceHistory(msg.frames)
      break
    }
  }
}
