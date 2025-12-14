import { Update } from "./options"

export class Updater<N, E> {
  update: Update<N, E>

  constructor() {
    this.update = {
      addNodes: [],
      removeNodes: [],
      updateNodes: [],
      addEdges: [],
      removeEdges: [],
      updateEdges: [],
    }
  }

  describe(desc: string): Updater<N, E> {
    this.update.description = desc
    return this
  }

  addNode(node: any): Updater<N, E> {
    this.update.addNodes!.push(node)
    return this
  }

  deleteNode(node: any): Updater<N, E> {
    this.update.removeNodes!.push(node)
    return this
  }

  updateNode(node: any): Updater<N, E> {
    this.update.updateNodes!.push(node)
    return this
  }

  addEdge(edge: any): Updater<N, E> {
    this.update.addEdges!.push(edge)
    return this
  }

  deleteEdge(edge: any): Updater<N, E> {
    this.update.removeEdges!.push(edge)
    return this
  }

  updateEdge(edge: any): Updater<N, E> {
    this.update.updateEdges!.push(edge)
    return this
  }

  static add<N, E>(nodes: N[], edges: E[]): Updater<N, E> {
    const updater = new Updater<N, E>()
    updater.update.addNodes = nodes
    updater.update.addEdges = edges
    return updater
  }
}
