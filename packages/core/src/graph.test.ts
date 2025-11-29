import { describe, it, expect } from 'vitest'
import { Graph, GraphNode, GraphEdge } from './index'

// Test data types
interface TestNodeData {
  value: string
}

interface TestEdgeData {
  weight: number
}

describe('Graph with structural sharing', () => {
  describe('Basic keyframe (complete graph)', () => {
    it('should iterate over all nodes in a complete graph', () => {
      const graph = new Graph<TestNodeData, TestEdgeData>()

      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })

      graph.nodeMap?.set('n1', n1)
      graph.nodeMap?.set('n2', n2)
      graph.complete = true

      const nodes = Array.from(graph.nodes())
      expect(nodes).toHaveLength(2)
      expect(nodes).toContain(n1)
      expect(nodes).toContain(n2)
    })

    it('should iterate over all edges in a complete graph', () => {
      const graph = new Graph<TestNodeData, TestEdgeData>()

      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })

      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )

      graph.edgeMap?.set('n1-n2', e1)
      graph.complete = true

      const edges = Array.from(graph.edges())
      expect(edges).toHaveLength(1)
      expect(edges[0]).toBe(e1)
    })
  })

  describe('Delta versions', () => {
    it('should overlay new nodes on top of keyframe', () => {
      // v1: keyframe with n1, n2
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      v1.nodeMap?.set('n1', n1)
      v1.nodeMap?.set('n2', n2)
      v1.complete = true

      // v2: delta adding n3
      const v2 = new Graph<TestNodeData, TestEdgeData>()
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })
      v2.nodeMap?.set('n3', n3)
      v2.complete = false
      v2.prior = v1

      const nodes = Array.from(v2.nodes())
      expect(nodes).toHaveLength(3)
      expect(nodes.map(n => n.props.id).sort()).toEqual(['n1', 'n2', 'n3'])
    })

    it('should use newest version when node is updated', () => {
      // v1: keyframe with n1, n2
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      const n1_v1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Old' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      v1.nodeMap?.set('n1', n1_v1)
      v1.nodeMap?.set('n2', n2)
      v1.complete = true

      // v2: delta updating n1
      const v2 = new Graph<TestNodeData, TestEdgeData>()
      const n1_v2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'New' })
      v2.nodeMap?.set('n1', n1_v2)
      v2.complete = false
      v2.prior = v1

      const nodes = Array.from(v2.nodes())
      expect(nodes).toHaveLength(2)

      const n1Result = nodes.find(n => n.props.id === 'n1')
      expect(n1Result).toBe(n1_v2) // Should be the newer version
      expect(n1Result?.data.value).toBe('New')
    })

    it('should handle multiple delta versions', () => {
      // v1: keyframe with n1, n2
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      v1.nodeMap?.set('n1', new GraphNode({ id: 'n1' }, { value: 'Node 1' }))
      v1.nodeMap?.set('n2', new GraphNode({ id: 'n2' }, { value: 'Node 2' }))
      v1.complete = true

      // v2: add n3
      const v2 = new Graph<TestNodeData, TestEdgeData>()
      v2.nodeMap?.set('n3', new GraphNode({ id: 'n3' }, { value: 'Node 3' }))
      v2.complete = false
      v2.prior = v1

      // v3: add n4
      const v3 = new Graph<TestNodeData, TestEdgeData>()
      v3.nodeMap?.set('n4', new GraphNode({ id: 'n4' }, { value: 'Node 4' }))
      v3.complete = false
      v3.prior = v2

      const nodes = Array.from(v3.nodes())
      expect(nodes).toHaveLength(4)
      expect(nodes.map(n => n.props.id).sort()).toEqual(['n1', 'n2', 'n3', 'n4'])
    })
  })

  describe('Tombstones (deletions)', () => {
    it('should skip nodes marked as null (deleted)', () => {
      // v1: keyframe with n1, n2, n3
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      v1.nodeMap?.set('n1', new GraphNode({ id: 'n1' }, { value: 'Node 1' }))
      v1.nodeMap?.set('n2', new GraphNode({ id: 'n2' }, { value: 'Node 2' }))
      v1.nodeMap?.set('n3', new GraphNode({ id: 'n3' }, { value: 'Node 3' }))
      v1.complete = true

      // v2: delete n2
      const v2 = new Graph<TestNodeData, TestEdgeData>()
      v2.nodeMap?.set('n2', null) // Tombstone
      v2.complete = false
      v2.prior = v1

      const nodes = Array.from(v2.nodes())
      expect(nodes).toHaveLength(2)
      expect(nodes.map(n => n.props.id).sort()).toEqual(['n1', 'n3'])
    })

    it('should handle add, delete, and update in one chain', () => {
      // v1: keyframe with n1, n2
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      v1.nodeMap?.set('n1', new GraphNode({ id: 'n1' }, { value: 'Old' }))
      v1.nodeMap?.set('n2', new GraphNode({ id: 'n2' }, { value: 'Node 2' }))
      v1.complete = true

      // v2: update n1, add n3
      const v2 = new Graph<TestNodeData, TestEdgeData>()
      v2.nodeMap?.set('n1', new GraphNode({ id: 'n1' }, { value: 'New' }))
      v2.nodeMap?.set('n3', new GraphNode({ id: 'n3' }, { value: 'Node 3' }))
      v2.complete = false
      v2.prior = v1

      // v3: delete n2, add n4
      const v3 = new Graph<TestNodeData, TestEdgeData>()
      v3.nodeMap?.set('n2', null) // Delete
      v3.nodeMap?.set('n4', new GraphNode({ id: 'n4' }, { value: 'Node 4' }))
      v3.complete = false
      v3.prior = v2

      const nodes = Array.from(v3.nodes())
      expect(nodes).toHaveLength(3)
      expect(nodes.map(n => n.props.id).sort()).toEqual(['n1', 'n3', 'n4'])

      // Check n1 has the updated value
      const n1 = nodes.find(n => n.props.id === 'n1')
      expect(n1?.data.value).toBe('New')
    })
  })

  describe('getNode and getEdge', () => {
    it('should find node in current version', () => {
      const graph = new Graph<TestNodeData, TestEdgeData>()
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      graph.nodeMap?.set('n1', n1)
      graph.complete = true

      expect(graph.getNode('n1')).toBe(n1)
    })

    it('should walk back to find node in prior version', () => {
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      v1.nodeMap?.set('n1', n1)
      v1.complete = true

      const v2 = new Graph<TestNodeData, TestEdgeData>()
      v2.nodeMap?.set('n2', new GraphNode({ id: 'n2' }, { value: 'Node 2' }))
      v2.complete = false
      v2.prior = v1

      expect(v2.getNode('n1')).toBe(n1)
    })

    it('should return null for deleted node', () => {
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      v1.nodeMap?.set('n1', new GraphNode({ id: 'n1' }, { value: 'Node 1' }))
      v1.complete = true

      const v2 = new Graph<TestNodeData, TestEdgeData>()
      v2.nodeMap?.set('n1', null) // Delete
      v2.complete = false
      v2.prior = v1

      expect(v2.getNode('n1')).toBe(undefined)
    })

    it('should return undefined for non-existent node', () => {
      const graph = new Graph<TestNodeData, TestEdgeData>()
      graph.complete = true

      expect(graph.getNode('nonexistent')).toBe(undefined)
    })
  })

  describe('hasNode and hasEdge', () => {
    it('should return true for existing node', () => {
      const graph = new Graph<TestNodeData, TestEdgeData>()
      graph.nodeMap?.set('n1', new GraphNode({ id: 'n1' }, { value: 'Node 1' }))
      graph.complete = true

      expect(graph.hasNode('n1')).toBe(true)
    })

    it('should return false for deleted node', () => {
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      v1.nodeMap?.set('n1', new GraphNode({ id: 'n1' }, { value: 'Node 1' }))
      v1.complete = true

      const v2 = new Graph<TestNodeData, TestEdgeData>()
      v2.nodeMap?.set('n1', null)
      v2.complete = false
      v2.prior = v1

      expect(v2.hasNode('n1')).toBe(false)
    })

    it('should return false for non-existent node', () => {
      const graph = new Graph<TestNodeData, TestEdgeData>()
      graph.complete = true

      expect(graph.hasNode('nonexistent')).toBe(false)
    })
  })

  describe('Keyframe stopping', () => {
    it('should stop at keyframe and not walk further', () => {
      // v0: old keyframe (should not be reached)
      const v0 = new Graph<TestNodeData, TestEdgeData>()
      v0.nodeMap?.set('n0', new GraphNode({ id: 'n0' }, { value: 'Node 0' }))
      v0.complete = true

      // v1: new keyframe (should stop here)
      const v1 = new Graph<TestNodeData, TestEdgeData>()
      v1.nodeMap?.set('n1', new GraphNode({ id: 'n1' }, { value: 'Node 1' }))
      v1.complete = true
      v1.prior = v0 // Link exists but should not traverse past keyframe

      // v2: delta
      const v2 = new Graph<TestNodeData, TestEdgeData>()
      v2.nodeMap?.set('n2', new GraphNode({ id: 'n2' }, { value: 'Node 2' }))
      v2.complete = false
      v2.prior = v1

      const nodes = Array.from(v2.nodes())
      expect(nodes).toHaveLength(2)
      expect(nodes.map(n => n.props.id).sort()).toEqual(['n1', 'n2'])
      // n0 should NOT be included
      expect(nodes.find(n => n.props.id === 'n0')).toBe(undefined)
    })
  })
})
