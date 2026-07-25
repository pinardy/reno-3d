import { useStore } from '../store/store'
import { TraceToolsPanel } from '../features/trace/TraceToolsPanel'
import { CatalogPanel } from '../features/catalog/CatalogPanel'

export function LeftPanel() {
  const editorMode = useStore((s) => s.editorMode)
  return (
    <aside className="no-scrollbar w-60 shrink-0 overflow-y-auto border-r border-edge bg-panel">
      {editorMode === 'trace' ? <TraceToolsPanel /> : <CatalogPanel />}
    </aside>
  )
}
