import { renderNode } from '../canvas/render-node'
import {
  APIOptions,
  GraphOptions,
  CanvasOptions,
  PropsOptions,
  NodeProps,
  EdgeProps,
  PortProps,
} from './options'

export type Defaults<N, E> = {
  graph: Required<GraphOptions>
  canvas: Required<CanvasOptions<N>>
  props: PropsOptions<N, E>
}

export function applyDefaults<N, E>(options?: APIOptions<N, E>): Defaults<N, E> {
  const { graph, canvas, props } = defaults<N, E>()
  return {
    graph: { ...graph, ...options?.graph },
    canvas: { ...canvas, ...options?.canvas },
    props: { ...props, ...options?.props },
  }
}

function defaults<N, E>(): Defaults<N, E> {
  return {
    graph: {
      mergeOrder: ['target', 'source'],
      nodeMargin: 15,
      dummyNodeSize: 15,
      nodeAlign: 'natural',
      edgeSpacing: 10,
      turnRadius: 10,
      orientation: 'TB',
      layerMargin: 5,
      alignIterations: 5,
      alignThreshold: 10,
      separateTrackSets: true,
      markerSize: 10,
      layoutSteps: null,
    },
    canvas: {
      renderNode,
      nodeStyle: {},
      edgeStyle: {},
      portStyle: 'outside',
      classPrefix: 'g3p',
      width: '100%',
      height: '100%',
      editable: false,
      panZoom: true,
      markerSize: 10,
    },
    props: {},
  }
}