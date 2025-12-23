import { logger } from '../../log'
import { Seq } from 'immutable'
import { Node, NodeId, PortId } from '../node'
import { Graph } from '../graph'
import { Dir, Side, Pos } from '../../common'
import { LayerId } from '../layer'
import { Seg } from '../seg'
import { MarkerType } from '../../canvas/marker'

const log = logger('layout')

export type LayoutStep = 'alignChildren' | 'alignParents' | 'compact'

export class Layout {
  static parentIndex(g: Graph, node: Node): number {
    const parents = Seq([...node.adjs(g, 'segs', 'in')])
    const pidx = parents.map(p => p.index).min()
    if (pidx !== undefined) return pidx
    return node.isDummy ? -Infinity : Infinity
  }

  static compareNodes(g: Graph, aId: NodeId, bId: NodeId, pidxs: Map<NodeId, number>): number {
    const ai = pidxs.get(aId)!
    const bi = pidxs.get(bId)!
    if (ai !== bi) return ai - bi
    const a = g.getNode(aId)
    const b = g.getNode(bId)
    if (a.isDummy && !b.isDummy) return -1
    if (!a.isDummy && b.isDummy) return 1
    if (!a.isDummy) return a.id.localeCompare(b.id)
    const minA = Seq(a.edgeIds).min()!
    const minB = Seq(b.edgeIds).min()!
    return minA.localeCompare(minB)
  }

  static positionNodes(g: Graph) {
    for (const nodeId of g.dirtyNodes)
      g.dirtyLayers.add(g.getNode(nodeId).layerId)
    let adjustNext = false
    for (const layerId of g.layerList) {
      if (!adjustNext && !g.dirtyLayers.has(layerId)) continue
      adjustNext = false
      let layer = g.getLayer(layerId)
      const pidxs: Map<NodeId, number> = new Map()
      for (const nodeId of layer.nodeIds)
        pidxs.set(nodeId, Layout.parentIndex(g, g.getNode(nodeId)))
      const sorted = [...layer.nodeIds].sort(
        (aId, bId) => Layout.compareNodes(g, aId, bId, pidxs))
      if (layer.hasSortOrder(sorted)) continue
      g.dirtyLayers.add(layerId)
      layer = layer.setSorted(g, sorted)
      adjustNext = true
      let lpos = 0
      for (let i = 0; i < sorted.length; i++) {
        let node = g.getNode(sorted[i])
        node = node.setIndex(g, i).setLayerPos(g, lpos)
        const size = node.dims?.[g.w] ?? 0
        let margin = node.margin(g)
        if (i + 1 < sorted.length) {
          const next = g.getNode(sorted[i + 1])
          margin = node.marginWith(g, next)
        }
        lpos += size + margin
      }
    }
  }

  static alignAll(g: Graph) {
    if (g.options.layoutSteps) {
      for (const step of g.options.layoutSteps)
        Layout[step](g)
    } else {
      for (let i = 0; i < g.options.alignIterations; i++) {
        let anyChanged =
          Layout.alignChildren(g) ||
          Layout.alignParents(g) ||
          Layout.compact(g)
        if (!anyChanged) break
      }
    }
  }

  static alignChildren(g: Graph) {
    return Layout.alignNodes(g, false, false, false, 'in', false)
  }

  static alignParents(g: Graph) {
    return Layout.alignNodes(g, true, true, false, 'out', true)
  }

  static alignNodes(
    g: Graph,
    reverseLayers: boolean,
    reverseNodes: boolean,
    reverseMove: boolean,
    dir: Dir,
    conservative: boolean
  ) {
    let layerIds = [...g.layerList]
    let anyChanged = false
    if (reverseLayers) layerIds.reverse()
    let adjustNext = false
    for (const layerId of layerIds) {
      if (!adjustNext && !g.dirtyLayers.has(layerId)) continue
      adjustNext = false
      let iterations = 0
      while (true) {
        if (++iterations > 10) {
          log.error(`alignNodes: infinite loop detected in layer ${layerId}`)
          break
        }
        let changed = false
        const nodeIds = Layout.sortLayer(g, layerId, reverseNodes)
        for (const nodeId of nodeIds) {
          const {
            isAligned,
            pos: newPos,
            nodeId: otherId
          } = Layout.nearestNode(g, nodeId, dir, reverseMove, !reverseMove)
          if (isAligned || (newPos === undefined)) continue
          if (Layout.shiftNode(g, nodeId, otherId, dir, newPos, reverseMove, conservative)) {
            changed = true
            anyChanged = true
            break
          }
        }
        if (!changed) break
        g.dirtyLayers.add(layerId)
        adjustNext = true
      }
    }
    return anyChanged
  }

  static sortLayer(g: Graph, layerId: LayerId, reverseNodes: boolean) {
    const layer = g.getLayer(layerId)
    const sorted = [...layer.nodeIds]
    sorted.sort((a, b) => g.getNode(a).lpos! - g.getNode(b).lpos!)
    layer.setSorted(g, sorted)
    if (reverseNodes)
      return sorted.toReversed()
    return sorted
  }

  static nearestNode(g: Graph, nodeId: NodeId, dir: Dir, allowLeft: boolean, allowRight: boolean) {
    const node = g.getNode(nodeId)
    let minDist = Infinity
    let bestPos, bestNodeId
    const mySide = dir == 'in' ? 'target' : 'source'
    const altSide = dir == 'in' ? 'source' : 'target'
    for (const seg of node.rels(g, 'segs', dir)) {
      const altId = seg[altSide].id
      const myPos = Layout.anchorPos(g, seg, mySide)[g.x]
      const altPos = Layout.anchorPos(g, seg, altSide)[g.x]
      const diff = altPos - myPos
      if (diff == 0) return { nodeId: altId, isAligned: true }
      if ((diff < 0) && !allowLeft) continue
      if ((diff > 0) && !allowRight) continue
      const dist = Math.abs(diff)
      if (dist < minDist) {
        minDist = dist
        bestNodeId = altId
        bestPos = node.lpos! + diff
      }
    }
    return { nodeId: bestNodeId, pos: bestPos, isAligned: false }
  }

  static anchorPos(g: Graph, seg: Seg, side: Side): Pos {
    const nodeId = seg[side].id
    const node = g.getNode(nodeId)
    let p = { [g.x]: node.lpos!, [g.y]: node.pos?.[g.y] ?? 0 } as Pos
    let w = node.dims?.[g.w] ?? 0
    let h = node.dims?.[g.h] ?? 0

    if (node.isDummy)
      return {
        [g.x]: p[g.x] + w / 2,
        [g.y]: p[g.y] + h / 2,
      } as Pos

    p[g.x] += Layout.nodePortOffset(g, nodeId, seg, side)
    if ((side == 'target') == g.r)
      p[g.y] += h

    return p
  }

  static nodePortOffset(g: Graph, nodeId: NodeId, seg: Seg, side: Side) {
    const node = g.getNode(nodeId)
    const dir = side == 'source' ? 'out' : 'in'
    const portId = seg[side].port
    let min = 0, size = node.dims?.[g.w] ?? 0

    if (portId) {
      const ports = node.ports?.[dir]
      const port = ports?.find(p => p.id === portId)
      if (port?.offset !== undefined) {
        min = port.offset
        size = port.size ?? 0
      }
    }

    const alt = side == 'source' ? 'target' : 'source'
    let segs = []
    const keyOf = (seg: Seg) => `${seg.type ?? ''}:${seg[side].marker ?? ''}`
    for (const segId of node.segs[dir])
      segs.push(g.getSeg(segId))
    if (portId) segs = segs.filter(s => s[side].port == portId)
    const groups = Object.groupBy(segs, s => keyOf(s))
    const posMap = new Map()
    for (const [key, segs] of Object.entries(groups)) {
      let pos = Infinity
      for (const seg of segs!) pos = Math.min(pos, seg.node(g, alt).lpos!)
      posMap.set(key, pos)
    }
    const keys = [...posMap.keys()].sort((a, b) => posMap.get(a)! - posMap.get(b)!)
    const gap = size / (keys.length + 1)
    const index = keys.indexOf(keyOf(seg))
    return min + (index + 1) * gap
  }

  static shiftNode(
    g: Graph,
    nodeId: NodeId,
    alignId: NodeId | undefined,
    dir: Dir,
    lpos: number,
    reverseMove: boolean,
    conservative: boolean
  ) {
    const node = g.getNode(nodeId)
    if (!conservative)
      Layout.markAligned(g, nodeId, alignId, dir, lpos)
    const nodeRight = lpos + node.width(g)
    repeat:
    for (const otherId of node.getLayer(g).nodeIds) {
      if (otherId == nodeId) continue
      const other = g.getNode(otherId)
      const margin = node.marginWith(g, other)
      // Calculate gap using proposed lpos, not current node.lpos
      const gap = (lpos < other.lpos!)
        ? other.lpos! - nodeRight
        : lpos - other.right(g)
      if (gap < margin) {
        if (conservative) return false
        const safePos = reverseMove ? lpos - other.width(g) - margin : nodeRight + margin
        Layout.shiftNode(g, otherId, undefined, dir, safePos, reverseMove, conservative)
        continue repeat
      }
    }
    if (conservative)
      Layout.markAligned(g, nodeId, alignId, dir, lpos)
    return true
  }

  static markAligned(g: Graph, nodeId: NodeId, otherId: NodeId | undefined, dir: Dir, lpos: number) {
    const node = g.getNode(nodeId)
    const alt = dir == 'in' ? 'out' : 'in'
    if (node.aligned[dir])
      g.getNode(node.aligned[dir]).setAligned(g, alt, undefined)
    if (otherId)
      g.getNode(otherId).setAligned(g, alt, nodeId)
    node.setAligned(g, dir, otherId).setLayerPos(g, lpos)
  }

  static *aligned(g: Graph, nodeId: NodeId, dir: Dir | 'both') {
    const visit = function* (node: Node, dir: Dir): Generator<Node> {
      const otherId = node.aligned[dir]
      if (!otherId) return
      const other = g.getNode(otherId)
      yield other
      yield* visit(other, dir)
    }
    const node = g.getNode(nodeId)
    yield node
    if (dir == 'both') {
      yield* visit(node, 'in')
      yield* visit(node, 'out')
    } else {
      yield* visit(node, dir)
    }
  }

  static leftOf(g: Graph, node: Node): NodeId | null {
    if (node.index == 0) return null
    return node.getLayer(g).sorted[node.index! - 1]
  }

  static rightOf(g: Graph, node: Node): NodeId | null {
    const layer = node.getLayer(g)
    if (node.index == layer.sorted.length - 1) return null
    return layer.sorted[node.index! + 1]
  }

  static compact(g: Graph) {
    let anyChanged = false
    for (const layerId of g.layerList) {
      const layer = g.getLayer(layerId)
      if (layer.sorted.length < 2) continue
      for (const [i, nodeId] of layer.sorted.entries()) {
        const node = g.getNode(nodeId)
        if (node.index == 0) continue
        let minGap = Infinity
        const stack = []
        let maxMargin = 0
        for (const right of Layout.aligned(g, nodeId, 'both')) {
          stack.push(right)
          const leftId = Layout.leftOf(g, right)
          if (!leftId) return
          const left = g.getNode(leftId)
          const leftWidth = left.dims?.[g.w] ?? 0
          const gap = right.lpos! - left.lpos! - leftWidth
          if (gap < minGap) minGap = gap
          // Use margin between right and its left neighbor
          const margin = right.marginWith(g, left)
          if (margin > maxMargin) maxMargin = margin
        }
        const delta = minGap - maxMargin
        if (delta <= 0) continue
        anyChanged = true
        for (const right of stack)
          right.setLayerPos(g, right.lpos! - delta)
      }
    }
    return anyChanged
  }

  static getCoords(g: Graph) {
    let pos = 0
    const dir = g.r ? -1 : 1
    const trackSep = Math.max(
      g.options.edgeSpacing,
      g.options.turnRadius
    )
    const marginSep = Math.max(
      g.options.edgeSpacing,
      g.options.layerMargin,
      g.options.turnRadius + g.options.markerSize
    )
    for (const layerId of g.layerList) {
      let layer = g.getLayer(layerId)
      let height: number
      if (g.dirtyLayers.has(layerId)) {
        height = Seq(layer.nodes(g)).map(node => node.dims?.[g.h] ?? 0).max() ?? 0
        layer = layer.setSize(g, height)
      } else height = layer.size
      for (const node of layer.nodes(g)) {
        if (!g.dirtyNodes.has(node.id) && pos == layer.pos) continue
        const npos: Pos = { [g.x]: node.lpos!, [g.y]: pos } as Pos
        if (!g.n) npos[g.y] += dir * height
        if (g.r == g.n) npos[g.y] -= node.dims?.[g.h] ?? 0
        node.setPos(g, npos)
      }
      layer = layer.setPos(g, pos)
      pos += dir * (height + marginSep)
      for (const track of layer.tracks) {
        for (const segId of track)
          g.getSeg(segId).setTrackPos(g, pos)
        pos += dir * trackSep
      }
      pos += dir * (marginSep - trackSep)
    }
  }
}