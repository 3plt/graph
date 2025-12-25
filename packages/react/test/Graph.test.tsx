import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Graph } from '../src/Graph'
import * as graphCore from '@3plate/graph-core'

// Mock the graph-core module
vi.mock('@3plate/graph-core', async () => {
  const actual = await vi.importActual('@3plate/graph-core')
  return {
    ...actual,
    graph: vi.fn(),
  }
})

describe('Graph', () => {
  const mockAPI = {
    replaceSnapshot: vi.fn().mockResolvedValue(undefined),
    replaceHistory: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock graph() to resolve with mockAPI and call onInit callback
    vi.mocked(graphCore.graph).mockImplementation(async (args) => {
      const api = mockAPI as any
      // Simulate async initialization - wait for next tick
      await new Promise(resolve => setTimeout(resolve, 0))
      // Call onInit if provided (this simulates the API's init() completing)
      if (args?.events?.onInit) {
        args.events.onInit()
      }
      return api
    })
  })

  it('should render a root div', () => {
    const { container } = render(<Graph nodes={[]} edges={[]} />)
    const rootDiv = container.firstChild as HTMLElement
    expect(rootDiv).toBeInTheDocument()
    expect(rootDiv.tagName).toBe('DIV')
    expect(rootDiv.style.width).toBe('100%')
    expect(rootDiv.style.height).toBe('100%')
  })

  it('should initialize the graph API on mount', async () => {
    render(<Graph nodes={[{ id: 'n1' }]} edges={[]} />)

    await waitFor(() => {
      expect(graphCore.graph).toHaveBeenCalledTimes(1)
    })

    const calls = vi.mocked(graphCore.graph).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    const call = calls[0]?.[0]
    expect(call).toBeDefined()
    expect(call?.nodes).toEqual([{ id: 'n1' }])
    expect(call?.edges).toEqual([])
    expect(call?.root).toMatch(/^graph-/)
  })

  it('should call replaceSnapshot when nodes change', async () => {
    const { rerender } = render(<Graph nodes={[{ id: 'n1' }]} edges={[]} />)

    await waitFor(() => {
      expect(graphCore.graph).toHaveBeenCalled()
    })

    rerender(<Graph nodes={[{ id: 'n1' }, { id: 'n2' }]} edges={[]} />)

    await waitFor(() => {
      expect(mockAPI.replaceSnapshot).toHaveBeenCalledWith(
        [{ id: 'n1' }, { id: 'n2' }],
        [],
        undefined
      )
    })
  })

  it('should call replaceHistory when history is completely replaced', async () => {
    const history1 = [{ addNodes: [{ id: 'n1' }] }]
    const history2 = [{ addNodes: [{ id: 'n2' }] }]

    const { rerender } = render(<Graph history={history1} />)

    await waitFor(() => {
      expect(graphCore.graph).toHaveBeenCalled()
    })

    rerender(<Graph history={history2} />)

    await waitFor(() => {
      expect(mockAPI.replaceHistory).toHaveBeenCalledWith(history2)
    })
  })

  it('should call update when history is appended', async () => {
    const history1 = [{ addNodes: [{ id: 'n1' }] }]
    const history2 = [
      { addNodes: [{ id: 'n1' }] },
      { addNodes: [{ id: 'n2' }] },
    ]

    const { rerender } = render(<Graph history={history1} />)

    // Wait for graph() to be called
    await waitFor(() => {
      expect(graphCore.graph).toHaveBeenCalled()
    }, { timeout: 1000 })

    // Wait for the promise to resolve (which sets apiRef.current)
    // The mock calls onInit after a setTimeout(0), so we need to wait
    await new Promise(resolve => setTimeout(resolve, 10))

    // Now rerender with appended history
    rerender(<Graph history={history2} />)

    await waitFor(() => {
      expect(mockAPI.update).toHaveBeenCalled()
    }, { timeout: 1000 })
  })
})

