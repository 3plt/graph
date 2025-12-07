# @3plate/graph-react

React components for @3plate/graph visualization.

## Installation

```bash
npm install @3plate/graph-react
```

## Usage

```tsx
import { GraphView, createGraph } from '@3plate/graph-react'

function App() {
  const graph = createGraph({
    nodes: [
      { id: '1', label: 'Node 1' },
      { id: '2', label: 'Node 2' },
    ],
    edges: [{ id: 'e1', source: '1', target: '2' }],
  })

  return (
    <GraphView
      graph={graph}
      width={800}
      height={600}
      onNodeClick={nodeId => console.log('Node clicked:', nodeId)}
    />
  )
}
```
