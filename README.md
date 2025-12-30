# @3plate/graph

A graph visualization library with **stable layouts** and **incremental updates**. Build interactive directed graphs that maintain their structure as data changes—perfect for visualizing pipelines, workflows, dependency trees, and state machines.

## Why @3plate/graph?

Most graph libraries re-layout the entire graph when data changes, causing nodes to jump around unpredictably. @3plate/graph solves this with:

- **Stable layouts** — Nodes stay in predictable positions as the graph evolves
- **Incremental updates** — Add, remove, or modify nodes without full re-renders
- **Railroad-style edges** — Clean, orthogonal routing that avoids crossing nodes
- **Real-time ingestion** — Stream graph updates from WebSockets or files

## Quick Start

### Vanilla JavaScript

```bash
npm install @3plate/graph-core
```

```typescript
import { graph } from '@3plate/graph-core'

const api = await graph({
  root: 'my-graph',
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

// Update the graph incrementally
api.update(u => {
  u.addNodes({ id: 'd', title: 'New Step' })
  u.addEdges({ source: 'b', target: 'd' })
})
```

### React

```bash
npm install @3plate/graph-react
```

```tsx
import { Graph } from '@3plate/graph-react'

function App() {
  return (
    <Graph
      nodes={[
        { id: 'a', title: 'Start' },
        { id: 'b', title: 'Process' },
        { id: 'c', title: 'End' },
      ]}
      edges={[
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ]}
    />
  )
}
```

## Features

### Layout & Rendering

- **Automatic layered layout** — Nodes are positioned in layers based on their connections
- **Multiple orientations** — Top-to-bottom, bottom-to-top, left-to-right, or right-to-left
- **SVG rendering** — Crisp graphics at any zoom level
- **Pan and zoom** — Navigate large graphs with mouse/touch controls
- **Custom node rendering** — Render any HTML content inside nodes

### Interactivity

- **Edit mode** — Add, remove, and connect nodes with mouse interactions
- **Click handlers** — Respond to node and edge clicks
- **Keyboard navigation** — Step through graph history with arrow keys
- **Selection** — Visual feedback for selected nodes and edges

### Theming

- **Light/dark mode** — Built-in themes with system preference detection
- **Node types** — Define custom styles per node type
- **Edge types** — Style edges by category (error, success, etc.)
- **CSS variables** — Full control over colors, borders, and shadows

### Data Handling

- **History & time-travel** — Navigate through graph states with undo/redo
- **Real-time ingestion** — Connect to WebSocket or file sources for live updates
- **Snapshot & update modes** — Replace entire graph or apply incremental changes
- **Ports** — Define named input/output ports on nodes for precise edge routing

### Graph Features

- **Cycle detection** — Automatically handles graphs with cycles
- **Edge markers** — Arrow, circle, diamond, and bar markers on edge endpoints
- **Dummy nodes** — Long edges are split with invisible waypoints for cleaner routing
- **Configurable spacing** — Control margins, edge spacing, and turn radius

## Packages

| Package                                               | Description                     |
|-------------------------------------------------------|---------------------------------|
| [@3plate/graph-core](./packages/core/README.md)       | Framework-agnostic core library |
| [@3plate/graph-react](./packages/react/README.md)     | React components and hooks      |
| [@3plate/graph-vue](./packages/vue/README.md)         | Vue 3 components                |
| [@3plate/graph-angular](./packages/angular/README.md) | Angular components              |

## Configuration

### Graph Options

```typescript
await graph({
  root: 'my-graph',
  nodes: [...],
  edges: [...],
  options: {
    graph: {
      orientation: 'LR',        // 'TB' | 'BT' | 'LR' | 'RL'
      nodeMargin: 20,           // Space between nodes
      layerMargin: 60,          // Space between layers
      edgeSpacing: 8,           // Space between parallel edges
      turnRadius: 8,            // Rounded corner radius for edges
    },
    canvas: {
      width: '100%',
      height: 600,
      padding: 40,
      editable: true,           // Enable edit mode
      panZoom: true,            // Enable pan and zoom
      colorMode: 'system',      // 'light' | 'dark' | 'system'
    },
  },
})
```

### Custom Node Rendering

```typescript
await graph({
  root: 'my-graph',
  nodes: myNodes,
  edges: myEdges,
  options: {
    canvas: {
      renderNode: (node) => {
        const el = document.createElement('div')
        el.className = 'my-custom-node'
        el.innerHTML = `<h3>${node.title}</h3><p>${node.description}</p>`
        return el
      },
    },
  },
})
```

### Theming by Type

```typescript
await graph({
  root: 'my-graph',
  nodes: [
    { id: 'start', type: 'input', title: 'Start' },
    { id: 'process', type: 'process', title: 'Process' },
    { id: 'error', type: 'error', title: 'Error' },
  ],
  edges: [...],
  options: {
    canvas: {
      nodeTypes: {
        input: { border: '#3b82f6' },
        process: { border: '#8b5cf6' },
        error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
      },
      edgeTypes: {
        error: { color: '#ef4444' },
        success: { color: '#22c55e' },
      },
    },
  },
})
```

### Real-time Ingestion

```typescript
// Connect to a WebSocket for live updates
await graph({
  root: 'my-graph',
  ingestion: {
    type: 'websocket',
    url: 'ws://localhost:8787',
  },
})

// Or poll a file/endpoint
await graph({
  root: 'my-graph',
  ingestion: {
    type: 'file',
    url: '/api/graph-updates.ndjson',
    intervalMs: 1000,
  },
})
```

### Event Handling

```typescript
await graph({
  root: 'my-graph',
  nodes: [...],
  edges: [...],
  events: {
    nodeClick: (node) => console.log('Clicked:', node),
    edgeClick: (edge) => console.log('Edge clicked:', edge),
    addNode: (props, done) => {
      // Custom logic when user adds a node
      const newNode = { id: generateId(), ...props }
      done(newNode)
    },
    historyChange: (index, length) => {
      console.log(`Step ${index + 1} of ${length}`)
    },
  },
})
```

## API Methods

```typescript
const api = await graph({ ... })

// Navigation
api.nav('first')              // Jump to first state
api.nav('prev')               // Go to previous state
api.nav('next')               // Go to next state
api.nav('last')               // Jump to latest state

// Updates
api.update(u => {
  u.addNodes({ id: 'x', title: 'New' })
  u.deleteNodes('old-node')
  u.updateNodes({ id: 'x', title: 'Updated' })
  u.addEdges({ source: 'a', target: 'x' })
  u.deleteEdges('edge-id')
  u.describe('Added new node')  // Label for history
})

// Bulk operations
api.replaceSnapshot(nodes, edges)
api.replaceHistory(history)

// Theming
api.setColorMode('dark')
api.updateStyles({ nodeTypes: { ... } })

// Cleanup
api.destroy()
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run demo site
pnpm dev:site

# Run tests
pnpm test
```

## Inspiration

This library is inspired by [IonGraph Web](https://spidermonkey.dev/blog/2025/10/28/iongraph-web.html) from the SpiderMonkey team, which visualizes JavaScript JIT compilation graphs with stable, incremental layouts.

## Contributing

We welcome contributions! Before submitting a pull request:

1. Read our [Contributing Guidelines](./CONTRIBUTING.md)
2. Sign the [Contributor License Agreement](./CLA.md)
3. Follow the code style and testing guidelines

## License

**GNU General Public License v3.0** — see [LICENSE](./LICENSE) for details.

### Why GPL?

We've chosen GPL-3.0 to ensure improvements to @3plate/graph remain open source:

- ✅ Use in open source projects
- ✅ Modify and distribute
- ✅ Commercial use allowed
- ⚠️ Distributed modifications must also be GPL-3.0

### Commercial Licensing

Need to use @3plate/graph in proprietary software without GPL restrictions? Commercial licenses are available — contact [nathan@3plate.com](mailto:nathan@3plate.com).

---

**Copyright © 2025 [3Plate LLC](https://www.3plate.com/)**
