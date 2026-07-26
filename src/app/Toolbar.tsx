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
  HelpCircle,
  FileText,
  Boxes,
  Share2,
  ShieldCheck,
  MoreHorizontal,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../store/store'
import { IconBtn } from './ui'
import { useIsSmallScreen } from '../lib/device'
import { exportProjectFile, importProjectFile } from '../features/persistence/io'
import { requestScreenshot, exportHomeGltf } from '../features/scene/screenshot'
import { exportFloorPlanPNG } from '../features/persistence/floorplanExport'
import { openSpecSheet } from '../features/persistence/specSheet'
import { copyShareLink } from '../features/persistence/share'
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
  const small = useIsSmallScreen()

  // resizing down (or rotating) while walking would strand the camera in a mode
  // with no way to move it
  useEffect(() => {
    if (small && cameraMode === 'walk') setCameraMode('orbit')
  }, [small, cameraMode, setCameraMode])

  // One definition, two presentations: icon buttons when there's room, an
  // overflow menu on a phone where 14 controls in a row would never fit.
  const fileActions: FileAction[] = [
    {
      icon: FileText,
      label: 'Print / save PDF spec sheet',
      onClick: () => openSpecSheet(project),
    },
    { icon: Map, label: 'Export floor plan (PNG)', onClick: () => exportFloorPlanPNG(project) },
    { icon: Boxes, label: 'Export 3D model (.glb)', onClick: () => exportHomeGltf() },
    { icon: Share2, label: 'Copy a shareable link', onClick: () => copyShareLink(project) },
    {
      icon: Download,
      label: 'Export project (.json)',
      onClick: () => exportProjectFile(project),
    },
    {
      icon: Upload,
      label: 'Import project (.json)',
      onClick: () => importProjectFile().then((p) => p && loadProject(p)),
    },
  ]

  return (
    <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-edge bg-panel px-2 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-3">
      <div className="flex items-center gap-2 sm:pr-2">
        <Home size={18} className="text-accent" />
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">Reno 3D</span>
      </div>

      <div className="hidden h-6 w-px bg-edge sm:block" />

      {/* mode toggle */}
      <div className="flex items-center rounded-lg bg-panel2 p-0.5">
        <button
          type="button"
          onClick={() => setEditorMode('trace')}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors sm:px-3 sm:py-1 ${
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
          className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors sm:px-3 sm:py-1 ${
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
              <Orbit size={15} /> <span className="hidden md:inline">Orbit</span>
            </IconBtn>
            {/* walk mode needs pointer lock and WASD, neither of which a phone
                has — offering it there would just trap the view */}
            {!small && (
              <IconBtn
                title="Walk through (click to enter, WASD + mouse, Esc to exit)"
                active={cameraMode === 'walk'}
                onClick={() => setCameraMode('walk')}
              >
                <PersonStanding size={15} /> <span className="hidden md:inline">Walk</span>
              </IconBtn>
            )}
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
        className="hidden items-center gap-1 text-[11px] text-neutral-500 xl:flex"
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
        className="w-24 min-w-0 rounded border border-transparent bg-transparent px-2 py-1 text-right text-sm text-neutral-200 outline-none hover:border-edge focus:border-accent md:w-48"
      />

      <div className="hidden h-6 w-px bg-edge sm:block" />

      <ProjectsMenu />
      {small ? (
        <OverflowMenu actions={fileActions} />
      ) : (
        fileActions.map((a) => (
          <IconBtn key={a.label} title={a.label} onClick={a.onClick}>
            <a.icon size={15} />
          </IconBtn>
        ))
      )}
      <div className="hidden h-6 w-px bg-edge sm:block" />
      <IconBtn
        title="HDB renovation rules checklist"
        onClick={() => useStore.getState().setHdbOpen(true)}
      >
        <ShieldCheck size={15} />
      </IconBtn>
      <IconBtn title="Help & shortcuts" onClick={() => useStore.getState().setHelpOpen(true)}>
        <HelpCircle size={15} />
      </IconBtn>
    </header>
  )
}

interface FileAction {
  icon: LucideIcon
  label: string
  onClick: () => void
}

function OverflowMenu({ actions }: { actions: FileAction[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <IconBtn title="Export & share" active={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={17} />
      </IconBtn>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-56 overflow-hidden rounded-lg border border-edge bg-panel shadow-xl">
            {actions.map((a) => (
              <MenuRow
                key={a.label}
                onClick={() => {
                  setOpen(false)
                  a.onClick()
                }}
              >
                <a.icon size={15} className="shrink-0 text-neutral-400" />
                {a.label}
              </MenuRow>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MenuRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center gap-2.5 px-3 text-left text-xs text-neutral-200 hover:bg-panel2"
    >
      {children}
    </button>
  )
}
