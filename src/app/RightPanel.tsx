import { SidePanel } from './SidePanel'
import { Inspector } from '../features/inspector/Inspector'
import { ProjectSummary } from '../features/inspector/ProjectSummary'

export function RightPanel() {
  return (
    <SidePanel side="right" storageKey="reno:rightWidth" defaultWidth={256}>
      <Inspector />
      <ProjectSummary />
    </SidePanel>
  )
}
