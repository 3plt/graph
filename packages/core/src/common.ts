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
