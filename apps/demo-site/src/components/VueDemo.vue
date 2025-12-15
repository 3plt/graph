<script setup lang="ts">
import './demo.css';
</script>

<template>
  <div class="demo-wrapper">
    <div class="demo-info">
      <h3>Vue Implementation</h3>
      <p>Using <code>@3plate/graph-vue</code> package</p>
    </div>

    <div class="placeholder">
      <p>Vue wrapper coming soon!</p>
      <code>npm install @3plate/graph-vue</code>
    </div>

    <div class="code-example">
      <h4>Planned Usage</h4>
      <pre><code>&lt;script setup&gt;
import { Graph } from '@3plate/graph-vue';

const nodes = ['a', 'b', 'c', 'd'];
const edges = [
  { source: 'a', target: 'b' },
  { source: 'a', target: 'c' },
  { source: 'b', target: 'd' },
  { source: 'c', target: 'd' },
];
&lt;/script&gt;

&lt;template&gt;
  &lt;Graph :nodes="nodes" :edges="edges" /&gt;
&lt;/template&gt;</code></pre>
    </div>
  </div>
</template>
