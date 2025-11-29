import { createGraph } from 'react-steadyflow';
import './demo.css';

export default function ReactDemo() {
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

  return (
    <div className="demo-wrapper">
      <div className="demo-info">
        <h3>React Implementation</h3>
        <p>Using <code>react-steadyflow</code> package</p>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Nodes:</span>
            <span className="stat-value">{graph.getNodes().length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Edges:</span>
            <span className="stat-value">{graph.getEdges().length}</span>
          </div>
        </div>
      </div>

      <div className="graph-placeholder">
        <div className="placeholder-content">
          <svg width="400" height="300" viewBox="0 0 400 300">
            {/* Simple placeholder visualization */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Edges */}
            <line x1="80" y1="50" x2="180" y2="50" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <line x1="230" y1="50" x2="320" y2="120" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <line x1="320" y1="170" x2="320" y2="230" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead)" />

            {/* Nodes */}
            <g>
              <rect x="30" y="30" width="100" height="40" rx="5" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
              <text x="80" y="55" textAnchor="middle" fill="white" fontSize="14" fontWeight="500">Start</text>
            </g>

            <g>
              <rect x="180" y="30" width="100" height="40" rx="5" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
              <text x="230" y="55" textAnchor="middle" fill="white" fontSize="14" fontWeight="500">Process</text>
            </g>

            <g>
              <rect x="270" y="120" width="100" height="40" rx="5" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
              <text x="320" y="145" textAnchor="middle" fill="white" fontSize="14" fontWeight="500">Decision</text>
            </g>

            <g>
              <rect x="270" y="230" width="100" height="40" rx="5" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
              <text x="320" y="255" textAnchor="middle" fill="white" fontSize="14" fontWeight="500">End</text>
            </g>
          </svg>
          <p className="placeholder-note">Full interactive graph component coming soon!</p>
        </div>
      </div>

      <div className="code-example">
        <h4>Usage Example</h4>
        <pre><code>{`import { GraphView, createGraph } from 'react-steadyflow';

const graph = createGraph({
  nodes: [
    { id: '1', label: 'Start' },
    { id: '2', label: 'Process' }
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' }
  ]
});

function App() {
  return <GraphView graph={graph} />;
}`}</code></pre>
      </div>
    </div>
  );
}
