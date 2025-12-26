/**
 * Vue Playground component for @3plate/graph
 */

import { defineComponent, ref, onMounted, onUnmounted, watch, h, type PropType } from 'vue'
import { Playground as PlaygroundClass, type PlaygroundOptions, type Example } from '@3plate/graph-core'

export type PlaygroundProps = {
  /** Examples to display */
  examples: PlaygroundOptions['examples']
  /** Default example key */
  defaultExample?: string
}

/**
 * Playground component - renders the interactive playground with examples
 */
export const Playground = defineComponent({
  name: 'Playground',
  props: {
    /** Examples to display */
    examples: {
      type: Object as PropType<PlaygroundOptions['examples']>,
      required: true,
    },
    /** Default example key */
    defaultExample: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const rootRef = ref<HTMLDivElement | null>(null)
    const playgroundRef = ref<PlaygroundClass | null>(null)
    const rootId = `playground-${Math.random().toString(36).slice(2, 11)}`
    const prevExamples = ref<Record<string, Example>>({})

    // Initialize playground on mount
    onMounted(async () => {
      if (!rootRef.value) return

      rootRef.value.id = rootId

      const playground = new PlaygroundClass({
        root: rootId,
        examples: props.examples,
        defaultExample: props.defaultExample,
      })
      playgroundRef.value = playground
      prevExamples.value = { ...props.examples }
      await playground.init()
    })

    // Cleanup on unmount
    onUnmounted(() => {
      playgroundRef.value = null
    })

    // Watch for examples changes
    watch(
      () => props.examples,
      (current) => {
        if (!playgroundRef.value) return

        const playground = playgroundRef.value
        const prev = prevExamples.value

        // Get all keys from both previous and current
        const allKeys = new Set([...Object.keys(prev), ...Object.keys(current)])

        for (const key of allKeys) {
          const prevExample = prev[key]
          const currentExample = current[key]

          if (!prevExample && currentExample) {
            // Example was added
            playground.addExample(key, currentExample)
          } else if (prevExample && !currentExample) {
            // Example was removed
            playground.removeExample(key)
          } else if (prevExample && currentExample && !shallowEqualExample(prevExample, currentExample)) {
            // Example was modified
            playground.addExample(key, currentExample)
          }
        }

        prevExamples.value = { ...current }
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

/**
 * Shallow comparison of two Example objects
 */
function shallowEqualExample(a: Example, b: Example): boolean {
  if (a === b) return true
  if (a.name !== b.name) return false
  if (a.description !== b.description) return false
  if (!shallowEqualArray(a.nodes, b.nodes)) return false
  if (!shallowEqualArray(a.edges, b.edges)) return false
  if (!shallowEqualOptions(a.options, b.options)) return false
  if (!shallowEqualSource(a.source, b.source)) return false
  return true
}

/**
 * Shallow comparison of arrays
 */
function shallowEqualArray<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Shallow comparison of ExampleOptions
 */
function shallowEqualOptions(
  a: Example['options'],
  b: Example['options']
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a === b
}

/**
 * Shallow comparison of ExampleSource
 */
function shallowEqualSource(
  a: Example['source'],
  b: Example['source']
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.type !== b.type) return false
  if (a.type === 'file' && b.type === 'file') {
    return a.path === b.path
  }
  if (a.type === 'websocket' && b.type === 'websocket') {
    return a.url === b.url
  }
  return false
}

