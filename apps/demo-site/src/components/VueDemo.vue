<script setup lang="ts">
import { createGraph } from 'vue-steadyflow';
import './demo.css';

const graph = createGraph({
  nodes: [
    { id: '1', label: 'Start' },
    { id: '2', label: 'Process' },
    { id: '3', label: 'Decision' },
    { id: '4', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2', label: 'init' },
    { id: 'e2', source: '2', target: '3', label: 'evaluate' },
    { id: 'e3', source: '3', target: '4', label: 'complete' },
  ],
});

const nodeCount = graph.getNodes().length;
const edgeCount = graph.getEdges().length;
</script>

<template>
  <div class="demo-wrapper">
    <div class="demo-info">
      <h3>Vue Implementation</h3>
      <p>Using <code>vue-steadyflow</code> package</p>
      <div class="stats">
        <div class="stat">
          <span class="stat-label">Nodes:</span>
          <span class="stat-value">{{ nodeCount }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Edges:</span>
          <span class="stat-value">{{ edgeCount }}</span>
        </div>
      </div>
    </div>

    <div class="graph-placeholder">
      <div class="placeholder-content">
        <svg width="400" height="300" viewBox="0 0 400 300">
          <defs>
            <marker id="arrowhead-vue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#42b883" />
            </marker>
          </defs>
          
          <!-- Edges -->
          <line x1="80" y1="50" x2="180" y2="50" stroke="#42b883" stroke-width="2" marker-end="url(#arrowhead-vue)" />
          <line x1="230" y1="50" x2="320" y2="120" stroke="#42b883" stroke-width="2" marker-end="url(#arrowhead-vue)" />
          <line x1="320" y1="170" x2="320" y2="230" stroke="#42b883" stroke-width="2" marker-end="url(#arrowhead-vue)" />
          
          <!-- Nodes -->
          <g>
            <rect x="30" y="30" width="100" height="40" rx="5" fill="#42b883" stroke="#35495e" stroke-width="2" />
            <text x="80" y="55" text-anchor="middle" fill="white" font-size="14" font-weight="500">Start</text>
          </g>
          
          <g>
            <rect x="180" y="30" width="100" height="40" rx="5" fill="#42b883" stroke="#35495e" stroke-width="2" />
            <text x="230" y="55" text-anchor="middle" fill="white" font-size="14" font-weight="500">Process</text>
          </g>
          
          <g>
            <rect x="270" y="120" width="100" height="40" rx="5" fill="#42b883" stroke="#35495e" stroke-width="2" />
            <text x="320" y="145" text-anchor="middle" fill="white" font-size="14" font-weight="500">Decision</text>
          </g>
          
          <g>
            <rect x="270" y="230" width="100" height="40" rx="5" fill="#42b883" stroke="#35495e" stroke-width="2" />
            <text x="320" y="255" text-anchor="middle" fill="white" font-size="14" font-weight="500">End</text>
          </g>
        </svg>
        <p class="placeholder-note">Full interactive graph component coming soon!</p>
      </div>
    </div>

    <div class="code-example">
      <h4>Usage Example</h4>
      <pre><code>&lt;script setup&gt;
import { GraphView, createGraph } from 'vue-steadyflow';

const graph = createGraph({
  nodes: [
    { id: '1', label: 'Start' },
    { id: '2', label: 'Process' }
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' }
  ]
});
&lt;/script&gt;

&lt;template&gt;
  &lt;GraphView :graph="graph" /&gt;
&lt;/template&gt;</code></pre>
    </div>
  </div>
</template>
