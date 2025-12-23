import { NodeProps } from '../api/options'

export function renderNode(node: any, props?: NodeProps<any>): HTMLElement {
  if (typeof node == 'string') node = { id: node }

  const title = node?.title ?? props?.title ?? node?.label ?? node?.name ?? node?.text ?? props?.text ?? node?.id ?? '?'
  const detail = node?.detail ?? node?.description ?? node?.subtitle

  console.log(`renderNode: ${node.id} ${title} ${detail}`)

  return (
    <div className="g3p-node-default">
      <div className="g3p-node-title">{title}</div>
      {detail && (
        <div className="g3p-node-detail">{detail}</div>
      )}
    </div>
  ) as HTMLElement
}
