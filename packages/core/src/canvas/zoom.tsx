import styles from './zoom.css?raw'
import styler from './styler'

type ZoomOpts = {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  classPrefix: string
}

export interface Zoom extends ZoomOpts { }

export class Zoom {
  private level: number
  private levelEl?: HTMLElement

  constructor(opts: Partial<ZoomOpts>) {
    Object.assign(this, {
      onZoomIn: () => { },
      onZoomOut: () => { },
      onReset: () => { },
      classPrefix: 'g3p',
      ...opts,
    })
    this.level = 1.0
  }

  setZoomLevel(level: number) {
    this.level = level
    if (this.levelEl)
      this.levelEl.textContent = `${Math.round(level * 100)}%`
  }

  render() {
    const c = styler('zoom', styles, this.classPrefix)
    return (
      <div className={c("controls")}>
        <button
          className={c("btn")}
          onClick={this.onZoomIn}
          title="Zoom In"
        >
          +
        </button>
        <button
          className={c("btn")}
          onClick={this.onZoomOut}
          title="Zoom Out"
        >
          −
        </button>
        <button
          className={c("btn reset")}
          onClick={this.onReset}
          title="Reset View"
        >
          ⊙
        </button>
        <div className={c("level")} ref={(el: HTMLElement) => this.levelEl = el}>
          {Math.round(this.level * 100)}%
        </div>
      </div>
    ) as HTMLElement
  }
}
