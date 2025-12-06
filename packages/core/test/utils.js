import { expect } from 'vitest'

export function expectSegs(graph, segs) {
  const nodeSet = new Set()
  const dummyMap = new Map()
  const segSet = new Set()
  for (let [edgeId, chain] of Object.entries(segs)) {
    edgeId = `e:${edgeId}`
    const edge = graph.getEdge(edgeId)
    // find actual chain of nodes; assert that they
    // chain together (tgt_i == src_(i+1))
    const actual = [edge.source.id]
    for (const segId of edge.segs) {
      segSet.add(segId)
      const seg = graph.getSeg(segId)
      expect(
        seg.source.id,
        `segment ${segId} of edge ${edgeId} has a broken chain`
      ).toBe(actual[actual.length - 1])
      actual.push(seg.target.id)
    }
    expect(
      actual[actual.length - 1],
      `final segment of edge ${edgeId} has wrong target`
    ).toBe(edge.target.id)
    // make sure chain is correct length
    const parts = chain.split('-')
    expect(
      actual.length,
      `segment chain of edge ${edgeId} has wrong length; expected ${parts}, got ${actual}`
    ).toBe(parts.length)
    // step through each node in the chain
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].match(/^d\d+$/)) {
        // check that the node is a dummy
        expect(
          graph._isDummyId(actual[i]),
          `segment ${i} of edge ${edgeId} should have been dummy; expected ${parts}, got ${actual}`
        ).toBe(true)
        // check that the dummy is the same as expected
        const didx = parseInt(parts[i].slice(1))
        if (!dummyMap.has(didx)) {
          dummyMap.set(didx, actual[i])
        } else {
          expect(
            actual[i],
            `dummy mismatch for edge ${edgeId}; d${didx} was ${dummyMap.get(didx)}, got ${actual[i]}`
          ).toBe(dummyMap.get(didx))
        }
      } else {
        // check that the node is the correct non-dummy
        nodeSet.add(parts[i])
        expect(
          actual[i],
          `segment ${i} of edge ${edgeId} should have been ${parts[i]}; expected ${parts}, got ${actual}`
        ).toBe(parts[i])
      }
    }
  }
  // make sure set of nodes matches
  expect(
    graph.nodes.keySeq().toArray().sort(),
    'nodes mismatch'
  ).toEqual([...nodeSet, ...dummyMap.values()].sort())
  // make sure set of edges matches
  expect(
    graph.edges.keySeq().toArray().sort(),
    'edges mismatch'
  ).toEqual(Object.keys(segs).map(id => `e:${id}`).sort())
  // make sure set of segs matches
  expect(
    graph.segs.keySeq().toArray().sort(),
    'segments mismatch'
  ).toEqual([...segSet].sort())
}