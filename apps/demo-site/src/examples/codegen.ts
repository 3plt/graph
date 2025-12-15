/**
 * Generate framework-specific code snippets from example data.
 */

import type { Example, ExampleNode, ExampleEdge } from './index'

function stringifyValue(value: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent)

  if (typeof value === 'string') {
    return `'${value}'`
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'

    // Check if all items are simple strings
    if (value.every(v => typeof v === 'string')) {
      const items = value.map(v => `'${v}'`).join(', ')
      if (items.length < 60) return `[${items}]`
    }

    const items = value.map(v => stringifyValue(v, indent + 1))
    return `[\n${spaces}  ${items.join(`,\n${spaces}  `)}\n${spaces}]`
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
    if (entries.length === 0) return '{}'

    // Simple one-liner for small objects
    const simple = entries.map(([k, v]) => `${k}: ${stringifyValue(v, 0)}`).join(', ')
    if (simple.length < 50 && !simple.includes('\n')) {
      return `{ ${simple} }`
    }

    const lines = entries.map(([k, v]) => `${spaces}  ${k}: ${stringifyValue(v, indent + 1)}`)
    return `{\n${lines.join(',\n')}\n${spaces}}`
  }

  return String(value)
}

function formatNodes(nodes: ExampleNode[]): string {
  return stringifyValue(nodes, 2)
}

function formatEdges(edges: ExampleEdge[]): string {
  return stringifyValue(edges, 2)
}

function formatOptions(options: any): string {
  if (!options) return ''
  return stringifyValue(options, 2)
}

export function generateCoreCode(example: Example): string {
  const { nodes, edges, options } = example

  let code = `import { graph } from '@3plate/graph-core';

await graph({
  root: 'app',
  nodes: ${formatNodes(nodes)},
  edges: ${formatEdges(edges)}`

  if (options) {
    code += `,
  options: ${formatOptions(options)}`
  }

  code += `
});`

  return code
}

export function generateReactCode(example: Example): string {
  const { nodes, edges, options } = example

  let code = `import { Graph } from '@3plate/graph-react';

function App() {
  return (
    <Graph
      nodes={${formatNodes(nodes)}}
      edges={${formatEdges(edges)}}`

  if (options) {
    code += `
      options={${formatOptions(options)}}`
  }

  code += `
    />
  );
}`

  return code
}

export function generateVueCode(example: Example): string {
  const { nodes, edges, options } = example

  let code = `<script setup>
import { Graph } from '@3plate/graph-vue';

const nodes = ${formatNodes(nodes)};
const edges = ${formatEdges(edges)};`

  if (options) {
    code += `
const options = ${formatOptions(options)};`
  }

  code += `
</script>

<template>
  <Graph :nodes="nodes" :edges="edges"`

  if (options) {
    code += ` :options="options"`
  }

  code += ` />
</template>`

  return code
}

export function generateAngularCode(example: Example): string {
  const { nodes, edges, options } = example

  let code = `import { Component } from '@angular/core';
import { GraphComponent } from '@3plate/graph-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GraphComponent],
  template: \`
    <graph
      [nodes]="nodes"
      [edges]="edges"`

  if (options) {
    code += `
      [options]="options"`
  }

  code += `
    />
  \`
})
export class AppComponent {
  nodes = ${formatNodes(nodes)};
  edges = ${formatEdges(edges)};`

  if (options) {
    code += `
  options = ${formatOptions(options)};`
  }

  code += `
}`

  return code
}

export const codeGenerators = {
  core: generateCoreCode,
  react: generateReactCode,
  vue: generateVueCode,
  angular: generateAngularCode,
}
