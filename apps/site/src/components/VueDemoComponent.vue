<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Graph } from '@3plate/graph-vue'
import type { Example } from '../examples'
import { examples } from '../examples'
import { getResolvedColorMode, onColorModeChange } from '../utils/demoState'

const props = defineProps<{
  example: Example
  colorMode?: 'light' | 'dark' | 'system'
}>()

const currentExample = ref<Example>(props.example)
const currentColorMode = ref(props.colorMode || getResolvedColorMode())

// Computed options with color mode
const graphOptions = computed(() => ({
  ...(currentExample.value.options as any),
  canvas: {
    ...(currentExample.value.options as any)?.canvas,
    colorMode: currentColorMode.value,
  },
}))

onMounted(() => {
  const container = document.getElementById('vue-graph-container')
  if (!container) return

  // Listen for demo updates from the Astro script
  const handleUpdate = (event: CustomEvent) => {
    if (event.detail?.example) {
      currentExample.value = event.detail.example
    }
    if (event.detail?.colorMode !== undefined) {
      currentColorMode.value = event.detail.colorMode
    }
  }

  container.addEventListener('demo-update', handleUpdate as EventListener)

  // Also listen for color mode changes
  const unsubscribe = onColorModeChange(() => {
    currentColorMode.value = getResolvedColorMode()
  })

  // Watch for data attribute changes (fallback method)
  const observer = new MutationObserver(() => {
    const exampleKey = container.getAttribute('data-example-key')
    const colorModeAttr = container.getAttribute('data-color-mode')
    if (exampleKey && examples[exampleKey]) {
      currentExample.value = examples[exampleKey]
    }
    if (colorModeAttr && colorModeAttr !== currentColorMode.value) {
      currentColorMode.value = colorModeAttr as 'light' | 'dark' | 'system'
    }
  })

  observer.observe(container, { attributes: true, attributeFilter: ['data-example-key', 'data-color-mode'] })

  // Store cleanup functions
  const cleanup = () => {
    container.removeEventListener('demo-update', handleUpdate as EventListener)
    unsubscribe()
    observer.disconnect()
  }

  // Attach cleanup to the component
  onUnmounted(cleanup)
})
</script>

<template>
  <div style="width: 100%; height: 100%">
    <Graph
      :nodes="(currentExample.nodes as any)"
      :edges="(currentExample.edges as any)"
      :options="graphOptions"
    />
  </div>
</template>

