import { ScreenPos } from '../common'
import { MarkerType } from './marker'
import { PublicEdgeData } from '../graph/edge'
import { PublicNodeData } from '../graph/node'
import { EditEdgeProps, EditNodeProps } from '../api/api'
import { NewNode } from '../api/options'

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

  constructor(options: ModalOptions) {
    this.onClose = options.onClose

    // Create overlay
    this.overlay = (
      <div
        className="g3p-modal-overlay"
        onClick={(e) => {
          if (e.target === this.overlay) this.close()
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
  onSubmit: (data: NewNode) => void
  onCancel?: () => void
}

export class NewNodeModal extends Modal {
  private labelInput!: HTMLInputElement
  private typeSelect?: HTMLSelectElement
  private submitCallback: NewNodeModalOptions['onSubmit']

  constructor(options: NewNodeModalOptions) {
    super({
      title: 'New Node',
      onClose: () => options.onCancel?.()
    })
    this.submitCallback = options.onSubmit
    this.renderBody(options.nodeTypes)
    this.renderFooter()
  }

  private renderBody(nodeTypes?: string[]) {
    this.body.innerHTML = ''

    // Label input
    const labelGroup = (
      <div className="g3p-modal-field">
        <label className="g3p-modal-label">Label</label>
        <input
          type="text"
          className="g3p-modal-input"
          placeholder="Enter node label"
          ref={(el: HTMLInputElement) => this.labelInput = el}
        />
      </div>
    ) as HTMLElement
    this.body.appendChild(labelGroup)

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
    const label = this.labelInput.value.trim()
    if (!label) {
      this.labelInput.focus()
      return
    }

    const data: NewNode = { text: label }
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
  node: EditNodeProps
  position?: ScreenPos
  nodeTypes?: string[]
  onSubmit: (data: EditNodeProps) => void
  onDelete?: () => void
  onCancel?: () => void
}

export class EditNodeModal extends Modal {
  private labelInput!: HTMLInputElement
  private typeSelect?: HTMLSelectElement
  private node: any
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
    this.renderBody(options.nodeTypes)
    this.renderFooter()
  }

  private renderBody(nodeTypes?: string[]) {
    this.body.innerHTML = ''

    // Label input
    const currentLabel = this.node.label ?? this.node.id ?? ''
    const labelGroup = (
      <div className="g3p-modal-field">
        <label className="g3p-modal-label">Label</label>
        <input
          type="text"
          className="g3p-modal-input"
          value={currentLabel}
          ref={(el: HTMLInputElement) => this.labelInput = el}
        />
      </div>
    ) as HTMLElement
    this.body.appendChild(labelGroup)

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
    const label = this.labelInput.value.trim()
    if (!label) {
      this.labelInput.focus()
      return
    }

    const data = { ...this.node, label }
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
