import { Graph } from '../types/graph'
import { Node } from '../types/node'

export class Cycles {
  static info(g: Graph, node: Node) {
    return node.id
  }

  static checkCycles(g: Graph) {
    const totalNodes = g.nodes.size
    const newStuff = g.changes.addedNodes.length + g.changes.addedEdges.length
    const changeRatio = newStuff / totalNodes
    if (changeRatio > 0.2 || totalNodes < 20)
      Cycles.checkCyclesFull(g)
    else
      Cycles.checkCyclesIncremental(g)
  }

  private static checkCyclesFull(g: Graph) {
    const colorMap: Map<Node, number> = new Map()
    const parentMap: Map<Node, Node> = new Map()
    let start: Node | undefined, end: Node | undefined
    const white = 0, gray = 1, black = 2

    const visit = (node: Node) => {
      colorMap.set(node, gray)
      for (const next of node.outNodes(g)) {
        switch (colorMap.get(next) ?? white) {
          case gray:
            start = next
            end = node
            return true
          case white:
            parentMap.set(next, node)
            if (visit(next)) return true
        }
      }
      colorMap.set(node, black)
      return false
    }

    for (const node of g.getNodes())
      if ((colorMap.get(node) ?? white) == white)
        if (visit(node)) break

    if (!start || !end) return

    const cycle = [start]
    let node = end
    while (node != start) {
      cycle.push(node)
      node = parentMap.get(node)!
    }

    Cycles.throwCycle(g, cycle)
  }

  private static checkCyclesIncremental(g: Graph) {
    for (const edge of g.changes.addedEdges) {
      const source = g.getNode(edge.source.id)
      const target = g.getNode(edge.target.id)
      const layer1 = source.layerIndex(g)
      const layer2 = target.layerIndex(g)
      if (layer1 < layer2) continue
      const route = Cycles.findRoute(g, target, source)
      if (!route) continue
      Cycles.throwCycle(g, route)
    }
  }

  private static throwCycle(g: Graph, cycle: Node[]) {
    cycle.push(cycle[0])
    cycle.reverse()
    const info = cycle.map(node => Cycles.info(g, node))
    throw new Error(`Cycle detected: ${info.join(' → ')}`)
  }

  private static findRoute(g: Graph, source: Node, target: Node): Node[] | null {
    const parentMap: Map<Node, Node> = new Map()
    const queue = [source]
    const visited = new Set([source])

    while (queue.length > 0) {
      const node = queue.shift()!
      if (node == target) {
        const route = []
        let currNode = target
        while (currNode != source) {
          route.push(currNode)
          currNode = parentMap.get(currNode)!
        }
        route.push(source)
        route.reverse()
        return route
      }

      for (const next of node.outNodes(g)) {
        if (!visited.has(next)) {
          visited.add(next)
          parentMap.set(next, node)
          queue.push(next)
        }
      }
    }

    return null
  }
}