import { SidePanel } from './SidePanel'
import { Inspector } from '../features/inspector/Inspector'
import { ProjectSummary } from '../features/inspector/ProjectSummary'
import { ChecksPanel } from '../features/checks/ChecksPanel'
import { ElevationPanel } from '../features/elevation/ElevationPanel'
import { AirconPanel } from '../features/aircon/AirconPanel'
import { TakeoffPanel } from '../features/takeoff/TakeoffPanel'

export function RightPanel() {
  return (
    <SidePanel side="right" storageKey="reno:rightWidth" defaultWidth={256}>
      <Inspector />
      <ProjectSummary />
      <TakeoffPanel />
      <ChecksPanel />
      <ElevationPanel />
      <AirconPanel />
    </SidePanel>
  )
}
