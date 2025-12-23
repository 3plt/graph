import { Graph } from "../graph"
import { Seg } from "../seg"
import { Layer } from "../layer"
import { Layout } from "./layout"
import { Pos } from "../../common"
import { logger } from "../../log"
import { normalize, Markers } from "../../canvas/marker"

const log = logger('lines')

type TPos = Partial<Pos> & { s?: number }

type PathBuilder = {
  x: keyof Pos
  y: keyof Pos
  lr: boolean
  d: -1 | 1
  o: -1 | 1
  rd: number
  ro: number
  t: number
  s: 0 | 1
  p: TPos
  path: Line[]
  advance: (p2: TPos, type: LineType) => void
}

export type LineType = 'line' | 'arc'

export type Line = {
  type: LineType
  x1: number
  y1: number
  x2: number
  y2: number
  radius?: number
  sweep?: number
}

export class Lines {

  static layoutSeg(g: Graph, seg: Seg): Seg {
    const sourcePos = Layout.anchorPos(g, seg, 'source')
    const targetPos = Layout.anchorPos(g, seg, 'target')
    return seg.setPos(g, sourcePos[g.x], targetPos[g.x])
  }

  static layerSegs(g: Graph, layer: Layer): Seg[] {
    const segs: Seg[] = []
    for (const node of layer.nodes(g))
      for (const seg of node.outSegs(g))
        segs.push(Lines.layoutSeg(g, seg))
    return segs
  }

  static trackEdges(g: Graph) {
    // first, make sure dirty segs make their source layers dirty
    for (const segId of g.dirtySegs.values())
      g.dirtyLayers.add(g.getSeg(segId).sourceNode(g).layerId)
    const minLength = g.options.turnRadius * 2
    // then process each dirty layer
    for (const layerId of g.dirtyLayers.values()) {
      const layer = g.getLayer(layerId)
      // TODO: could start with prior tracks with dirty segs removed?
      const leftTracks: Seg[][] = []
      const rightTracks: Seg[][] = []
      const allTracks: Seg[][] = []
      // get all outgoing segs and their start/end positions
      const segs = Lines.layerSegs(g, layer)
        .sort((a, b) => a.p1 - b.p1)
      for (const seg of segs) {
        // skip nearly-vertical segs
        if (Math.abs(seg.p1 - seg.p2) < minLength) {
          seg.setTrackPos(g, undefined)
          continue
        }
        // choose left, right, or both
        let trackSet
        if (!g.options.separateTrackSets)
          trackSet = allTracks
        else if (seg.p1 < seg.p2)
          trackSet = rightTracks
        else
          trackSet = leftTracks
        // check track sets in reverse order
        let validTrack
        for (let i = trackSet.length - 1; i >= 0; i--) {
          const track = trackSet[i]
          let overlap = false
          for (const other of track) {
            // if seg shares an end with an existing track, add it
            if (seg.anySameEnd(other)) {
              track.push(seg)
              validTrack = track
              break
            }
            // if seg overlaps another, go to next track set
            const minA = Math.min(seg.p1, seg.p2)
            const maxA = Math.max(seg.p1, seg.p2)
            const minB = Math.min(other.p1, other.p2)
            const maxB = Math.max(other.p1, other.p2)
            if (minA < maxB && minB < maxA) {
              overlap = true
              break
            }
          }
          if (!overlap) {
            validTrack = track
            break
          }
        }
        // either add to existing track or create new track
        if (validTrack)
          validTrack.push(seg)
        else
          trackSet.push([seg])
      }
      // sort tracks to minimize crossings
      // use the midpoint (average of source and target) to group edges traveling through similar regions
      // for right-going: larger midpoint = inner track (closer to source)
      // for left-going: smaller midpoint = inner track (closer to source)
      const midpoint = (s: Seg) => (s.p1 + s.p2) / 2
      const sortTracks = (tracks: Seg[][], goingRight: boolean) => {
        tracks.sort((a, b) => {
          const midA = Math.max(...a.map(midpoint))
          const midB = Math.max(...b.map(midpoint))
          return goingRight ? (midB - midA) : (midA - midB)
        })
      }
      sortTracks(rightTracks, true)
      sortTracks(leftTracks, false)
      // for allTracks, use average midpoint (descending)
      allTracks.sort((a, b) => {
        const avgA = a.reduce((sum, s) => sum + midpoint(s), 0) / a.length
        const avgB = b.reduce((sum, s) => sum + midpoint(s), 0) / b.length
        return avgB - avgA
      })

      // convert tracks to seg ids and store on layer
      const tracks = []
      const all = leftTracks.concat(rightTracks).concat(allTracks)
      for (const track of all)
        tracks.push(track.map(seg => seg.id))
      layer.setTracks(g, tracks)
    }
    return this
  }

  static pathEdges(g: Graph) {
    for (const seg of g.segs.values()) {
      if (!g.dirtySegs.has(seg.id)) continue
      const radius = g.options.turnRadius
      const p1 = Layout.anchorPos(g, seg, 'source')
      const p2 = Layout.anchorPos(g, seg, 'target')
      const source = seg.sourceNode(g)
      const target = seg.targetNode(g)
      const marker = normalize(seg)
      if (source.isDummy) marker.source = undefined
      if (target.isDummy) marker.target = undefined
      const path = seg.trackPos !== undefined
        ? Lines.createRailroadPath(g, p1, p2, seg.trackPos, radius, marker)
        : Lines.createDirectPath(g, p1, p2, radius, marker)
      const svg = Lines.pathToSVG(path)
      seg.setSVG(g, svg)
    }
    return this
  }

  static pathLine(p1: TPos, p2: TPos, type: LineType, radius: number): Line {
    if (p2.x === undefined) p2.x = p1.x
    if (p2.y === undefined) p2.y = p1.y
    if (p2.s === undefined) p2.s = p1.s
    const line: Line = {
      type,
      x1: p1.x!, y1: p1.y!,
      x2: p2.x!, y2: p2.y!,
    }
    p1.x = p2.x
    p1.y = p2.y
    p1.s = p2.s
    if (type == 'arc') {
      line.radius = radius
      line.sweep = p1.s
    }
    return line
  }

  static pathBuilder(g: Graph, start: Pos, end: Pos, trackPos: number, radius: number, marker: Markers): PathBuilder {
    const { x, y } = g
    const lr = end[x] > start[x]     // true for left to right
    const d = lr ? 1 : -1            // d = 1 for left to right, -1 for right to left
    const o = g.r ? -1 : 1           // o = 1 for forward, -1 for reverse
    const rd = radius * d            // rd = radius * d
    const ro = radius * o            // ro = radius * o
    const t = trackPos               // t = track position

    // getting the sweep direction right in all orientations is tricky 
    let s = 0              // s (sweep) = 0 for CCW, 1 for CW
    if (g.r) s = 1 - s     // flip direction if reverse orientation
    if (!lr) s = 1 - s     // flip direction if left to right
    if (!g.v) s = 1 - s    // flip direction if horizontal

    // adjust start/end for markers
    if (marker.source) start[y] += o * (g.options.markerSize - 1)
    if (marker.target) end[y] -= o * (g.options.markerSize - 1)

    // set up an incremental drawing function
    const p = { ...start, s }
    const path: Line[] = []
    const advance = (p2: TPos, type: LineType) => {
      path.push(this.pathLine(p, p2, type, radius))
    }

    // return everything that might be useful
    return { x, y, lr, d, o, rd, ro, t, s: s as (0 | 1), p, path, advance }
  }

  // Create a railroad-style path with two 90-degree turns
  static createRailroadPath(g: Graph, start: Pos, end: Pos, trackPos: number, radius: number, marker: Markers): Line[] {
    const { x, y, rd, ro, t, s, p, path, advance } = this.pathBuilder(g, start, end, trackPos, radius, marker)

    // draw the path; notes assume TB layout and LR edge
    advance({ [y]: t - ro }, 'line')                        // straight line down to just above track 
    advance({ [x]: p[x]! + rd, [y]: t }, 'arc')             // arc CCW towards the right
    advance({ [x]: end[x] - rd }, 'line')                   // stright line right to just left of end position
    advance({ [x]: end[x], [y]: t + ro, s: 1 - s }, 'arc')  // arc CW towards down
    advance({ [y]: end[y] }, 'line')                        // stright line down to end position

    return path
  }

  // Create a mostly-vertical path with optional S-curve
  static createDirectPath(g: Graph, start: Pos, end: Pos, radius: number, marker: Markers): Line[] {
    const { x, y, d, o, s, p, path, advance } = this.pathBuilder(g, start, end, 0, radius, marker)
    const dx = Math.abs(end.x - start.x)
    const dy = Math.abs(end.y - start.y)
    const d_ = { x: dx, y: dy }

    // for very straight lines, just draw a line 
    if (dx < 0.1) {
      advance({ ...end }, 'line')
      return path
    }

    // try to use S-curve with matching radius
    const curve = Lines.calculateSCurve(d_[x], d_[y], radius)

    // if we can't use an S-curve, just draw a line
    if (!curve || curve.Ly == 0) {
      advance({ ...end }, 'line')
      return path
    }

    const m = {
      [x]: d * (d_[x] - curve.Lx) / 2,
      [y]: o * (d_[y] - curve.Ly) / 2
    }

    // draw the S shape
    advance({ [x]: p[x]! + m[x], [y]: p[y]! + m[y] }, 'arc')
    advance({ [x]: end[x] - m[x], [y]: end[y] - m[y] }, 'line')
    advance({ [x]: end[x], [y]: end[y], s: 1 - s }, 'arc')

    return path
  }

  static solveSCurveAngle(dx: number, dy: number, r: number): number | null {
    // The equation to solve:
    // dx * cos(α) - dy * sin(α) = 2r * (cos(α) - 1)
    // Rearranged: f(α) = dx * cos(α) - dy * sin(α) - 2r * cos(α) + 2r = 0

    const f = (alpha: number) => {
      return dx * Math.cos(alpha) - dy * Math.sin(alpha) - 2 * r * Math.cos(alpha) + 2 * r
    }

    // Derivative: f'(α) = -dx * sin(α) - dy * cos(α) + 2r * sin(α)
    const fPrime = (alpha: number) => {
      return -dx * Math.sin(alpha) - dy * Math.cos(alpha) + 2 * r * Math.sin(alpha)
    }

    // Newton-Raphson method
    // Start with a small initial guess (works well when points are mostly vertical)
    let alpha = Math.min(0.1, Math.abs(dx) / dy) // Initial guess based on aspect ratio
    const maxIterations = 20
    const tolerance = 1e-6

    for (let i = 0; i < maxIterations; i++) {
      const fVal = f(alpha)
      const fPrimeVal = fPrime(alpha)

      // Check if we've converged
      if (Math.abs(fVal) < tolerance) {
        // Verify this is a valid solution (L_y should be positive)
        const Ly = dy - 2 * r * Math.sin(alpha)
        if (Ly >= 0 && alpha > 0 && alpha < Math.PI / 2) {
          return alpha
        }
        return null
      }

      // Avoid division by zero
      if (Math.abs(fPrimeVal) < 1e-10) {
        break
      }

      // Newton-Raphson update
      const nextAlpha = alpha - fVal / fPrimeVal

      // Keep angle in reasonable bounds [0, π/2]
      if (nextAlpha < 0 || nextAlpha > Math.PI / 2) {
        break
      }

      alpha = nextAlpha
    }

    // If Newton-Raphson didn't converge, return null
    return null
  }

  static calculateSCurve(dx: number, dy: number, r: number) {
    const alpha = Lines.solveSCurveAngle(dx, dy, r)

    if (alpha === null) {
      return null
    }

    const Ly = dy - 2 * r * Math.sin(alpha)
    const Lx = Ly * Math.tan(alpha)
    const L = Ly / Math.cos(alpha)

    return {
      alpha,  // Angle of each arc (radians)
      Lx,     // Horizontal component of straight section
      Ly,     // Vertical component of straight section
      L,      // Length of straight section
    }
  }

  static pathToSVG(path: Line[]): string {
    if (!path || path.length === 0) return ''

    const lines = []

    // Start with Move command to first point
    const first = path[0]
    lines.push(`M ${first.x1},${first.y1}`)

    for (const line of path) {
      if (line.type === 'line') {
        lines.push(`L ${line.x2},${line.y2}`)
      } else if (line.type === 'arc') {
        const r = line.radius
        const largeArc = 0
        const sweep = line.sweep || 0
        lines.push(`A ${r},${r} 0 ${largeArc} ${sweep} ${line.x2},${line.y2}`)
      }
    }

    return lines.join(' ')
  }
}