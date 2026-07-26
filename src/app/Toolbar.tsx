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

  const fileActions: MenuAction[] = [
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

  // A phone header can't hold 14 controls, and a flex row doesn't wrap or shrink
  // — it just clips whatever runs past the right edge. So on a small screen only
  // mode, undo/redo and projects stay, and everything else moves into the menu
  // where it's still reachable.
  const menuActions: MenuAction[] = small
    ? [
        ...(editorMode === 'design'
          ? [
              {
                icon: Camera,
                label: 'Save screenshot (PNG)',
                onClick: () => requestScreenshot(),
              },
            ]
          : []),
        ...fileActions,
        {
          icon: ShieldCheck,
          label: 'HDB renovation rules',
          onClick: () => useStore.getState().setHdbOpen(true),
        },
        {
          icon: HelpCircle,
          label: 'Help & shortcuts',
          onClick: () => useStore.getState().setHelpOpen(true),
        },
      ]
    : fileActions

  return (
    <header
      className={`flex min-h-12 shrink-0 items-center border-b border-edge bg-panel pt-[env(safe-area-inset-top)] ${
        small ? 'gap-1.5 px-2' : 'gap-3 px-3'
      }`}
    >
      <Home size={18} className="shrink-0 text-accent" />
      {!small && <span className="text-sm font-semibold tracking-tight">Reno 3D</span>}

      {!small && <Divider />}

      {/* mode toggle */}
      <div className="flex shrink-0 items-center rounded-lg bg-panel2 p-0.5">
        <ModeButton
          icon={Pencil}
          active={editorMode === 'trace'}
          onClick={() => setEditorMode('trace')}
        >
          {small ? '2D' : 'Trace 2D'}
        </ModeButton>
        <ModeButton
          icon={Box}
          active={editorMode === 'design'}
          onClick={() => setEditorMode('design')}
        >
          {small ? '3D' : 'Design 3D'}
        </ModeButton>
      </div>

      {!small && <Divider />}

      <IconBtn title="Undo (Cmd/Ctrl+Z)" onClick={undo} disabled={past === 0}>
        <Undo2 size={15} />
      </IconBtn>
      <IconBtn title="Redo (Cmd/Ctrl+Shift+Z)" onClick={redo} disabled={future === 0}>
        <Redo2 size={15} />
      </IconBtn>

      {/* walk mode needs pointer lock and WASD, so on a phone orbit is the only
          option and the whole group is just noise */}
      {editorMode === 'design' && !small && (
        <>
          <Divider />
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

      <div className="min-w-0 flex-1" />

      {!small && (
        <>
          <span
            title="Your work is saved automatically in this browser"
            className="hidden items-center gap-1 whitespace-nowrap text-[11px] text-neutral-500 xl:flex"
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

          <Divider />
        </>
      )}

      <ProjectsMenu compact={small} />

      {small ? (
        <OverflowMenu
          actions={menuActions}
          header={
            <input
              value={name}
              onChange={(e) => renameProject(e.target.value)}
              aria-label="Project name"
              className="w-full rounded border border-edge bg-panel2 px-2 py-1.5 text-xs text-neutral-100 outline-none focus:border-accent"
            />
          }
        />
      ) : (
        fileActions.map((a) => (
          <IconBtn key={a.label} title={a.label} onClick={a.onClick}>
            <a.icon size={15} />
          </IconBtn>
        ))
      )}

      {!small && (
        <>
          <Divider />
          <IconBtn
            title="HDB renovation rules checklist"
            onClick={() => useStore.getState().setHdbOpen(true)}
          >
            <ShieldCheck size={15} />
          </IconBtn>
          <IconBtn
            title="Help & shortcuts"
            onClick={() => useStore.getState().setHelpOpen(true)}
          >
            <HelpCircle size={15} />
          </IconBtn>
        </>
      )}
    </header>
  )
}

function Divider() {
  return <div className="h-6 w-px shrink-0 bg-edge" />
}

function ModeButton({
  icon: Icon,
  active,
  onClick,
  children,
}: {
  icon: LucideIcon
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs transition-colors ${
        active ? 'bg-accent text-white' : 'text-neutral-300 hover:text-white'
      }`}
    >
      <Icon size={13} /> {children}
    </button>
  )
}

interface MenuAction {
  icon: LucideIcon
  label: string
  onClick: () => void
}

function OverflowMenu({ actions, header }: { actions: MenuAction[]; header?: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0">
      <IconBtn title="More" active={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={17} />
      </IconBtn>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-60 overflow-hidden rounded-lg border border-edge bg-panel shadow-xl">
            {header && <div className="border-b border-edge p-2">{header}</div>}
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    a.onClick()
                  }}
                  className="flex h-11 w-full items-center gap-2.5 px-3 text-left text-xs text-neutral-200 hover:bg-panel2"
                >
                  <a.icon size={15} className="shrink-0 text-neutral-400" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
