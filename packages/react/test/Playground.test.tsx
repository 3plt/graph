import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Playground } from '../src/Playground'
import * as graphCore from '@3plate/graph-core'

// Mock the graph-core module
vi.mock('@3plate/graph-core', async () => {
  const actual = await vi.importActual('@3plate/graph-core')
  return {
    ...actual,
    Playground: vi.fn().mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      addExample: vi.fn(),
      removeExample: vi.fn(),
    })),
  }
})

describe('Playground', () => {
  const mockPlayground = {
    init: vi.fn().mockResolvedValue(undefined),
    addExample: vi.fn(),
    removeExample: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(graphCore.Playground).mockImplementation(() => mockPlayground as any)
  })

  const mockExamples = {
    example1: {
      name: 'Example 1',
      nodes: [{ id: 'n1' }],
      edges: [],
    },
    example2: {
      name: 'Example 2',
      nodes: [{ id: 'n2' }],
      edges: [],
    },
  }

  it('should render a root div', () => {
    const { container } = render(<Playground examples={mockExamples} />)
    const rootDiv = container.firstChild as HTMLElement
    expect(rootDiv).toBeInTheDocument()
    expect(rootDiv.tagName).toBe('DIV')
    expect(rootDiv.style.width).toBe('100%')
    expect(rootDiv.style.height).toBe('100%')
  })

  it('should initialize the playground on mount', async () => {
    render(<Playground examples={mockExamples} />)

    await waitFor(() => {
      expect(graphCore.Playground).toHaveBeenCalledTimes(1)
      expect(mockPlayground.init).toHaveBeenCalledTimes(1)
    })

    const calls = vi.mocked(graphCore.Playground).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    const call = calls[0]?.[0]
    expect(call).toBeDefined()
    expect(call?.examples).toEqual(mockExamples)
    expect(call?.root).toMatch(/^playground-/)
  })

  it('should call addExample when a new example is added', async () => {
    const newExamples = {
      ...mockExamples,
      example3: {
        name: 'Example 3',
        nodes: [{ id: 'n3' }],
        edges: [],
      },
    }

    const { rerender } = render(<Playground examples={mockExamples} />)

    await waitFor(() => {
      expect(graphCore.Playground).toHaveBeenCalled()
    })

    rerender(<Playground examples={newExamples} />)

    await waitFor(() => {
      expect(mockPlayground.addExample).toHaveBeenCalledWith('example3', newExamples.example3)
    })
  })

  it('should call removeExample when an example is removed', async () => {
    const { rerender } = render(<Playground examples={mockExamples} />)

    await waitFor(() => {
      expect(graphCore.Playground).toHaveBeenCalled()
    })

    const reducedExamples = { example1: mockExamples.example1 }
    rerender(<Playground examples={reducedExamples} />)

    await waitFor(() => {
      expect(mockPlayground.removeExample).toHaveBeenCalledWith('example2')
    })
  })

  it('should call addExample when an example is modified', async () => {
    const { rerender } = render(<Playground examples={mockExamples} />)

    await waitFor(() => {
      expect(graphCore.Playground).toHaveBeenCalled()
    })

    const modifiedExamples = {
      ...mockExamples,
      example1: {
        ...mockExamples.example1,
        name: 'Modified Example 1',
      },
    }
    rerender(<Playground examples={modifiedExamples} />)

    await waitFor(() => {
      expect(mockPlayground.addExample).toHaveBeenCalledWith('example1', modifiedExamples.example1)
    })
  })
})

