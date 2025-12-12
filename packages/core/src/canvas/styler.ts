const injected: { [key: string]: boolean } = {}

type Styler = (classes: string, condition?: boolean) => string

export default function styler(name: string, styles: string, prefix: string): Styler {
  if (prefix === 'g3p' && !injected[name]) {
    const style = document.createElement('style')
    style.textContent = styles
    document.head.appendChild(style)
    injected[name] = true
  }
  return (str: string, condition?: boolean) => {
    if (!(condition ?? true)) return ''
    const parts = str.split(/\s+/)
    const fixed = parts.map(p => `${prefix}-${name}-${p}`)
    return fixed.join(" ")
  }
}