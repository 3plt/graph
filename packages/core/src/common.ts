export type Dir = 'in' | 'out'
export type Side = 'source' | 'target'
export type MergeOrder = Side[]
export type NodeAlign = 'natural' | 'top' | 'bottom' | 'left' | 'right'
export type Orientation = 'TB' | 'BT' | 'LR' | 'RL'
export type Nav = 'first' | 'last' | 'prev' | 'next'
export type PortStyle = 'inside' | 'outside' | 'custom'
export type LayoutStep = 'alignChildren' | 'alignParents' | 'compact'
export type LinkType = 'edges' | 'segs'

export type Dims = {
  w: number
  h: number
}

export type Pos = {
  x: number
  y: number
}

/** Screen coordinates - pixels relative to the browser viewport */
export type ScreenPos = Pos & { _brand: 'screen' }

/** Canvas coordinates - pixels relative to the canvas container element */
export type CanvasPos = Pos & { _brand: 'canvas' }

/** Graph coordinates - SVG units in the graph's coordinate space */
export type GraphPos = Pos & { _brand: 'graph' }

/** Create a ScreenPos from x, y values */
export const screenPos = (x: number, y: number): ScreenPos => ({ x, y } as ScreenPos)

/** Create a CanvasPos from x, y values */
export const canvasPos = (x: number, y: number): CanvasPos => ({ x, y } as CanvasPos)

/** Create a GraphPos from x, y values */
export const graphPos = (x: number, y: number): GraphPos => ({ x, y } as GraphPos)
