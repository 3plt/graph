const typeColors: Record<string, string> = {
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  default: '#64748b',
}

export function renderNode(node: any): HTMLElement {
  if (typeof node == 'string') node = { id: node }

  const title = node?.title ?? node?.label ?? node?.name ?? node?.text ?? node?.id ?? '?'
  const detail = node?.detail ?? node?.description ?? node?.subtitle
  const type = node?.type as string | undefined
  const accentColor = typeColors[type ?? ''] ?? typeColors.default

  return (
    <div style={`
      padding: 8px 12px;
      font: 14px/1.4 system-ui, sans-serif;
      border-left: 3px solid ${accentColor};
      padding-left: 9px;
    `}>
      <div style="font-weight: 500; color: #1e293b;">{title}</div>
      {detail && (
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">{detail}</div>
      )}
    </div>
  ) as HTMLElement
}
