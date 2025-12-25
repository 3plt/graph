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
 * Ingest class handles applying ingest messages to an API instance.
 * This is the core ingestion functionality, separate from UI concerns.
 */
export class Ingest<N, E> {
  constructor(public api: API<N, E>) { }

  /**
   * Apply an incoming ingest message to the API.
   * - snapshot: rebuild state from nodes/edges (clears prior history)
   * - update: apply incremental update
   * - history: initialize from a set of frames (clears prior history)
   */
  async apply(msg: IngestMessage<N, E>): Promise<void> {
    switch (msg.type) {
      case 'snapshot': {
        await this.api.replaceSnapshot(msg.nodes, msg.edges, msg.description)
        break
      }
      case 'update': {
        await this.api.update(u => {
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
        await this.api.replaceHistory(msg.frames)
        break
      }
    }
  }
}
