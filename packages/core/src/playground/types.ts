/**
 * Types for the Playground component
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

export type ExampleSource =
  | { type: 'file', path: string }
  | { type: 'websocket', url: string }

export type Example = {
  name: string
  description?: string
  nodes: ExampleNode[]
  edges: ExampleEdge[]
  options?: ExampleOptions
  source?: ExampleSource
}

export type PlaygroundOptions = {
  root: string | HTMLElement
  examples: Record<string, Example>
  defaultExample?: string
}

