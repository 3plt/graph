export type Dir = 'in' | 'out'
export type Side = 'source' | 'target'
export type MergeOrder = Side[]
export type NodeAlign = 'natural' | 'top' | 'bottom' | 'left' | 'right'
export type Orientation = 'TB' | 'BT' | 'LR' | 'RL'

export type Dims = {
  w: number
  h: number
}

export type Pos = {
  x: number
  y: number
}