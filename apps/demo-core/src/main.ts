import { graph } from '@3plate/graph-core'

type DemoNode = {
  id: string
  label: string
}

type DemoEdge = {
  source: string
  target: string
}

// Sample data - a simple DAG
const nodes: DemoNode[] = [
  { id: 'a', label: 'Node A' },
  { id: 'b', label: 'Node B' },
  { id: 'c', label: 'Node C' },
  { id: 'd', label: 'Node D' },
]

const edges: DemoEdge[] = [
  { source: 'a', target: 'b' },
  { source: 'a', target: 'c' },
  { source: 'b', target: 'd' },
  { source: 'c', target: 'd' },
]

console.log('rendering graph')

async function main() {
  // Create the graph
  const g = await graph({
    nodes,
    edges,
    // Custom node renderer
    renderNode: (node: DemoNode) => {
      const div = document.createElement('div')
      div.style.cssText = `
        padding: 12px 16px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #1e293b;
      `
      div.textContent = node.label || node.id
      return div
    },
    // Map user nodes to structured props
    nodeProps: (node: DemoNode) => ({
      id: node.id,
      ports: { in: [], out: [] },
    }),
    // Map user edges to structured props
    edgeProps: (edge: DemoEdge) => ({
      source: { id: edge.source },
      target: { id: edge.target },
    }),
  })

  // Render and mount
  const app = document.getElementById('app')!
  app.appendChild(g.render())

  console.log('Graph rendered:', g)
}

main().catch(console.error)
