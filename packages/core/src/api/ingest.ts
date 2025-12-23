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
      await api.rebuildFromSnapshot(msg.nodes, msg.edges, msg.description)
      break
    }
    case 'update': {
      await api.update(u => {
        if (msg.addNodes) u.addNodes?.(...msg.addNodes)
        if (msg.removeNodes) msg.removeNodes.forEach(n => u.deleteNode(n as any))
        if (msg.updateNodes) msg.updateNodes.forEach(n => u.updateNode(n))
        if (msg.addEdges) u.addEdges?.(...msg.addEdges)
        if (msg.removeEdges) msg.removeEdges.forEach(e => u.deleteEdge(e as any))
        if (msg.updateEdges) msg.updateEdges.forEach(e => u.updateEdge(e))
        if (msg.description) u.setDescription?.(msg.description)
      })
      break
    }
    case 'history': {
      await api.replaceHistory(msg.frames)
      break
    }
  }
}
