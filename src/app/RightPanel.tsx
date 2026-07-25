import { Inspector } from '../features/inspector/Inspector'

export function RightPanel() {
  return (
    <aside className="no-scrollbar w-64 shrink-0 overflow-y-auto border-l border-edge bg-panel">
      <Inspector />
    </aside>
  )
}
