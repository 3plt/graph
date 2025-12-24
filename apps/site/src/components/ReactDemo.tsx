import './demo.css'

export default function ReactDemo() {
  return (
    <div className="demo-wrapper">
      <div className="demo-info">
        <h3>React Implementation</h3>
        <p>
          Using <code>@3plate/graph-react</code> package
        </p>
      </div>

      <div className="placeholder">
        <p>React wrapper coming soon!</p>
        <code>npm install @3plate/graph-react</code>
      </div>

      <div className="code-example">
        <h4>Planned Usage</h4>
        <pre>
          <code>{`import { Graph } from '@3plate/graph-react';

function App() {
  return (
    <Graph
      nodes={['a', 'b', 'c', 'd']}
      edges={[
        { source: 'a', target: 'b' },
        { source: 'a', target: 'c' },
        { source: 'b', target: 'd' },
        { source: 'c', target: 'd' },
      ]}
    />
  );
}`}</code>
        </pre>
      </div>
    </div>
  )
}
