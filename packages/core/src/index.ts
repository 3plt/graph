export interface GraphNode {
  id: string;
  label?: string;
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface LayoutOptions {
  orientation?: 'horizontal' | 'vertical';
  nodeSpacing?: number;
  rankSpacing?: number;
}

export class Graph {
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, GraphEdge>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
  }

  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}

export function createGraph(data?: GraphData): Graph {
  const graph = new Graph();

  if (data) {
    data.nodes.forEach(node => graph.addNode(node));
    data.edges.forEach(edge => graph.addEdge(edge));
  }

  return graph;
}
