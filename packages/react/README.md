# @3plate/graph-react

React wrapper for [@3plate/graph](../../README.md) — a graph visualization library with stable layouts and incremental updates.

## Installation

```bash
npm install @3plate/graph-react
```

React and React DOM are peer dependencies (React 18 or 19):

```bash
npm install react react-dom
```

## Usage

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

The `<Graph>` component fills its container — give the parent a defined size:

```tsx
<div style={{ width: '100%', height: 600 }}>
  <Graph nodes={nodes} edges={edges} />
</div>
```

## Custom Node Rendering

Use `options.canvas.renderNode` to control what appears inside each node. The function can return an **`HTMLElement` or a React node (JSX)**:

```tsx
<Graph
  nodes={nodes}
  edges={edges}
  options={{
    canvas: {
      renderNode: (node) => (
        <div className="my-node">
          <strong>{node.title}</strong>
          <span>{node.status}</span>
        </div>
      ),
    },
  }}
/>
```

React content is mounted with `flushSync` so the graph can measure the node's dimensions before laying out the graph. Cleanup (unmounting the React root) happens automatically when a node is removed.

### Full React components

Any React component works, including those with hooks and state:

```tsx
function NodeCard({ node }: { node: MyNode }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="node-card" onClick={() => setExpanded(e => !e)}>
      <h3>{node.title}</h3>
      {expanded && <p>{node.description}</p>}
    </div>
  )
}

<Graph
  nodes={nodes}
  edges={edges}
  options={{
    canvas: {
      renderNode: (node) => <NodeCard node={node} />,
    },
  }}
/>
```

> **Note:** Node dimensions are measured once when the node is first created. If your component can change size after the initial render (e.g. toggling expanded state), the graph layout won't automatically reflow. Prefer fixed-size or CSS-constrained node content.

## Props

```typescript
type GraphProps<N, E> = {
  nodes?: N[]
  edges?: E[]
  history?: Update<N, E>[]         // Replay a sequence of graph states
  ingestion?: IngestionConfig       // WebSocket / file polling (alternative to nodes/edges)
  options?: {
    graph?: GraphOptions            // Layout options (orientation, margins, etc.)
    canvas?: {
      renderNode?: (node: N, props?: NodeProps<N>) => ReactNode | HTMLElement
      width?: string | number       // default: '100%'
      height?: string | number      // default: '100%'
      padding?: number              // default: 20
      editable?: boolean            // default: false
      panZoom?: boolean             // default: true
      colorMode?: 'light' | 'dark' | 'system'  // default: 'system'
      theme?: ThemeVars
      nodeTypes?: Record<string, ThemeVars>
      edgeTypes?: Record<string, ThemeVars>
    }
    props?: PropsOptions<N, E>      // Extract id/title/ports from your data shape
  }
  events?: EventsOptions<N, E>
}
```

## Reactive Updates

Pass updated `nodes` and `edges` arrays and the graph updates automatically. Only changed nodes are re-measured and re-laid out:

```tsx
const [nodes, setNodes] = useState(initialNodes)
const [edges, setEdges] = useState(initialEdges)

// The graph rerenders incrementally when nodes or edges change
return <Graph nodes={nodes} edges={edges} />
```

## Events

```tsx
<Graph
  nodes={nodes}
  edges={edges}
  events={{
    nodeClick: (node) => console.log('clicked', node),
    edgeClick: (edge) => console.log('edge clicked', edge),
    addNode: (props, done) => done({ id: crypto.randomUUID(), ...props }),
    addEdge: (edge, done) => done(edge),
    removeNode: (node, done) => done(confirm('Delete?')),
    historyChange: (index, length) => setStep(`${index + 1}/${length}`),
  }}
/>
```

## Theming

```tsx
<Graph
  nodes={[
    { id: 'a', type: 'success', title: 'Passed' },
    { id: 'b', type: 'error',   title: 'Failed' },
  ]}
  edges={edges}
  options={{
    canvas: {
      colorMode: 'dark',
      nodeTypes: {
        success: { border: '#22c55e', text: '#dcfce7' },
        error:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
      },
      edgeTypes: {
        error: { color: '#ef4444' },
      },
    },
  }}
/>
```

## Real-time Ingestion

```tsx
// WebSocket
<Graph ingestion={{ type: 'websocket', url: 'ws://localhost:8787' }} />

// Polling
<Graph ingestion={{ type: 'file', url: '/api/updates.ndjson', intervalMs: 1000 }} />
```

## License

**GNU General Public License v3.0**. Commercial licenses available — see the [root README](../../README.md) for details.
