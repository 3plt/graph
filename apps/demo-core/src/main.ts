import { graph } from '@3plate/graph-core'

async function main() {
  await graph({
    root: 'app',
    nodes: [
      { id: 'a', ports: { out: ['foo', 'bar'] } },
      'b',
      'c',
      { id: 'd', ports: { in: ['baz', 'quux'] } },
    ],
    edges: [
      { source: { id: 'a', port: 'foo' }, target: { id: 'b', marker: 'diamond' } },
      { source: { id: 'a', port: 'foo', marker: 'circle' }, target: { id: 'c', marker: 'diamond' } },
      { source: { id: 'a', marker: 'arrow', port: 'bar' }, target: { id: 'c', marker: 'circle' } },
      { source: { id: 'b', marker: 'diamond' }, target: { id: 'd', marker: 'bar', port: 'baz' } },
      { source: { id: 'c' }, target: { id: 'd', marker: 'circle', port: 'quux' } }
    ],
    options: {
      graph: {
        orientation: 'TB'
      },
      canvas: {
        nodeStyle: {
          portStyle: 'outside',
          portLabelRotate: true
        }
      }
    }
  })
}

main().catch(console.error)
