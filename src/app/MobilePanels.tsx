import { useEffect, useState } from 'react'
import { Sofa, SlidersHorizontal, PencilRuler, ChevronDown } from 'lucide-react'
import { useStore } from '../store/store'
import { CatalogPanel } from '../features/catalog/CatalogPanel'
import { TraceToolsPanel } from '../features/trace/TraceToolsPanel'
import { Inspector } from '../features/inspector/Inspector'
import { ProjectSummary } from '../features/inspector/ProjectSummary'
import { ChecksPanel } from '../features/checks/ChecksPanel'

type Sheet = 'tools' | 'details'

/**
 * Phone layout for the side panels, which can't sit beside the canvas at this
 * width. Both the sheet and the tab bar stay in normal flow rather than floating
 * over the canvas: the view shrinks instead of being covered, so nothing hides
 * behind the sheet and the tabs stay reachable while it's open.
 */
export function MobilePanels() {
  const editorMode = useStore((s) => s.editorMode)
  const selectionId = useStore((s) => s.selection.id)
  const [open, setOpen] = useState<Sheet | null>(null)

  const toolsLabel = editorMode === 'trace' ? 'Tools' : 'Furniture'
  const ToolsIcon = editorMode === 'trace' ? PencilRuler : Sofa

  // switching mode changes what "tools" means, so start from a clean slate
  useEffect(() => setOpen(null), [editorMode])

  const toggle = (s: Sheet) => setOpen((v) => (v === s ? null : s))

  return (
    <>
      {open && (
        <section className="flex max-h-[55vh] min-h-0 shrink-0 flex-col border-t border-edge bg-panel">
          <div className="flex shrink-0 items-center justify-between border-b border-edge px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {open === 'tools' ? toolsLabel : 'Details'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close panel"
              className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 hover:bg-panel2 hover:text-neutral-200"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {open === 'tools' ? (
              editorMode === 'trace' ? (
                <TraceToolsPanel />
              ) : (
                <CatalogPanel />
              )
            ) : (
              <>
                <Inspector />
                <ProjectSummary />
                <ChecksPanel />
              </>
            )}
          </div>
        </section>
      )}

      <nav className="flex shrink-0 items-stretch gap-1 border-t border-edge bg-panel px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        <TabButton active={open === 'tools'} onClick={() => toggle('tools')}>
          <ToolsIcon size={17} />
          {toolsLabel}
        </TabButton>
        <TabButton active={open === 'details'} onClick={() => toggle('details')}>
          <span className="relative">
            <SlidersHorizontal size={17} />
            {/* point at Details when something is selected but the sheet is shut */}
            {selectionId && open !== 'details' && (
              <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </span>
          Details
        </TabButton>
      </nav>
    </>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] transition-colors ${
        active ? 'bg-accent/15 text-accent' : 'text-neutral-400 hover:bg-panel2'
      }`}
    >
      {children}
    </button>
  )
}
