import { describe, it, expect } from 'vitest'
import { GraphNode, GraphEdge } from './index'

// Test data types
interface TestNodeData {
  value: string
}

interface TestEdgeData {
  weight: number
}

describe('GraphNode with structural sharing', () => {
  describe('Basic keyframe (complete node)', () => {
    it('should iterate over source edges in a complete node', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })

      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )

      n2.sourceMap?.set(e1, n1)
      n3.sourceMap?.set(e2, n1)
      n2.complete = true
      n3.complete = true

      const edges = Array.from(n2.sourceEdges())
      expect(edges).toHaveLength(1)
      expect(edges[0]).toBe(e1)
    })

    it('should iterate over target edges in a complete node', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })

      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )

      n1.targetMap?.set(e1, n2)
      n1.targetMap?.set(e2, n3)
      n1.complete = true

      const edges = Array.from(n1.targetEdges())
      expect(edges).toHaveLength(2)
      expect(edges).toContain(e1)
      expect(edges).toContain(e2)
    })

    it('should iterate over source nodes', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })

      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 1 },
        n1,
        n3
      )
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n2', targetId: 'n3' },
        { weight: 2 },
        n2,
        n3
      )

      n3.sourceMap?.set(e1, n1)
      n3.sourceMap?.set(e2, n2)
      n3.complete = true

      const sources = Array.from(n3.sourceNodes())
      expect(sources).toHaveLength(2)
      expect(sources).toContain(n1)
      expect(sources).toContain(n2)
    })

    it('should iterate over target nodes', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })

      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )

      n1.targetMap?.set(e1, n2)
      n1.targetMap?.set(e2, n3)
      n1.complete = true

      const targets = Array.from(n1.targetNodes())
      expect(targets).toHaveLength(2)
      expect(targets).toContain(n2)
      expect(targets).toContain(n3)
    })
  })

  describe('Delta versions', () => {
    it('should overlay new edges on top of keyframe', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })

      // v1: keyframe with e1
      const n1_v1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      n1_v1.targetMap?.set(e1, n2)
      n1_v1.complete = true

      // v2: delta adding e2
      const n1_v2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )
      n1_v2.targetMap?.set(e2, n3)
      n1_v2.complete = false
      n1_v2.prior = n1_v1

      const edges = Array.from(n1_v2.targetEdges())
      expect(edges).toHaveLength(2)
      expect(edges.map(e => e.id).sort()).toEqual(['n1-n2', 'n1-n3'])
    })

    it('should use newest version when edge is updated', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })

      // v1: keyframe with e1 (weight 1)
      const n1_v1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e1_v1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      n1_v1.targetMap?.set(e1_v1, n2)
      n1_v1.complete = true

      // v2: delta updating e1 (weight 2)
      const n1_v2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e1_v2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 2 },
        n1,
        n2
      )
      n1_v2.targetMap?.set(e1_v2, n2)
      n1_v2.complete = false
      n1_v2.prior = n1_v1

      const edges = Array.from(n1_v2.targetEdges())
      expect(edges).toHaveLength(1)
      expect(edges[0]).toBe(e1_v2) // Should be the newer version
      expect(edges[0].data.weight).toBe(2)
    })

    it('should handle multiple delta versions', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })
      const n4 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n4' }, { value: 'Node 4' })

      // v1: keyframe with e1
      const n1_v1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      n1_v1.targetMap?.set(e1, n2)
      n1_v1.complete = true

      // v2: add e2
      const n1_v2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )
      n1_v2.targetMap?.set(e2, n3)
      n1_v2.complete = false
      n1_v2.prior = n1_v1

      // v3: add e3
      const n1_v3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e3 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n4' },
        { weight: 3 },
        n1,
        n4
      )
      n1_v3.targetMap?.set(e3, n4)
      n1_v3.complete = false
      n1_v3.prior = n1_v2

      const edges = Array.from(n1_v3.targetEdges())
      expect(edges).toHaveLength(3)
      expect(edges.map(e => e.id).sort()).toEqual(['n1-n2', 'n1-n3', 'n1-n4'])
    })
  })

  describe('Tombstones (deletions)', () => {
    it('should skip edges marked as null (deleted)', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })

      // v1: keyframe with e1, e2
      const n1_v1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )
      n1_v1.targetMap?.set(e1, n2)
      n1_v1.targetMap?.set(e2, n3)
      n1_v1.complete = true

      // v2: delete e1
      const n1_v2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      n1_v2.targetMap?.set(e1, null) // Tombstone
      n1_v2.complete = false
      n1_v2.prior = n1_v1

      const edges = Array.from(n1_v2.targetEdges())
      expect(edges).toHaveLength(1)
      expect(edges[0]).toBe(e2)
    })

    it('should handle add, delete, and update in one chain', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })
      const n4 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n4' }, { value: 'Node 4' })

      // v1: keyframe with e1, e2
      const n1_v1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e1_v1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )
      n1_v1.targetMap?.set(e1_v1, n2)
      n1_v1.targetMap?.set(e2, n3)
      n1_v1.complete = true

      // v2: update e1
      const n1_v2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e1_v2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 10 },
        n1,
        n2
      )
      n1_v2.targetMap?.set(e1_v2, n2)
      n1_v2.complete = false
      n1_v2.prior = n1_v1

      // v3: delete e2, add e3
      const n1_v3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e3 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n4' },
        { weight: 3 },
        n1,
        n4
      )
      n1_v3.targetMap?.set(e2, null) // Delete
      n1_v3.targetMap?.set(e3, n4) // Add
      n1_v3.complete = false
      n1_v3.prior = n1_v2

      const edges = Array.from(n1_v3.targetEdges())
      expect(edges).toHaveLength(2)
      expect(edges.map(e => e.id).sort()).toEqual(['n1-n2', 'n1-n4'])

      // Check e1 has the updated weight
      const e1 = edges.find(e => e.id === 'n1-n2')
      expect(e1?.data.weight).toBe(10)
    })
  })

  describe('Keyframe stopping', () => {
    it('should stop at keyframe and not walk further', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Node 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Node 3' })

      // v0: old keyframe (should not be reached)
      const n1_v0 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e0 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 0 },
        n1,
        n2
      )
      n1_v0.targetMap?.set(e0, n2)
      n1_v0.complete = true

      // v1: new keyframe (should stop here)
      const n1_v1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      n1_v1.targetMap?.set(e1, n2)
      n1_v1.complete = true
      n1_v1.prior = n1_v0 // Link exists but should not traverse past keyframe

      // v2: delta
      const n1_v2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Node 1' })
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )
      n1_v2.targetMap?.set(e2, n3)
      n1_v2.complete = false
      n1_v2.prior = n1_v1

      const edges = Array.from(n1_v2.targetEdges())
      expect(edges).toHaveLength(2)
      expect(edges.map(e => e.id).sort()).toEqual(['n1-n2', 'n1-n3'])

      // e0 should NOT be included (weight 0)
      const weights = edges.map(e => e.data.weight)
      expect(weights).not.toContain(0)
      expect(weights).toContain(1)
      expect(weights).toContain(2)
    })
  })

  describe('sourceNodes and targetNodes helpers', () => {
    it('should correctly map edges to source nodes', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Source 1' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Source 2' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Target' })

      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 1 },
        n1,
        n3
      )
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n2', targetId: 'n3' },
        { weight: 2 },
        n2,
        n3
      )

      n3.sourceMap?.set(e1, n1)
      n3.sourceMap?.set(e2, n2)
      n3.complete = true

      const sources = Array.from(n3.sourceNodes())
      expect(sources).toHaveLength(2)
      expect(sources.map(n => n.data.value).sort()).toEqual(['Source 1', 'Source 2'])
    })

    it('should correctly map edges to target nodes', () => {
      const n1 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n1' }, { value: 'Source' })
      const n2 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n2' }, { value: 'Target 1' })
      const n3 = new GraphNode<TestNodeData, TestEdgeData>({ id: 'n3' }, { value: 'Target 2' })

      const e1 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n2' },
        { weight: 1 },
        n1,
        n2
      )
      const e2 = new GraphEdge<TestNodeData, TestEdgeData>(
        { sourceId: 'n1', targetId: 'n3' },
        { weight: 2 },
        n1,
        n3
      )

      n1.targetMap?.set(e1, n2)
      n1.targetMap?.set(e2, n3)
      n1.complete = true

      const targets = Array.from(n1.targetNodes())
      expect(targets).toHaveLength(2)
      expect(targets.map(n => n.data.value).sort()).toEqual(['Target 1', 'Target 2'])
    })
  })
})
