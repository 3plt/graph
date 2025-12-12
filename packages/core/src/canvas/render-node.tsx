export function renderNode(node: any): HTMLElement {
  return <div>{node?.id || ''}</div> as HTMLElement
}
