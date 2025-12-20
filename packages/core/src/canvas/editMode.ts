import { CanvasPos, GraphPos } from '../common'

/** Target for edge drop */
export type EdgeDropTarget =
  | { type: 'node'; id: string; port?: string }
  | { type: 'canvas' }
  | null

/**
 * Edit mode states for the canvas.
 */
export type EditState =
  | { type: 'idle' }
  | { type: 'panning'; startCanvas: CanvasPos; startTransform: { x: number; y: number; scale: number } }
  | { type: 'new-edge'; source: { id: string, port?: string }; startGraph: GraphPos; currentGraph: GraphPos; target: EdgeDropTarget }

/**
 * Edit mode state machine for the canvas.
 * Manages transitions between idle, panning, and new-edge creation states.
 */
export class EditMode {
  private _state: EditState = { type: 'idle' }
  private _editable: boolean = false

  get state(): EditState {
    return this._state
  }

  get editable(): boolean {
    return this._editable
  }

  set editable(value: boolean) {
    this._editable = value
    if (!value) {
      this.reset()
    }
  }

  get isIdle(): boolean {
    return this._state.type === 'idle'
  }

  get isPanning(): boolean {
    return this._state.type === 'panning'
  }

  get isCreatingEdge(): boolean {
    return this._state.type === 'new-edge'
  }

  /** Start panning the canvas */
  startPan(startCanvas: CanvasPos, startTransform: { x: number; y: number; scale: number }): void {
    this._state = { type: 'panning', startCanvas, startTransform }
  }

  /** Start creating a new edge from a node or port */
  startNewEdge(id: string, startGraph: GraphPos, port?: string): void {
    if (!this._editable) return
    this._state = {
      type: 'new-edge',
      source: { id, port },
      startGraph,
      currentGraph: startGraph,
      target: null,
    }
  }

  /** Update the current position during new-edge mode */
  updateNewEdgePosition(currentGraph: GraphPos): void {
    if (this._state.type === 'new-edge') {
      this._state = { ...this._state, currentGraph }
    }
  }

  /** Update the hover target during new-edge mode */
  setHoverTarget(target: EdgeDropTarget): void {
    if (this._state.type === 'new-edge') {
      this._state = { ...this._state, target }
    }
  }

  /** Get the new-edge state if active */
  getNewEdgeState(): Extract<EditState, { type: 'new-edge' }> | null {
    if (this._state.type === 'new-edge') {
      return this._state
    }
    return null
  }

  /** Reset to idle state */
  reset(): void {
    this._state = { type: 'idle' }
  }
}
