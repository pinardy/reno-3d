import {
  Home,
  Pencil,
  Box,
  Undo2,
  Redo2,
  Download,
  Upload,
  Camera,
  Orbit,
  PersonStanding,
  Map,
  Check,
  Cloud,
} from 'lucide-react'
import { useStore } from '../store/store'
import { IconBtn } from './ui'
import { exportProjectFile, importProjectFile } from '../features/persistence/io'
import { requestScreenshot } from '../features/scene/screenshot'
import { exportFloorPlanPNG } from '../features/persistence/floorplanExport'
import { ProjectsMenu } from '../features/persistence/ProjectsMenu'

export function Toolbar() {
  const editorMode = useStore((s) => s.editorMode)
  const setEditorMode = useStore((s) => s.setEditorMode)
  const cameraMode = useStore((s) => s.cameraMode)
  const setCameraMode = useStore((s) => s.setCameraMode)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const past = useStore((s) => s.past.length)
  const future = useStore((s) => s.future.length)
  const name = useStore((s) => s.project.name)
  const renameProject = useStore((s) => s.renameProject)
  const project = useStore((s) => s.project)
  const loadProject = useStore((s) => s.loadProject)
  const saveState = useStore((s) => s.saveState)

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-edge bg-panel px-3">
      <div className="flex items-center gap-2 pr-2">
        <Home size={18} className="text-accent" />
        <span className="text-sm font-semibold tracking-tight">Reno 3D</span>
      </div>

      <div className="h-6 w-px bg-edge" />

      {/* mode toggle */}
      <div className="flex items-center rounded-lg bg-panel2 p-0.5">
        <button
          type="button"
          onClick={() => setEditorMode('trace')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
            editorMode === 'trace'
              ? 'bg-accent text-white'
              : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Pencil size={13} /> Trace 2D
        </button>
        <button
          type="button"
          onClick={() => setEditorMode('design')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
            editorMode === 'design'
              ? 'bg-accent text-white'
              : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Box size={13} /> Design 3D
        </button>
      </div>

      <div className="h-6 w-px bg-edge" />

      <IconBtn title="Undo (Cmd/Ctrl+Z)" onClick={undo} disabled={past === 0}>
        <Undo2 size={15} />
      </IconBtn>
      <IconBtn title="Redo (Cmd/Ctrl+Shift+Z)" onClick={redo} disabled={future === 0}>
        <Redo2 size={15} />
      </IconBtn>

      {editorMode === 'design' && (
        <>
          <div className="h-6 w-px bg-edge" />
          <div className="flex items-center rounded-lg bg-panel2 p-0.5">
            <IconBtn
              title="Orbit camera"
              active={cameraMode === 'orbit'}
              onClick={() => setCameraMode('orbit')}
            >
              <Orbit size={15} /> Orbit
            </IconBtn>
            <IconBtn
              title="Walk through (click to enter, WASD + mouse, Esc to exit)"
              active={cameraMode === 'walk'}
              onClick={() => setCameraMode('walk')}
            >
              <PersonStanding size={15} /> Walk
            </IconBtn>
          </div>
          <IconBtn title="Save screenshot (PNG)" onClick={() => requestScreenshot()}>
            <Camera size={15} />
          </IconBtn>
        </>
      )}

      {/* spacer */}
      <div className="flex-1" />

      <span
        title="Your work is saved automatically in this browser"
        className="flex items-center gap-1 text-[11px] text-neutral-500"
      >
        {saveState === 'saving' ? (
          <>
            <Cloud size={13} className="animate-pulse" /> Saving…
          </>
        ) : (
          <>
            <Check size={13} className="text-emerald-400" /> Saved locally
          </>
        )}
      </span>

      <input
        value={name}
        onChange={(e) => renameProject(e.target.value)}
        className="w-48 rounded border border-transparent bg-transparent px-2 py-1 text-right text-sm text-neutral-200 outline-none hover:border-edge focus:border-accent"
      />

      <div className="h-6 w-px bg-edge" />

      <ProjectsMenu />
      <IconBtn
        title="Export top-down floor plan (PNG)"
        onClick={() => exportFloorPlanPNG(project)}
      >
        <Map size={15} />
      </IconBtn>
      <IconBtn title="Export project (.json)" onClick={() => exportProjectFile(project)}>
        <Download size={15} />
      </IconBtn>
      <IconBtn
        title="Import project (.json)"
        onClick={() => importProjectFile().then((p) => p && loadProject(p))}
      >
        <Upload size={15} />
      </IconBtn>
    </header>
  )
}
