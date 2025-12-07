import { Map as IMap, List as IList, Set as ISet } from 'immutable'
import { defaultOptions } from './options'
import { GraphNodes } from './graph-nodes'
import { GraphEdges } from './graph-edges'
import { GraphLayers } from './graph-layers'
import { GraphAPI } from './graph-api'
import { GraphMutate } from './graph-mutate'
import { GraphCycle } from './graph-cycle'
import { GraphDummy } from './graph-dummy'
import { GraphPos } from './graph-pos'

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
    this.dirtyLayers = new Set()
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

    // Set orientation-based properties
    this._reverse = this.options.orientation === 'BT' || this.options.orientation === 'RL'
    this._vertical = this.options.orientation === 'TB' || this.options.orientation === 'BT'
    this._height = this._vertical ? 'height' : 'width'
    this._width = this._vertical ? 'width' : 'height'
    this._x = this._vertical ? 'x' : 'y'
    this._y = this._vertical ? 'y' : 'x'
    this._d = {
      x: this._vertical ? 0 : (this._reverse ? -1 : 1),
      y: this._vertical ? (this._reverse ? -1 : 1) : 0,
    }

    // _natural means the node alignment follows the natural orientation
    // For each orientation, we map it to the corresponding alignment
    const natAligns = { TB: 'top', BT: 'bottom', LR: 'left', RL: 'right' };
    if (this.options.nodeAlign == 'natural')
      this._natural = true
    else
      this._natural = natAligns[this.options.orientation] == this.options.nodeAlign

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
  GraphPos,
]

for (const mixin of mixins)
  Object.assign(Graph.prototype, mixin)