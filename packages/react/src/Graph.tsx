import React, { useEffect, useRef, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { graph, type API } from '@3plate/graph-core'
import type {
  APIArguments,
  APIOptions,
  CanvasOptions,
  NodeProps,
  Update,
  IngestionConfig,
} from '@3plate/graph-core'

/** Extends the core renderNode signature to also accept React nodes */
type ReactRenderNode<N> = (node: N, props?: NodeProps<N>) => ReactNode | HTMLElement

/** CanvasOptions with an extended renderNode that accepts React nodes */
type ReactCanvasOptions<N> = Omit<CanvasOptions<N>, 'renderNode'> & {
  renderNode?: ReactRenderNode<N>
}

/** APIOptions with the React-extended canvas options */
type ReactAPIOptions<N, E> = Omit<APIOptions<N, E>, 'canvas'> & {
  canvas?: ReactCanvasOptions<N>
}

export type GraphProps<N, E> = {
  /** Initial nodes */
  nodes?: N[]
  /** Initial edges */
  edges?: E[]
  /** Initial history */
  history?: Update<N, E>[]
  /** Ingestion source configuration (alternative to nodes/edges/history) */
  ingestion?: IngestionConfig
  /** Options */
  options?: ReactAPIOptions<N, E>
  /** Events */
  events?: APIArguments<N, E>['events']
}

/**
 * Converts ReactAPIOptions into core APIOptions.
 * When renderNode returns a ReactNode, a placeholder element is produced and
 * mountNode renders the React content into it synchronously via flushSync.
 */
function buildCoreOptions<N, E>(
  options: ReactAPIOptions<N, E> | undefined,
  pendingMounts: Map<HTMLElement, ReactNode>,
): APIOptions<N, E> | undefined {
  const userRenderNode = options?.canvas?.renderNode
  if (!userRenderNode) return options as APIOptions<N, E> | undefined

  return {
    ...options,
    canvas: {
      ...options?.canvas,
      renderNode: (node: N, nodeProps?: NodeProps<N>): HTMLElement => {
        const result = userRenderNode(node, nodeProps)
        if (result instanceof HTMLElement) return result
        const el = document.createElement('div')
        pendingMounts.set(el, result)
        return el
      },
      mountNode: (node: N, el: HTMLElement): (() => void) | void => {
        const reactNode = pendingMounts.get(el)
        if (reactNode === undefined) return
        pendingMounts.delete(el)
        const root = createRoot(el)
        flushSync(() => root.render(reactNode as ReactNode))
        return () => root.unmount()
      },
    },
  } as APIOptions<N, E>
}

/**
 * Graph component - renders a graph visualization.
 * Intelligently handles prop changes by diffing nodes, edges, and history.
 *
 * The `options.canvas.renderNode` function may return either an HTMLElement
 * or a React node (JSX). When JSX is returned the wrapper handles mounting
 * and cleanup automatically.
 */
export function Graph<N, E>(props: GraphProps<N, E>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<API<N, E> | null>(null)
  const rootIdRef = useRef<string>(`graph-${Math.random().toString(36).slice(2, 11)}`)
  const pendingMounts = useRef(new Map<HTMLElement, ReactNode>())

  // Initialize API once
  useEffect(() => {
    if (!rootRef.current || apiRef.current) return

    rootRef.current.id = rootIdRef.current

    graph({
      root: rootIdRef.current,
      nodes: props.nodes,
      edges: props.edges,
      history: props.history,
      ingestion: props.ingestion,
      options: buildCoreOptions(props.options, pendingMounts.current),
      events: props.events,
    }).then(api => {
      apiRef.current = api
    })

    return () => {
      // Cleanup
      if (apiRef.current) {
        apiRef.current.destroy()
        apiRef.current = null
      }
      if (rootRef.current) {
        // Remove canvas from DOM
        const canvas = rootRef.current.querySelector('canvas, svg')
        if (canvas) {
          canvas.remove()
        }
      }
    }
  }, []) // Only run once on mount

  // Handle prop changes using the centralized applyProps method
  useEffect(() => {
    if (!apiRef.current) return
    apiRef.current.applyProps({
      ...props,
      options: buildCoreOptions(props.options, pendingMounts.current),
    })
  }, [props.nodes, props.edges, props.history, props.options])

  return <div ref={rootRef} style={{ width: '100%', height: '100%' }} />
}
