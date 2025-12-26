/**
 * Angular Graph component for @3plate/graph
 */

import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core'
import { graph, type API } from '@3plate/graph-core'
import type { APIArguments, Update, IngestionConfig } from '@3plate/graph-core'

@Component({
  selector: 'g3p-graph',
  standalone: true,
  template: '<div #root style="width: 100%; height: 100%"></div>',
})
export class GraphComponent<N = any, E = any> implements OnInit, OnDestroy, OnChanges {
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLDivElement>

  /** Initial nodes */
  @Input() nodes?: N[]

  /** Initial edges */
  @Input() edges?: E[]

  /** Initial history */
  @Input() history?: Update<N, E>[]

  /** Ingestion source configuration (alternative to nodes/edges/history) */
  @Input() ingestion?: IngestionConfig

  /** Options */
  @Input() options?: APIArguments<N, E>['options']

  /** Events */
  @Input() events?: APIArguments<N, E>['events']

  private api: API<N, E> | null = null
  private rootId = `graph-${Math.random().toString(36).slice(2, 11)}`

  async ngOnInit(): Promise<void> {
    if (!this.rootRef?.nativeElement) return

    this.rootRef.nativeElement.id = this.rootId

    this.api = await graph({
      root: this.rootId,
      nodes: this.nodes,
      edges: this.edges,
      history: this.history,
      ingestion: this.ingestion,
      options: this.options,
      events: this.events,
    })
  }

  ngOnDestroy(): void {
    if (this.api) {
      this.api.destroy()
      this.api = null
    }
    if (this.rootRef?.nativeElement) {
      const canvas = this.rootRef.nativeElement.querySelector('canvas, svg')
      if (canvas) {
        canvas.remove()
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.api) return

    // Use the centralized applyProps method for all prop changes
    if (changes['nodes'] || changes['edges'] || changes['history'] || changes['options']) {
      this.api.applyProps({
        nodes: this.nodes,
        edges: this.edges,
        history: this.history,
        options: this.options,
      })
    }
  }

  /** Get the underlying API instance */
  getApi(): API<N, E> | null {
    return this.api
  }
}

