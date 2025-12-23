import { ScreenPos } from '../common'
import { MarkerType } from './marker'
import { PublicEdgeData } from '../graph/edge'
import { PublicNodeData } from '../graph/node'
import { EditEdgeProps, EditNodeProps } from '../api/api'
import { NewNode } from '../api/options'

export type FieldType = 'string' | 'number' | 'boolean'
export type DetectedFields = Map<string, FieldType>

export type ModalResult<T> = T | null

export interface ModalOptions {
  title: string
  position?: ScreenPos
  onClose: () => void
}

/**
 * Base modal component for edit mode dialogs
 */
export class Modal {
  protected container: HTMLElement
  protected overlay: HTMLElement
  protected dialog: HTMLElement
  protected onClose: () => void
  private mouseDownOnOverlay = false

  constructor(options: ModalOptions) {
    this.onClose = options.onClose

    // Create overlay - track mousedown origin to avoid closing when dragging text selection
    this.overlay = (
      <div
        className="g3p-modal-overlay"
        onMouseDown={(e) => {
          this.mouseDownOnOverlay = e.target === this.overlay
        }}
        onMouseUp={(e) => {
          if (this.mouseDownOnOverlay && e.target === this.overlay) this.close()
          this.mouseDownOnOverlay = false
        }}
      />
    ) as HTMLElement

    // Create dialog
    this.dialog = (
      <div className="g3p-modal-dialog">
        <div className="g3p-modal-header">
          <span className="g3p-modal-title">{options.title}</span>
          <button
            className="g3p-modal-close"
            onClick={() => this.close()}
          >×</button>
        </div>
        <div className="g3p-modal-body" />
        <div className="g3p-modal-footer" />
      </div>
    ) as HTMLElement

    // Position dialog if specified
    if (options.position) {
      this.dialog.style.position = 'absolute'
      this.dialog.style.left = `${options.position.x}px`
      this.dialog.style.top = `${options.position.y}px`
      this.dialog.style.transform = 'translate(-50%, -50%)'
    }

    this.overlay.appendChild(this.dialog)
    this.container = this.overlay

    // Handle escape key
    this.handleKeyDown = this.handleKeyDown.bind(this)
    document.addEventListener('keydown', this.handleKeyDown)
  }

  protected handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.close()
    }
  }

  protected get body(): HTMLElement {
    return this.dialog.querySelector('.g3p-modal-body') as HTMLElement
  }

  protected get footer(): HTMLElement {
    return this.dialog.querySelector('.g3p-modal-footer') as HTMLElement
  }

  show(parent: HTMLElement) {
    parent.appendChild(this.container)
    // Focus first input
    const firstInput = this.dialog.querySelector('input, select, button') as HTMLElement
    if (firstInput) firstInput.focus()
  }

  close() {
    document.removeEventListener('keydown', this.handleKeyDown)
    this.container.remove()
    this.onClose()
  }
}

// ==================== New Node Modal ====================

export interface NewNodeModalOptions {
  nodeTypes?: string[]
  fields?: DetectedFields
  onSubmit: (data: Record<string, any>) => void
  onCancel?: () => void
}

export class NewNodeModal extends Modal {
  private fieldInputs: Map<string, HTMLInputElement | HTMLSelectElement> = new Map()
  private typeSelect?: HTMLSelectElement
  private submitCallback: NewNodeModalOptions['onSubmit']
  private fields: DetectedFields

  constructor(options: NewNodeModalOptions) {
    super({
      title: 'New Node',
      onClose: () => options.onCancel?.()
    })
    this.submitCallback = options.onSubmit
    this.fields = options.fields ?? new Map([['title', 'string']])
    this.renderBody(options.nodeTypes)
    this.renderFooter()
  }

  private renderBody(nodeTypes?: string[]) {
    this.body.innerHTML = ''

    // Render dynamic fields
    for (const [name, type] of this.fields) {
      const label = name.charAt(0).toUpperCase() + name.slice(1)
      const fieldGroup = this.renderField(name, label, type)
      this.body.appendChild(fieldGroup)
    }

    // Type selector (if types provided)
    if (nodeTypes && nodeTypes.length > 0) {
      const typeGroup = (
        <div className="g3p-modal-field">
          <label className="g3p-modal-label">Type</label>
          <select
            className="g3p-modal-select"
            ref={(el: HTMLSelectElement) => this.typeSelect = el}
          >
            <option value="">Default</option>
            {nodeTypes.map(type => (
              <option value={type}>{type}</option>
            ))}
          </select>
        </div>
      ) as HTMLElement
      this.body.appendChild(typeGroup)
    }
  }

  private renderField(name: string, label: string, type: FieldType): HTMLElement {
    if (type === 'boolean') {
      return (
        <div className="g3p-modal-field g3p-modal-field-checkbox">
          <label className="g3p-modal-label">
            <input
              type="checkbox"
              className="g3p-modal-checkbox"
              ref={(el: HTMLInputElement) => this.fieldInputs.set(name, el)}
            />
            {label}
          </label>
        </div>
      ) as HTMLElement
    }
    return (
      <div className="g3p-modal-field">
        <label className="g3p-modal-label">{label}</label>
        <input
          type={type === 'number' ? 'number' : 'text'}
          className="g3p-modal-input"
          placeholder={`Enter ${label.toLowerCase()}`}
          ref={(el: HTMLInputElement) => this.fieldInputs.set(name, el)}
        />
      </div>
    ) as HTMLElement
  }

  private renderFooter() {
    this.footer.innerHTML = ''
    this.footer.appendChild(
      <div className="g3p-modal-buttons">
        <button
          className="g3p-modal-btn g3p-modal-btn-secondary"
          onClick={() => this.close()}
        >Cancel</button>
        <button
          className="g3p-modal-btn g3p-modal-btn-primary"
          onClick={() => this.submit()}
        >Create</button>
      </div> as HTMLElement
    )
  }

  private submit() {
    const data: Record<string, any> = {}

    // Collect field values
    for (const [name, type] of this.fields) {
      const input = this.fieldInputs.get(name)
      if (!input) continue
      if (type === 'boolean') {
        data[name] = (input as HTMLInputElement).checked
      } else if (type === 'number') {
        const val = (input as HTMLInputElement).value
        if (val) data[name] = Number(val)
      } else {
        const val = (input as HTMLInputElement).value.trim()
        if (val) data[name] = val
      }
    }

    // Require at least one field to be filled
    if (Object.keys(data).length === 0) {
      const firstInput = this.fieldInputs.values().next().value
      if (firstInput) firstInput.focus()
      return
    }

    if (this.typeSelect?.value) {
      data.type = this.typeSelect.value
    }

    document.removeEventListener('keydown', this.handleKeyDown)
    this.container.remove()
    this.submitCallback(data)
  }
}

// ==================== Edit Node Modal ====================

export interface EditNodeModalOptions {
  node: Record<string, any>
  position?: ScreenPos
  nodeTypes?: string[]
  fields?: DetectedFields
  onSubmit: (data: Record<string, any>) => void
  onDelete?: () => void
  onCancel?: () => void
}

export class EditNodeModal extends Modal {
  private fieldInputs: Map<string, HTMLInputElement | HTMLSelectElement> = new Map()
  private typeSelect?: HTMLSelectElement
  private node: Record<string, any>
  private fields: DetectedFields
  private submitCallback: EditNodeModalOptions['onSubmit']
  private deleteCallback?: () => void

  constructor(options: EditNodeModalOptions) {
    super({
      title: 'Edit Node',
      position: options.position,
      onClose: () => options.onCancel?.()
    })
    this.node = options.node
    this.submitCallback = options.onSubmit
    this.deleteCallback = options.onDelete
    this.fields = options.fields ?? new Map([['title', 'string']])
    if (!options.fields && !this.node.title)
      this.node = { ...this.node, title: this.node.id }
    this.renderBody(options.nodeTypes)
    this.renderFooter()
  }

  private renderBody(nodeTypes?: string[]) {
    console.log(`renderBody`, this.node)
    this.body.innerHTML = ''

    // Render dynamic fields with current values
    for (const [name, type] of this.fields) {
      const label = name.charAt(0).toUpperCase() + name.slice(1)
      const currentValue = this.node[name]
      const fieldGroup = this.renderField(name, label, type, currentValue)
      this.body.appendChild(fieldGroup)
    }

    // Type selector (if types provided)
    if (nodeTypes && nodeTypes.length > 0) {
      const currentType = this.node.type ?? ''
      const typeGroup = (
        <div className="g3p-modal-field">
          <label className="g3p-modal-label">Type</label>
          <select
            className="g3p-modal-select"
            ref={(el: HTMLSelectElement) => this.typeSelect = el}
          >
            <option value="" selected={!currentType}>Default</option>
            {nodeTypes.map(type => (
              <option value={type} selected={type === currentType}>{type}</option>
            ))}
          </select>
        </div>
      ) as HTMLElement
      this.body.appendChild(typeGroup)
    }
  }

  private renderField(name: string, label: string, type: FieldType, currentValue?: any): HTMLElement {
    if (type === 'boolean') {
      return (
        <div className="g3p-modal-field g3p-modal-field-checkbox">
          <label className="g3p-modal-label">
            <input
              type="checkbox"
              className="g3p-modal-checkbox"
              checked={!!currentValue}
              ref={(el: HTMLInputElement) => this.fieldInputs.set(name, el)}
            />
            {label}
          </label>
        </div>
      ) as HTMLElement
    }
    return (
      <div className="g3p-modal-field">
        <label className="g3p-modal-label">{label}</label>
        <input
          type={type === 'number' ? 'number' : 'text'}
          className="g3p-modal-input"
          value={currentValue ?? ''}
          ref={(el: HTMLInputElement) => this.fieldInputs.set(name, el)}
        />
      </div>
    ) as HTMLElement
  }

  private renderFooter() {
    this.footer.innerHTML = ''
    this.footer.appendChild(
      <div className="g3p-modal-buttons">
        {this.deleteCallback && (
          <button
            className="g3p-modal-btn g3p-modal-btn-danger"
            onClick={() => this.delete()}
          >Delete</button>
        )}
        <div className="g3p-modal-spacer" />
        <button
          className="g3p-modal-btn g3p-modal-btn-secondary"
          onClick={() => this.close()}
        >Cancel</button>
        <button
          className="g3p-modal-btn g3p-modal-btn-primary"
          onClick={() => this.submit()}
        >Save</button>
      </div> as HTMLElement
    )
  }

  private submit() {
    const data: Record<string, any> = { ...this.node }

    // Collect field values
    for (const [name, type] of this.fields) {
      const input = this.fieldInputs.get(name)
      if (!input) continue
      if (type === 'boolean') {
        data[name] = (input as HTMLInputElement).checked
      } else if (type === 'number') {
        const val = (input as HTMLInputElement).value
        data[name] = val ? Number(val) : undefined
      } else {
        const val = (input as HTMLInputElement).value.trim()
        data[name] = val || undefined
      }
    }

    if (this.typeSelect) {
      data.type = this.typeSelect.value || undefined
    }

    document.removeEventListener('keydown', this.handleKeyDown)
    this.container.remove()
    this.submitCallback(data)
  }

  private delete() {
    document.removeEventListener('keydown', this.handleKeyDown)
    this.container.remove()
    this.deleteCallback?.()
  }
}

// ==================== Edit Edge Modal ====================

export interface EditEdgeModalOptions {
  edge: EditEdgeProps
  edgeTypes?: string[]
  onSubmit: (data: EditEdgeProps) => void
  onCancel?: () => void
  onDelete?: () => void
}

export class EditEdgeModal extends Modal {
  private sourceMarkerSelect!: HTMLSelectElement
  private targetMarkerSelect!: HTMLSelectElement
  private typeSelect?: HTMLSelectElement
  private edge: EditEdgeProps
  private submitCallback: EditEdgeModalOptions['onSubmit']
  private deleteCallback?: () => void

  private static markerTypes: MarkerType[] = ['none', 'arrow', 'circle', 'diamond', 'bar']

  constructor(options: EditEdgeModalOptions) {
    super({
      title: 'Edit Edge',
      onClose: () => options.onCancel?.()
    })
    this.edge = options.edge
    this.submitCallback = options.onSubmit
    this.deleteCallback = options.onDelete
    this.renderBody(options.edgeTypes)
    this.renderFooter()
  }

  private renderBody(edgeTypes?: string[]) {
    this.body.innerHTML = ''

    const currentSourceMarker = this.edge.source?.marker ?? 'none'
    const currentTargetMarker = this.edge.target?.marker ?? 'arrow'

    // Source marker
    const sourceGroup = (
      <div className="g3p-modal-field">
        <label className="g3p-modal-label">Source Marker</label>
        <select
          className="g3p-modal-select"
          ref={(el: HTMLSelectElement) => this.sourceMarkerSelect = el}
        >
          {EditEdgeModal.markerTypes.map(type => (
            <option value={type} selected={type === currentSourceMarker}>{type}</option>
          ))}
        </select>
      </div>
    ) as HTMLElement
    this.body.appendChild(sourceGroup)

    // Target marker
    const targetGroup = (
      <div className="g3p-modal-field">
        <label className="g3p-modal-label">Target Marker</label>
        <select
          className="g3p-modal-select"
          ref={(el: HTMLSelectElement) => this.targetMarkerSelect = el}
        >
          {EditEdgeModal.markerTypes.map(type => (
            <option value={type} selected={type === currentTargetMarker}>{type}</option>
          ))}
        </select>
      </div>
    ) as HTMLElement
    this.body.appendChild(targetGroup)

    // Type selector (if types provided)
    if (edgeTypes && edgeTypes.length > 0) {
      const currentType = this.edge.type ?? ''
      const typeGroup = (
        <div className="g3p-modal-field">
          <label className="g3p-modal-label">Type</label>
          <select
            className="g3p-modal-select"
            ref={(el: HTMLSelectElement) => this.typeSelect = el}
          >
            <option value="" selected={!currentType}>Default</option>
            {edgeTypes.map(type => (
              <option value={type} selected={type === currentType}>{type}</option>
            ))}
          </select>
        </div>
      ) as HTMLElement
      this.body.appendChild(typeGroup)
    }
  }

  private renderFooter() {
    this.footer.innerHTML = ''
    this.footer.appendChild(
      <div className="g3p-modal-buttons">
        {this.deleteCallback && (
          <button
            className="g3p-modal-btn g3p-modal-btn-danger"
            onClick={() => this.delete()}
          >Delete</button>
        )}
        <div className="g3p-modal-spacer" />
        <button
          className="g3p-modal-btn g3p-modal-btn-secondary"
          onClick={() => this.close()}
        >Cancel</button>
        <button
          className="g3p-modal-btn g3p-modal-btn-primary"
          onClick={() => this.submit()}
        >Save</button>
      </div> as HTMLElement
    )
  }

  private submit() {
    const data: EditEdgeProps = {
      ...this.edge,
      source: {
        ...this.edge.source,
        marker: this.sourceMarkerSelect.value === 'none' ? undefined : this.sourceMarkerSelect.value as MarkerType,
      },
      target: {
        ...this.edge.target,
        marker: this.targetMarkerSelect.value === 'none' ? undefined : this.targetMarkerSelect.value as MarkerType,
      },
    }

    if (this.typeSelect) {
      data.type = this.typeSelect.value || undefined
    }

    document.removeEventListener('keydown', this.handleKeyDown)
    this.container.remove()
    this.submitCallback(data)
  }

  private delete() {
    document.removeEventListener('keydown', this.handleKeyDown)
    this.container.remove()
    this.deleteCallback?.()
  }
}
