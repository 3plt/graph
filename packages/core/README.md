# @3plate/graph-core

Graph library with stable layout and incremental updates.

## Installation

```bash
npm install @3plate/graph-core
```

## Usage

```typescript
import { createGraph } from '@3plate/graph-core'

const graph = createGraph({
  nodes: [
    { id: '1', label: 'Node 1' },
    { id: '2', label: 'Node 2' },
  ],
  edges: [{ id: 'e1', source: '1', target: '2' }],
})
```

## Features

- Custom node rendering
- Automatic graph layout
- Stable layouts
- Multiple orientations
- Interactive features
- Cycle detection
- Edge styling
- Pan and zoom
- Mini-map
- Animations
- SVG for crisp details
- Fast rendering
- Builder mode
- Incremental updates
- Railroad-style edges
- Configurable layout
