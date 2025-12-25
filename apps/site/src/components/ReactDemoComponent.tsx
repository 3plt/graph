import React, { useEffect, useState } from 'react';
import { Graph } from '@3plate/graph-react';
import type { Example } from '../examples';
import { examples } from '../examples';
import { getResolvedColorMode, onColorModeChange } from '../utils/demoState';

interface ReactDemoComponentProps {
  example: Example;
  colorMode?: 'light' | 'dark' | 'system';
}

export default function ReactDemoComponent({ example: initialExample, colorMode: initialColorMode }: ReactDemoComponentProps) {
  const [example, setExample] = useState(initialExample);
  const [colorMode, setColorMode] = useState(initialColorMode || getResolvedColorMode());

  useEffect(() => {
    const container = document.getElementById('react-graph-container');
    if (!container) return;

    // Listen for demo updates from the Astro script
    const handleUpdate = (event: CustomEvent) => {
      if (event.detail?.example) {
        setExample(event.detail.example);
      }
      if (event.detail?.colorMode !== undefined) {
        setColorMode(event.detail.colorMode);
      }
    };

    container.addEventListener('demo-update', handleUpdate as EventListener);

    // Also listen for color mode changes
    const unsubscribe = onColorModeChange(() => {
      setColorMode(getResolvedColorMode());
    });

    return () => {
      container.removeEventListener('demo-update', handleUpdate as EventListener);
      unsubscribe();
    };
  }, []);

  // Watch for data attribute changes (fallback method)
  useEffect(() => {
    const container = document.getElementById('react-graph-container');
    if (!container) return;

    const observer = new MutationObserver(() => {
      const exampleKey = container.getAttribute('data-example-key');
      const colorModeAttr = container.getAttribute('data-color-mode');
      if (exampleKey && examples[exampleKey]) {
        setExample(examples[exampleKey]);
      }
      if (colorModeAttr && colorModeAttr !== colorMode) {
        setColorMode(colorModeAttr as 'light' | 'dark' | 'system');
      }
    });

    observer.observe(container, { attributes: true, attributeFilter: ['data-example-key', 'data-color-mode'] });

    return () => observer.disconnect();
  }, [colorMode]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Graph
        nodes={example.nodes as any}
        edges={example.edges as any}
        options={{
          ...example.options as any,
          canvas: {
            ...(example.options as any)?.canvas,
            colorMode: colorMode,
          },
        } as any}
      />
    </div>
  );
}
