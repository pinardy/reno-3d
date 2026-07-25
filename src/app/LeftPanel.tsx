import { useStore } from '../store/store'
import { SidePanel } from './SidePanel'
import { TraceToolsPanel } from '../features/trace/TraceToolsPanel'
import { CatalogPanel } from '../features/catalog/CatalogPanel'

export function LeftPanel() {
  const editorMode = useStore((s) => s.editorMode)
  return (
    <SidePanel side="left" storageKey="reno:leftWidth" defaultWidth={240}>
      {editorMode === 'trace' ? <TraceToolsPanel /> : <CatalogPanel />}
    </SidePanel>
  )
}
