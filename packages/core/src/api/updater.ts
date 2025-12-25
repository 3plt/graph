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

  addNodes(...nodes: any[]): Updater<N, E> {
    this.update.addNodes!.push(...nodes)
    return this
  }

  deleteNode(node: any): Updater<N, E> {
    this.update.removeNodes!.push(node)
    return this
  }

  deleteNodes(...nodes: any[]): Updater<N, E> {
    this.update.removeNodes!.push(...nodes)
    return this
  }

  updateNode(node: any): Updater<N, E> {
    this.update.updateNodes!.push(node)
    return this
  }

  updateNodes(...nodes: any[]): Updater<N, E> {
    this.update.updateNodes!.push(...nodes)
    return this
  }

  addEdge(edge: any): Updater<N, E> {
    this.update.addEdges!.push(edge)
    return this
  }

  addEdges(...edges: any[]): Updater<N, E> {
    this.update.addEdges!.push(...edges)
    return this
  }

  deleteEdge(edge: any): Updater<N, E> {
    this.update.removeEdges!.push(edge)
    return this
  }

  deleteEdges(...edges: any[]): Updater<N, E> {
    this.update.removeEdges!.push(...edges)
    return this
  }

  updateEdge(edge: any): Updater<N, E> {
    this.update.updateEdges!.push(edge)
    return this
  }

  updateEdges(...edges: any[]): Updater<N, E> {
    this.update.updateEdges!.push(...edges)
    return this
  }

  static add<N, E>(nodes: N[], edges: E[]): Updater<N, E> {
    const updater = new Updater<N, E>()
    updater.update.addNodes = nodes
    updater.update.addEdges = edges
    return updater
  }
}
