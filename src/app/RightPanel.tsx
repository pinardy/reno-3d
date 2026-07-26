import { SidePanel } from './SidePanel'
import { Inspector } from '../features/inspector/Inspector'
import { ProjectSummary } from '../features/inspector/ProjectSummary'
import { ChecksPanel } from '../features/checks/ChecksPanel'

export function RightPanel() {
  return (
    <SidePanel side="right" storageKey="reno:rightWidth" defaultWidth={256}>
      <Inspector />
      <ProjectSummary />
      <ChecksPanel />
    </SidePanel>
  )
}
