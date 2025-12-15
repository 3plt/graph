export function renderNode(node: any): HTMLElement {
  if (typeof node == 'string') node = { id: node }

  const title = node?.title ?? node?.label ?? node?.name ?? node?.text ?? node?.id ?? '?'
  const detail = node?.detail ?? node?.description ?? node?.subtitle

  return (
    <div className="g3p-node-default">
      <div className="g3p-node-title">{title}</div>
      {detail && (
        <div className="g3p-node-detail">{detail}</div>
      )}
    </div>
  ) as HTMLElement
}
