import React, { useEffect, useRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { graph, type API } from '@3plate/graph-core'
import type {
  APIArguments,
  APIOptions as APIOptions_,
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
export type APIOptions<N, E> = Omit<APIOptions_<N, E>, 'canvas'> & {
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
  options?: APIOptions<N, E>
  /** Events */
  events?: APIArguments<N, E>['events']
}

/**
 * Converts APIOptions into core APIOptions.
 *
 * When renderNode returns a ReactNode, a placeholder div is produced and
 * mountNode renders the content into it synchronously via flushSync + createRoot.
 *
 * flushSync is safe here because graph() is called from a setTimeout,
 * not directly inside a React lifecycle method.
 */
function buildCoreOptions<N, E>(
  options: APIOptions<N, E> | undefined,
  roots: Map<HTMLElement, Root>,
): APIOptions_<N, E> | undefined {
  const userRenderNode = options?.canvas?.renderNode
  if (!userRenderNode) return options as unknown as APIOptions_<N, E> | undefined

  const pending = new Map<HTMLElement, ReactNode>()

  return {
    ...options,
    canvas: {
      ...options?.canvas,
      renderNode: (node: N, nodeProps?: NodeProps<N>): HTMLElement => {
        const result = userRenderNode(node, nodeProps)
        if (result instanceof HTMLElement) return result
        const el = document.createElement('div')
        pending.set(el, result)
        return el
      },
      mountNode: (_node: N, el: HTMLElement): (() => void) | void => {
        const content = pending.get(el)
        if (content === undefined) return
        pending.delete(el)
        const root = createRoot(el)
        flushSync(() => root.render(content as ReactNode))
        roots.set(el, root)
        return () => {
          roots.delete(el)
          setTimeout(() => root.unmount(), 0)
        }
      },
    },
  } as unknown as APIOptions_<N, E>
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
  const reactRoots = useRef(new Map<HTMLElement, Root>())

  // Initialize API once
  useEffect(() => {
    if (!rootRef.current || apiRef.current) return

    rootRef.current.id = rootIdRef.current

    // Use setTimeout to escape the React lifecycle context.
    // This allows flushSync inside mountNode to work without
    // "flushSync was called from inside a lifecycle method" errors.
    const timer = setTimeout(() => {
      graph({
        root: rootIdRef.current,
        nodes: props.nodes,
        edges: props.edges,
        history: props.history,
        ingestion: props.ingestion,
        options: buildCoreOptions(props.options, reactRoots.current),
        events: props.events,
      }).then(api => {
        apiRef.current = api
      })
    }, 0)

    return () => {
      clearTimeout(timer)
      for (const root of reactRoots.current.values()) {
        setTimeout(() => root.unmount(), 0)
      }
      reactRoots.current.clear()
      if (apiRef.current) {
        apiRef.current.destroy()
        apiRef.current = null
      }
      if (rootRef.current) {
        rootRef.current.innerHTML = ''
      }
    }
  }, []) // Only run once on mount

  // Handle prop changes using the centralized applyProps method
  useEffect(() => {
    if (!apiRef.current) return
    apiRef.current.applyProps({
      ...props,
      options: buildCoreOptions(props.options, reactRoots.current),
    })
  }, [props.nodes, props.edges, props.history, props.options])

  return <div ref={rootRef} style={{ width: '100%', height: '100%' }} />
}
