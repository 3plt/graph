import { graph } from '@3plate/graph-core'

async function main() {
  await graph({
    root: 'app',
    nodes: ['a', 'b', 'c', 'd'],
    edges: [
      { source: 'a', target: { id: 'b', marker: 'diamond' } },
      { source: { id: 'a', marker: 'arrow' }, target: { id: 'c', marker: 'circle' } },
      { source: { id: 'b', marker: 'diamond' }, target: { id: 'd', marker: 'bar' } },
      { source: 'c', target: { id: 'd', marker: 'circle' } }
    ]
  })
}

main().catch(console.error)
