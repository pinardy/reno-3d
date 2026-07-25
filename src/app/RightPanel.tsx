import { Inspector } from '../features/inspector/Inspector'
import { ProjectSummary } from '../features/inspector/ProjectSummary'

export function RightPanel() {
  return (
    <aside className="no-scrollbar w-64 shrink-0 overflow-y-auto border-l border-edge bg-panel">
      <Inspector />
      <ProjectSummary />
    </aside>
  )
}
