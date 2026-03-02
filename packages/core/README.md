# @3plate/graph-core

Framework-agnostic core of [@3plate/graph](../../README.md) — a graph visualization library with stable layouts and incremental updates.

## Installation

```bash
npm install @3plate/graph-core
```

## Usage

```typescript
import { graph } from '@3plate/graph-core'

const api = await graph({
  root: 'my-graph',   // ID of the container element
  nodes: [
    { id: 'a', title: 'Start' },
    { id: 'b', title: 'Process' },
    { id: 'c', title: 'End' },
  ],
  edges: [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
  ],
})

// Incrementally update the graph
api.update(u => {
  u.addNodes({ id: 'd', title: 'New Step' })
  u.addEdges({ source: 'b', target: 'd' })
})
```

## Custom Node Rendering

Provide `renderNode` to control what appears inside each node. It receives your node data and must return an `HTMLElement`:

```typescript
await graph({
  root: 'my-graph',
  nodes: myNodes,
  edges: myEdges,
  options: {
    canvas: {
      renderNode: (node) => {
        const el = document.createElement('div')
        el.innerHTML = `<strong>${node.title}</strong><p>${node.description}</p>`
        return el
      },
    },
  },
})
```

### Using a Framework Renderer (React, Vue, etc.)

To render framework components inside nodes, use `mountNode` alongside `renderNode`. `mountNode` is called after the node element is in the DOM — use it to mount your component and return a cleanup function:

```typescript
import { createRoot, flushSync } from 'react-dom/client' // or any framework

await graph({
  root: 'my-graph',
  nodes: myNodes,
  edges: myEdges,
  options: {
    canvas: {
      // renderNode returns a placeholder element
      renderNode: () => document.createElement('div'),

      // mountNode renders into it synchronously so the graph can measure it
      mountNode: (node, el) => {
        const root = createRoot(el)
        flushSync(() => root.render(<MyNodeCard node={node} />))
        return () => root.unmount()
      },
    },
  },
})
```

> **Note:** Use `flushSync` (or your framework's equivalent synchronous flush) so the node has real dimensions when the layout engine measures it. The returned cleanup function is called automatically when the node is removed.

If you're using React, the `@3plate/graph-react` wrapper handles all of this for you — `renderNode` can return JSX directly.

## Options

### Graph layout

```typescript
options: {
  graph: {
    orientation: 'TB',        // 'TB' | 'BT' | 'LR' | 'RL' (default: 'TB')
    nodeMargin: 15,           // Space between nodes in the same layer
    layerMargin: 5,           // Space between layers
    edgeSpacing: 10,          // Space between parallel edges
    turnRadius: 10,           // Rounded corner radius for edge bends
    nodeAlign: 'natural',     // 'natural' | 'top' | 'bottom' | 'left' | 'right'
  },
}
```

### Canvas

```typescript
options: {
  canvas: {
    width: '100%',            // Canvas width (default: '100%')
    height: '100%',           // Canvas height (default: '100%')
    padding: 20,              // Viewport padding in px (default: 20)
    editable: false,          // Enable interactive edit mode (default: false)
    panZoom: true,            // Enable pan and zoom (default: true)
    colorMode: 'system',      // 'light' | 'dark' | 'system' (default: 'system')
    renderNode,               // (node, props?) => HTMLElement
    mountNode,                // (node, el) => (() => void) | void
    theme: {},                // Global theme overrides
    nodeTypes: {},            // Per-type theme overrides
    edgeTypes: {},            // Per-type edge color overrides
  },
}
```

## API Methods

```typescript
const api = await graph({ ... })

// Incremental updates
api.update(u => {
  u.addNodes(node)
  u.updateNodes(node)
  u.deleteNodes(id)
  u.addEdges(edge)
  u.updateEdges(edge)
  u.deleteEdges(id)
  u.describe('Optional label for history')
})

// Replace the entire graph at once
api.replaceSnapshot(nodes, edges)

// History navigation
api.nav('first' | 'prev' | 'next' | 'last')

// Theming
api.setColorMode('light' | 'dark')
api.updateStyles({ theme, nodeTypes, edgeTypes })

// Cleanup
api.destroy()
```

## Events

```typescript
await graph({
  root: 'my-graph',
  nodes: [...],
  edges: [...],
  events: {
    nodeClick: (node) => { ... },
    edgeClick: (edge) => { ... },
    addNode: (props, done) => done({ id: generateId(), ...props }),
    addEdge: (edge, done) => done(edge),
    removeNode: (node, done) => done(true),
    removeEdge: (edge, done) => done(true),
    historyChange: (index, length) => { ... },
  },
})
```

## Real-time Ingestion

```typescript
// WebSocket
await graph({
  root: 'my-graph',
  ingestion: { type: 'websocket', url: 'ws://localhost:8787' },
})

// Polling a file or endpoint
await graph({
  root: 'my-graph',
  ingestion: { type: 'file', url: '/api/updates.ndjson', intervalMs: 1000 },
})
```

## License

**GNU General Public License v3.0**. Commercial licenses available — see the [root README](../../README.md) for details.
