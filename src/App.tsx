import { useEffect } from 'react'
import { Toolbar } from './app/Toolbar'
import { LeftPanel } from './app/LeftPanel'
import { RightPanel } from './app/RightPanel'
import { TraceEditor } from './features/trace/TraceEditor'
import { DesignView } from './features/scene/DesignView'
import { useStore } from './store/store'
import { useAutosave, useLoadLast } from './features/persistence/autosave'
import { useKeyboardShortcuts } from './app/useKeyboardShortcuts'

export default function App() {
  const editorMode = useStore((s) => s.editorMode)

  useLoadLast()
  useAutosave()
  useKeyboardShortcuts()

  useEffect(() => {
    document.title = 'Reno 3D — Home Designer'
  }, [])

  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <main className="relative min-w-0 flex-1 bg-[#14161a]">
          {editorMode === 'trace' ? <TraceEditor /> : <DesignView />}
        </main>
        <RightPanel />
      </div>
    </div>
  )
}
