# @3plate/graph-vue

Vue 3 components for @3plate/graph visualization.

## Installation

```bash
npm install @3plate/graph-vue
```

## Usage

### Basic Example

```vue
<script setup lang="ts">
import { Graph } from '@3plate/graph-vue'

const nodes = [
  { id: 'a', title: 'Start' },
  { id: 'b', title: 'Process' },
  { id: 'c', title: 'End' },
]

const edges = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
]
</script>

<template>
  <div style="width: 100%; height: 400px">
    <Graph :nodes="nodes" :edges="edges" />
  </div>
</template>
```

### With Options

```vue
<script setup lang="ts">
import { Graph } from '@3plate/graph-vue'

const nodes = [
  { id: 'input', type: 'input', title: 'Input' },
  { id: 'process', type: 'process', title: 'Process' },
  { id: 'output', type: 'success', title: 'Output' },
]

const edges = [
  { source: 'input', target: 'process' },
  { source: 'process', target: 'output', type: 'success' },
]

const options = {
  graph: {
    orientation: 'LR',
  },
  canvas: {
    colorMode: 'dark',
    nodeTypes: {
      input: { border: '#3b82f6' },
      process: { border: '#8b5cf6' },
      success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    },
    edgeTypes: {
      success: { color: '#22c55e' },
    },
  },
}
</script>

<template>
  <div style="width: 100%; height: 400px">
    <Graph :nodes="nodes" :edges="edges" :options="options" />
  </div>
</template>
```

### With Events

```vue
<script setup lang="ts">
import { Graph } from '@3plate/graph-vue'

const nodes = [
  { id: 'a', title: 'Node A' },
  { id: 'b', title: 'Node B' },
]

const edges = [{ source: 'a', target: 'b' }]

const events = {
  nodeClick: (node) => console.log('Clicked:', node),
  edgeClick: (edge) => console.log('Edge clicked:', edge),
  historyChange: (index, length) => {
    console.log(`Step ${index + 1} of ${length}`)
  },
}
</script>

<template>
  <div style="width: 100%; height: 400px">
    <Graph :nodes="nodes" :edges="edges" :events="events" />
  </div>
</template>
```

### With Real-time Ingestion

```vue
<script setup lang="ts">
import { Graph } from '@3plate/graph-vue'

// WebSocket ingestion
const ingestion = {
  type: 'websocket' as const,
  url: 'ws://localhost:8787',
}
</script>

<template>
  <div style="width: 100%; height: 400px">
    <Graph :ingestion="ingestion" />
  </div>
</template>
```

### Reactive Updates

The component automatically handles reactive prop changes:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Graph } from '@3plate/graph-vue'

const nodes = ref([
  { id: 'a', title: 'Start' },
  { id: 'b', title: 'End' },
])

const edges = ref([{ source: 'a', target: 'b' }])

function addNode() {
  const id = `node-${Date.now()}`
  nodes.value = [...nodes.value, { id, title: `Node ${id}` }]
  edges.value = [...edges.value, { source: 'a', target: id }]
}
</script>

<template>
  <button @click="addNode">Add Node</button>
  <div style="width: 100%; height: 400px">
    <Graph :nodes="nodes" :edges="edges" />
  </div>
</template>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `nodes` | `N[]` | Array of node objects |
| `edges` | `E[]` | Array of edge objects |
| `history` | `Update<N, E>[]` | History frames for time-travel |
| `ingestion` | `IngestionConfig` | WebSocket or file source config |
| `options` | `APIOptions` | Graph and canvas options |
| `events` | `EventsOptions` | Event handlers |

### Playground Component

The Playground component provides a full-featured demo environment:

```vue
<script setup lang="ts">
import { Playground } from '@3plate/graph-vue'

const examples = {
  simple: {
    name: 'Simple Graph',
    description: 'A basic graph example',
    nodes: [
      { id: 'a', title: 'Start' },
      { id: 'b', title: 'End' },
    ],
    edges: [{ source: 'a', target: 'b' }],
  },
  complex: {
    name: 'Complex Graph',
    description: 'A more complex example',
    nodes: [
      { id: '1', title: 'Input' },
      { id: '2', title: 'Process A' },
      { id: '3', title: 'Process B' },
      { id: '4', title: 'Output' },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '1', target: '3' },
      { source: '2', target: '4' },
      { source: '3', target: '4' },
    ],
  },
}
</script>

<template>
  <div style="width: 100%; height: 600px">
    <Playground :examples="examples" default-example="simple" />
  </div>
</template>
```

## Features

- **Reactive updates** — Props changes are efficiently diffed and applied
- **Incremental history** — Appended history frames are applied incrementally
- **Style updates** — Theme and type changes are applied without re-render
- **Color mode** — Light/dark mode changes are applied instantly
- **Cleanup** — Resources are properly cleaned up on unmount
- **Playground** — Full-featured demo environment with example switching

