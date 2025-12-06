import { Map as IMap, List as IList, Set as ISet } from 'immutable'
import { defaultOptions } from './options'
import { GraphNodes } from './graph-nodes'
import { GraphEdges } from './graph-edges'
import { GraphLayers } from './graph-layers'
import { GraphAPI } from './graph-api'
import { GraphMutate } from './graph-mutate'
import { GraphCycle } from './graph-cycle'
import { GraphDummy } from './graph-dummy'

export class Graph {
  constructor({ prior, changes, options, nodes, edges } = {}) {
    this.nodes = prior?.nodes ?? IMap()
    this.edges = prior?.edges ?? IMap()
    this.layers = prior?.layers ?? IMap()
    this.layerList = prior?.layerList ?? IList()
    this.segs = prior?.segs ?? IMap()

    this.nextLayerId = prior?.nextLayerId ?? 0
    this.nextDummyId = prior?.nextDummyId ?? 0
    this._dirtyNodes = new Set()
    this._dirtyEdges = new Set()
    this.prior = prior
    this.options = {
      ...defaultOptions,
      ...(prior?.options ?? {}),
      ...(options ?? {}),
    }

    this.changes = changes ?? {
      addedNodes: [],
      removedNodes: [],
      addedEdges: [],
      removedEdges: [],
    }

    this.changes.addedNodes.push(...(nodes || []))
    this.changes.addedEdges.push(...(edges || []))

    this._dirty =
      this.changes.addedNodes.length > 0 ||
      this.changes.removedNodes.length > 0 ||
      this.changes.addedEdges.length > 0 ||
      this.changes.removedEdges.length > 0

    if (this._dirty) this._update()
  }
}

const mixins = [
  GraphNodes,
  GraphEdges,
  GraphLayers,
  GraphAPI,
  GraphMutate,
  GraphCycle,
  GraphDummy,
]

for (const mixin of mixins)
  Object.assign(Graph.prototype, mixin)