import { PublicEdgeData } from '../graph/edge'
export { default as styles } from './marker.css?raw'

export type MarkerType = 'arrow' | 'circle' | 'diamond' | 'bar' | 'none'

export type Markers = {
  source?: MarkerType
  target?: MarkerType
}

export function arrow(size: number, classPrefix: string, reverse: boolean = false): SVGElement {
  const h = size / 1.5
  const w = size
  const ry = h / 2
  const suffix = reverse ? '-reverse' : ''
  return (
    <marker
      id={`g3p-marker-arrow${suffix}`}
      className={`${classPrefix}-marker ${classPrefix}-marker-arrow`}
      markerWidth={size}
      markerHeight={size}
      refX="2"
      refY={ry}
      orient={reverse ? 'auto-start-reverse' : 'auto'}
      markerUnits="userSpaceOnUse"
    >
      <path d={`M0,0 L0,${h} L${w},${ry} z`} />
    </marker>
  ) as SVGElement
}

export function circle(size: number, classPrefix: string, reverse: boolean = false): SVGElement {
  const r = size / 3
  const cy = size / 2
  const suffix = reverse ? '-reverse' : ''
  return (
    <marker
      id={`g3p-marker-circle${suffix}`}
      className={`${classPrefix}-marker ${classPrefix}-marker-circle`}
      markerWidth={size}
      markerHeight={size}
      refX="2"
      refY={cy}
      orient={reverse ? 'auto-start-reverse' : 'auto'}
      markerUnits="userSpaceOnUse"
    >
      <circle cx={r + 2} cy={cy} r={r} />
    </marker>
  ) as SVGElement
}

export function diamond(size: number, classPrefix: string, reverse: boolean = false): SVGElement {
  const w = size * 0.7
  const h = size / 2
  const cy = size / 2
  const suffix = reverse ? '-reverse' : ''
  return (
    <marker
      id={`g3p-marker-diamond${suffix}`}
      className={`${classPrefix}-marker ${classPrefix}-marker-diamond`}
      markerWidth={size}
      markerHeight={size}
      refX="2"
      refY={cy}
      orient={reverse ? 'auto-start-reverse' : 'auto'}
      markerUnits="userSpaceOnUse"
    >
      <path d={`M2,${cy} L${2 + w / 2},${cy - h / 2} L${2 + w},${cy} L${2 + w / 2},${cy + h / 2} z`} />
    </marker>
  ) as SVGElement
}

export function bar(size: number, classPrefix: string, reverse: boolean = false): SVGElement {
  const h = size * 0.6
  const cy = size / 2
  const suffix = reverse ? '-reverse' : ''
  return (
    <marker
      id={`g3p-marker-bar${suffix}`}
      className={`${classPrefix}-marker ${classPrefix}-marker-bar`}
      markerWidth={size}
      markerHeight={size}
      refX="2"
      refY={cy}
      orient={reverse ? 'auto-start-reverse' : 'auto'}
      markerUnits="userSpaceOnUse"
    >
      <line x1="2" y1={cy - h / 2} x2="2" y2={cy + h / 2} stroke-width="2" />
    </marker>
  ) as SVGElement
}

export function none(size: number, classPrefix: string, reverse: boolean = false): SVGElement | undefined {
  return undefined
}

type MarkerObj = {
  source?: { marker?: MarkerType }
  target?: { marker?: MarkerType }
  style?: { marker?: { source?: MarkerType, target?: MarkerType } }
}

export function normalize(data: MarkerObj): Markers {
  let source: MarkerType | undefined = data.source?.marker ?? data.style?.marker?.source
  let target: MarkerType | undefined = data.target?.marker ?? data.style?.marker?.target ?? 'arrow'
  if (source == 'none') source = undefined
  if (target == 'none') target = undefined
  return { source, target }
}

type MarkerFunc = (size: number, classPrefix: string, reverse?: boolean) => SVGElement | undefined

export const markerDefs: Record<MarkerType, MarkerFunc> = {
  arrow,
  circle,
  diamond,
  bar,
  none,
}
