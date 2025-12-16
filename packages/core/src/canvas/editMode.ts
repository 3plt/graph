import { CanvasPos, GraphPos } from '../common'

/** Target for edge drop */
export type EdgeDropTarget =
  | { type: 'node'; nodeId: string }
  | { type: 'port'; nodeId: string; portId: string }
  | { type: 'canvas'; position: GraphPos }
  | null

/**
 * Edit mode states for the canvas.
 */
export type EditState =
  | { type: 'idle' }
  | { type: 'panning'; startCanvas: CanvasPos; startTransform: { x: number; y: number; scale: number } }
  | { type: 'new-edge'; sourceNodeId: string; sourcePortId?: string; startGraph: GraphPos; currentGraph: GraphPos; hoverTarget: EdgeDropTarget }

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
  startNewEdge(sourceNodeId: string, startGraph: GraphPos, sourcePortId?: string): void {
    if (!this._editable) return
    this._state = {
      type: 'new-edge',
      sourceNodeId,
      sourcePortId,
      startGraph,
      currentGraph: startGraph,
      hoverTarget: null,
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
      this._state = { ...this._state, hoverTarget: target }
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
