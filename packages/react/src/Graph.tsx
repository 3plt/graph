import React, { useEffect, useRef } from 'react'
import { graph, type API } from '@3plate/graph-core'
import type { APIArguments, Update } from '@3plate/graph-core'

export type GraphProps<N, E> = {
  /** Initial nodes */
  nodes?: N[]
  /** Initial edges */
  edges?: E[]
  /** Initial history */
  history?: Update<N, E>[]
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
  const prevPropsRef = useRef<{
    nodes?: N[]
    edges?: E[]
    history?: Update<N, E>[]
    options?: APIArguments<N, E>['options']
  }>({})

  // Initialize API once
  useEffect(() => {
    if (!rootRef.current || apiRef.current) return

    rootRef.current.id = rootIdRef.current

    // Initialize prevPropsRef with initial props immediately
    prevPropsRef.current = {
      nodes: props.nodes,
      edges: props.edges,
      history: props.history,
      options: props.options,
    }

    graph({
      root: rootIdRef.current,
      nodes: props.nodes,
      edges: props.edges,
      history: props.history,
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

  // Handle prop changes
  useEffect(() => {
    if (!apiRef.current) return

    const api = apiRef.current
    const prev = prevPropsRef.current

    // Check if nodes/edges changed
    const nodesChanged = !shallowEqual(props.nodes, prev.nodes)
    const edgesChanged = !shallowEqual(props.edges, prev.edges)

    if (nodesChanged || edgesChanged) {
      // Nodes or edges changed - replace snapshot
      if (props.nodes) {
        api.replaceSnapshot(props.nodes, props.edges || [], undefined)
      }
      prevPropsRef.current = { ...prevPropsRef.current, nodes: props.nodes, edges: props.edges }
      return
    }

    // Check if history changed
    if (props.history !== prev.history) {
      if (props.history === undefined) {
        // History was removed - if we have nodes/edges, use those
        if (props.nodes) {
          api.replaceSnapshot(props.nodes, props.edges || [], undefined)
        }
        prevPropsRef.current = { ...prevPropsRef.current, history: props.history }
        return
      }

      // Check if history was appended or completely replaced
      if (prev.history && isHistoryAppended(prev.history, props.history)) {
        // History was appended - apply only the new frames
        const prevLength = prev.history.length
        const newFrames = props.history.slice(prevLength)
        for (const frame of newFrames) {
          api.update((u: any) => {
            if (frame.addNodes) u.addNodes(...frame.addNodes)
            if (frame.removeNodes) u.deleteNodes(...frame.removeNodes)
            if (frame.updateNodes) u.updateNodes(...frame.updateNodes)
            if (frame.addEdges) u.addEdges(...frame.addEdges)
            if (frame.removeEdges) u.deleteEdges(...frame.removeEdges)
            if (frame.updateEdges) u.updateEdges(...frame.updateEdges)
            if (frame.description) u.describe(frame.description)
          })
        }
      } else {
        // History was completely replaced
        api.replaceHistory(props.history)
      }
      prevPropsRef.current = { ...prevPropsRef.current, history: props.history }
    }
  }, [props.nodes, props.edges, props.history])

  // Handle canvas options changes (theme, nodeTypes, edgeTypes, colorMode)
  useEffect(() => {
    if (!apiRef.current) return

    const api = apiRef.current
    const prev = prevPropsRef.current.options
    const curr = props.options

    // Extract style-related options
    const prevCanvas = prev?.canvas as any
    const currCanvas = curr?.canvas as any

    // Handle color mode changes
    const colorModeChanged = prevCanvas?.colorMode !== currCanvas?.colorMode
    if (colorModeChanged && currCanvas?.colorMode) {
      api.setColorMode(currCanvas.colorMode)
    }

    // Handle theme/type style changes
    const themeChanged = prevCanvas?.theme !== currCanvas?.theme
    const nodeTypesChanged = prevCanvas?.nodeTypes !== currCanvas?.nodeTypes
    const edgeTypesChanged = prevCanvas?.edgeTypes !== currCanvas?.edgeTypes

    if (themeChanged || nodeTypesChanged || edgeTypesChanged) {
      api.updateStyles({
        theme: currCanvas?.theme,
        nodeTypes: currCanvas?.nodeTypes,
        edgeTypes: currCanvas?.edgeTypes,
      })
    }

    prevPropsRef.current = { ...prevPropsRef.current, options: props.options }
  }, [props.options])

  return <div ref={rootRef} style={{ width: '100%', height: '100%' }} />
}

/**
 * Check if two arrays are shallowly equal
 * For objects, does a shallow property comparison
 */
function shallowEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      // If not the same reference, check if they're objects with the same properties
      if (typeof a[i] === 'object' && a[i] !== null && typeof b[i] === 'object' && b[i] !== null) {
        const aObj = a[i] as any
        const bObj = b[i] as any
        const aKeys = Object.keys(aObj)
        const bKeys = Object.keys(bObj)
        if (aKeys.length !== bKeys.length) return false
        for (const key of aKeys) {
          if (aObj[key] !== bObj[key]) return false
        }
      } else {
        return false
      }
    }
  }
  return true
}

/**
 * Check if newHistory is an append of oldHistory (i.e., oldHistory is a prefix of newHistory)
 */
function isHistoryAppended<N, E>(
  oldHistory: Update<N, E>[],
  newHistory: Update<N, E>[]
): boolean {
  if (newHistory.length < oldHistory.length) return false
  for (let i = 0; i < oldHistory.length; i++) {
    if (!shallowEqualUpdates(oldHistory[i], newHistory[i])) {
      return false
    }
  }
  return true
}

/**
 * Check if two Update objects are shallowly equal
 */
function shallowEqualUpdates<N, E>(a: Update<N, E>, b: Update<N, E>): boolean {
  if (a === b) return true
  if (a.description !== b.description) return false
  if (!shallowEqual(a.addNodes, b.addNodes)) return false
  if (!shallowEqual(a.removeNodes, b.removeNodes)) return false
  if (!shallowEqual(a.updateNodes, b.updateNodes)) return false
  if (!shallowEqual(a.addEdges, b.addEdges)) return false
  if (!shallowEqual(a.removeEdges, b.removeEdges)) return false
  if (!shallowEqual(a.updateEdges, b.updateEdges)) return false
  return true
}

