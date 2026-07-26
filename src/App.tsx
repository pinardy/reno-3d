import { useEffect, lazy, Suspense } from 'react'
import { Toolbar } from './app/Toolbar'
import { LeftPanel } from './app/LeftPanel'
import { RightPanel } from './app/RightPanel'
import { HelpPanel } from './app/HelpPanel'
import { HdbRulesPanel } from './app/HdbRulesPanel'
import { CompareModal } from './features/variants/CompareModal'
import { TraceEditor } from './features/trace/TraceEditor'
import { useStore } from './store/store'
import { usePersistence } from './features/persistence/autosave'
import { useShareImport } from './features/persistence/share'
import { useKeyboardShortcuts } from './app/useKeyboardShortcuts'
import { MobilePanels } from './app/MobilePanels'
import { ErrorBoundary } from './app/ErrorBoundary'
import { useIsSmallScreen } from './lib/device'

// The 3D view pulls in three.js / R3F / drei — load it on demand so the initial
// (2D tracing) bundle stays small.
const DesignView = lazy(() =>
  import('./features/scene/DesignView').then((m) => ({ default: m.DesignView })),
)

export default function App() {
  const editorMode = useStore((s) => s.editorMode)
  const small = useIsSmallScreen()

  useShareImport()
  usePersistence()
  useKeyboardShortcuts()

  useEffect(() => {
    document.title = 'Reno 3D — Home Designer'
    // open the guided help on first ever visit
    if (!localStorage.getItem('reno:onboarded')) {
      localStorage.setItem('reno:onboarded', '1')
      useStore.getState().setHelpOpen(true)
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        {!small && <LeftPanel />}
        <main className="relative min-w-0 flex-1 bg-[#14161a]">
          {editorMode === 'trace' ? (
            <TraceEditor />
          ) : (
            <ErrorBoundary fallbackLabel="Couldn't load the 3D view">
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                    Loading 3D view…
                  </div>
                }
              >
                <DesignView />
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
        {!small && <RightPanel />}
      </div>
      {small && <MobilePanels />}
      <HelpPanel />
      <HdbRulesPanel />
      <CompareModal />
    </div>
  )
}
