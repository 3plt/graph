/**
 * Shared example library for the demo site.
 * Each example defines nodes, edges, and optional canvas options.
 * These drive both the playground and the front page demos.
 */

export type ExampleNode = string | {
  id: string
  title?: string
  type?: string
  ports?: { in?: string[], out?: string[] }
}

export type ExampleEdgeEnd = string | {
  id: string
  port?: string
  marker?: 'arrow' | 'circle' | 'diamond' | 'bar'
}

export type ExampleEdge = string | {
  source: ExampleEdgeEnd
  target: ExampleEdgeEnd
  type?: string
}

export type ExampleOptions = {
  canvas?: {
    colorMode?: 'light' | 'dark' | 'system'
    nodeTypes?: Record<string, Record<string, string>>
    edgeTypes?: Record<string, Record<string, string>>
  }
}

export type Example = {
  name: string
  description: string
  nodes: ExampleNode[]
  edges: ExampleEdge[]
  options?: ExampleOptions
}

export const examples: Record<string, Example> = {
  diamond: {
    name: 'Diamond',
    description: 'Simple diamond-shaped graph',
    nodes: ['a', 'b', 'c', 'd'],
    edges: ['a->b', 'a->c', 'b->d', 'c->d'],
  },

  ports: {
    name: 'Ports',
    description: 'Nodes with input/output ports',
    nodes: [
      { id: 'a', ports: { out: ['x', 'y'] } },
      'b',
      'c',
      { id: 'd', ports: { in: ['x', 'y'] } },
    ],
    edges: [
      { source: { id: 'a', port: 'x' }, target: 'b' },
      { source: { id: 'a', port: 'y' }, target: 'c' },
      { source: 'b', target: { id: 'd', port: 'x' } },
      { source: 'c', target: { id: 'd', port: 'y' } },
    ],
  },

  markers: {
    name: 'Markers',
    description: 'Edges with different marker styles',
    nodes: ['a', 'b', 'c', 'd'],
    edges: [
      { source: { id: 'a', marker: 'arrow' }, target: { id: 'b', marker: 'arrow' } },
      { source: { id: 'a', marker: 'circle' }, target: { id: 'c', marker: 'diamond' } },
      { source: { id: 'b', marker: 'diamond' }, target: { id: 'd', marker: 'bar' } },
      { source: { id: 'c', marker: 'bar' }, target: { id: 'd', marker: 'circle' } },
    ],
  },

  pipeline: {
    name: 'Pipeline',
    description: 'Data processing pipeline with ports',
    nodes: [
      { id: 'source', ports: { out: ['a', 'b', 'c'] } },
      { id: 'p1' },
      { id: 'p2' },
      { id: 'p3' },
      { id: 'sink', ports: { in: ['a', 'b', 'c'] } },
    ],
    edges: [
      { source: { id: 'source', port: 'a' }, target: 'p1' },
      { source: { id: 'source', port: 'b' }, target: 'p2' },
      { source: { id: 'source', port: 'c' }, target: 'p3' },
      { source: 'p1', target: { id: 'sink', port: 'a' } },
      { source: 'p2', target: { id: 'sink', port: 'b' } },
      { source: 'p3', target: { id: 'sink', port: 'c' } },
    ],
  },

  themed: {
    name: 'Themed',
    description: 'Nodes and edges with custom types and styling',
    nodes: [
      { id: 'input', type: 'input', title: 'Input' },
      { id: 'validate', type: 'process', title: 'Validate' },
      { id: 'transform', type: 'process', title: 'Transform' },
      { id: 'error', type: 'error', title: 'Error' },
      { id: 'output', type: 'success', title: 'Output' },
    ],
    edges: [
      { source: 'input', target: 'validate' },
      { source: 'validate', target: 'transform' },
      { source: 'validate', target: 'error', type: 'error' },
      { source: 'transform', target: 'output', type: 'success' },
      { source: 'transform', target: 'error', type: 'error' },
    ],
    options: {
      canvas: {
        nodeTypes: {
          input: { border: '#3b82f6' },
          process: { border: '#8b5cf6' },
          error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
          success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
        },
        edgeTypes: {
          error: { color: '#ef4444' },
          success: { color: '#22c55e' },
        },
      },
    },
  },
}

export const exampleList = Object.keys(examples)
