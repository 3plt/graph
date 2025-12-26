import React, { useEffect, useRef } from 'react'
import { graph, type API } from '@3plate/graph-core'
import type { APIArguments, Update, IngestionConfig } from '@3plate/graph-core'

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
  options?: APIArguments<N, E>['options']
  /** Events */
  events?: APIArguments<N, E>['events']
}

/**
 * Graph component - renders a graph visualization
 * Intelligently handles prop changes by diffing nodes, edges, and history
 */
export function Graph<N, E>(props: GraphProps<N, E>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<API<N, E> | null>(null)
  const rootIdRef = useRef<string>(`graph-${Math.random().toString(36).slice(2, 11)}`)

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
      options: props.options,
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
    apiRef.current.applyProps(props)
  }, [props.nodes, props.edges, props.history, props.options])

  return <div ref={rootRef} style={{ width: '100%', height: '100%' }} />
}
