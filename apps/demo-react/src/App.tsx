import { createGraph } from 'react-steadyflow';

function App() {
  const graph = createGraph({
    nodes: [
      { id: '1', label: 'Node 1' },
      { id: '2', label: 'Node 2' },
      { id: '3', label: 'Node 3' },
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', label: 'Edge 1-2' },
      { id: 'e2', source: '2', target: '3', label: 'Edge 2-3' },
    ],
  });

  return (
    <div className="app">
      <h1>SteadyFlow Demo</h1>
      <p>Graph library with stable layout and incremental updates</p>
      <div className="graph-container">
        {/* GraphView component will be implemented here */}
        <p>Graph nodes: {graph.getNodes().length}</p>
        <p>Graph edges: {graph.getEdges().length}</p>
      </div>
    </div>
  );
}

export default App;
