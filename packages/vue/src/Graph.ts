/**
 * Vue Graph component for @3plate/graph
 */

import { defineComponent, ref, onMounted, onUnmounted, watch, h, type PropType } from 'vue'
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
export const Graph = defineComponent({
  name: 'Graph',
  props: {
    /** Initial nodes */
    nodes: {
      type: Array as PropType<any[]>,
      default: undefined,
    },
    /** Initial edges */
    edges: {
      type: Array as PropType<any[]>,
      default: undefined,
    },
    /** Initial history */
    history: {
      type: Array as PropType<Update<any, any>[]>,
      default: undefined,
    },
    /** Ingestion source configuration */
    ingestion: {
      type: Object as PropType<IngestionConfig>,
      default: undefined,
    },
    /** Options */
    options: {
      type: Object as PropType<APIArguments<any, any>['options']>,
      default: undefined,
    },
    /** Events */
    events: {
      type: Object as PropType<APIArguments<any, any>['events']>,
      default: undefined,
    },
  },
  setup(props) {
    const rootRef = ref<HTMLDivElement | null>(null)
    const apiRef = ref<API<any, any> | null>(null)
    const rootId = `graph-${Math.random().toString(36).slice(2, 11)}`

    // Initialize API on mount
    onMounted(async () => {
      if (!rootRef.value) return

      rootRef.value.id = rootId

      const api = await graph({
        root: rootId,
        nodes: props.nodes,
        edges: props.edges,
        history: props.history,
        ingestion: props.ingestion,
        options: props.options,
        events: props.events,
      })

      apiRef.value = api
    })

    // Cleanup on unmount
    onUnmounted(() => {
      if (apiRef.value) {
        apiRef.value.destroy()
        apiRef.value = null
      }
      if (rootRef.value) {
        const canvas = rootRef.value.querySelector('canvas, svg')
        if (canvas) {
          canvas.remove()
        }
      }
    })

    // Watch for prop changes using the centralized applyProps method
    watch(
      () => [props.nodes, props.edges, props.history, props.options],
      () => {
        if (!apiRef.value) return
        apiRef.value.applyProps({ nodes: props.nodes, edges: props.edges, history: props.history, options: props.options })
      },
      { deep: true }
    )

    return () =>
      h('div', {
        ref: rootRef,
        style: { width: '100%', height: '100%' },
      })
  },
})
