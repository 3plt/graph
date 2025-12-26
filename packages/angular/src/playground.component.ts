/**
 * Angular Playground component for @3plate/graph
 */

import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core'
import { Playground as PlaygroundClass, type PlaygroundOptions } from '@3plate/graph-core'

@Component({
  selector: 'g3p-playground',
  standalone: true,
  template: '<div #root style="width: 100%; height: 100%"></div>',
})
export class PlaygroundComponent implements OnInit, OnDestroy {
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLDivElement>

  /** Examples to display in the playground */
  @Input() examples: PlaygroundOptions['examples'] = {}

  /** Default example key */
  @Input() defaultExample?: string

  private playground: PlaygroundClass | null = null
  private rootId = `playground-${Math.random().toString(36).slice(2, 11)}`

  async ngOnInit(): Promise<void> {
    if (!this.rootRef?.nativeElement) return

    this.rootRef.nativeElement.id = this.rootId

    this.playground = new PlaygroundClass({
      root: this.rootId,
      examples: this.examples,
      defaultExample: this.defaultExample,
    })

    await this.playground.init()
  }

  ngOnDestroy(): void {
    this.playground = null
    if (this.rootRef?.nativeElement) {
      this.rootRef.nativeElement.innerHTML = ''
    }
  }

  /** Get the underlying Playground instance */
  getPlayground(): PlaygroundClass | null {
    return this.playground
  }
}
