import {
  MousePointer2,
  Ruler,
  Minus,
  DoorOpen,
  Square,
  LayoutGrid,
  ImagePlus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useStore, storeApi, type TraceTool } from '../../store/store'
import {
  Section,
  Row,
  ToolButton,
  Slider,
  NumberInput,
} from '../../app/ui'
import {
  DEFAULT_FLOOR_MATERIAL,
  DEFAULT_CEILING_MATERIAL,
} from '../../types/project'
import { detectRoomLoops } from './rooms'
import { makeSampleProject } from '../sample/sample'
import { TEMPLATES } from '../sample/templates'

const TOOLS: { id: TraceTool; label: string; key: string; icon: ReactNode }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: <MousePointer2 size={15} /> },
  { id: 'scale', label: 'Set scale', key: 'S', icon: <Ruler size={15} /> },
  { id: 'wall', label: 'Wall', key: 'W', icon: <Minus size={15} /> },
  { id: 'door', label: 'Door', key: 'D', icon: <DoorOpen size={15} /> },
  { id: 'window', label: 'Window', key: 'N', icon: <Square size={15} /> },
  { id: 'room', label: 'Room floor', key: 'R', icon: <LayoutGrid size={15} /> },
]

export function TraceToolsPanel() {
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const fp = useStore((s) => s.project.floorPlan)
  const commit = useStore((s) => s.commit)
  const wallHeight = useStore((s) => s.project.wallHeight)
  const wallThickness = useStore((s) => s.project.wallThickness)
  const rooms = useStore((s) => s.project.rooms.length)
  const isEmpty = useStore(
    (s) => s.project.walls.length === 0 && !s.project.floorPlan.imageDataUrl,
  )
  const loadProject = useStore((s) => s.loadProject)

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      commit((p) => {
        p.floorPlan.imageDataUrl = String(reader.result)
        p.floorPlan.pxPerMeter = null // force recalibration for the new image
      })
      setTool('scale')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function autoDetect() {
    const p = useStore.getState().project
    const loops = detectRoomLoops(p.walls)
    if (loops.length === 0) {
      alert(
        'No enclosed rooms found. Make sure wall corners meet (they snap together while tracing).',
      )
      return
    }
    let added = 0
    for (const loop of loops) {
      // skip loops that basically match an existing room (by centroid)
      const cx = loop.reduce((a, b) => a + b.x, 0) / loop.length
      const cz = loop.reduce((a, b) => a + b.z, 0) / loop.length
      const exists = p.rooms.some((r) => {
        const rx = r.loop.reduce((a, b) => a + b.x, 0) / r.loop.length
        const rz = r.loop.reduce((a, b) => a + b.z, 0) / r.loop.length
        return Math.hypot(rx - cx, rz - cz) < 0.3
      })
      if (exists) continue
      storeApi.addRoom({
        name: `Room ${p.rooms.length + added + 1}`,
        loop,
        floorMaterial: { ...DEFAULT_FLOOR_MATERIAL },
        ceilingMaterial: { ...DEFAULT_CEILING_MATERIAL },
        showCeiling: false,
      })
      added++
    }
    alert(added > 0 ? `Added ${added} room floor(s).` : 'Rooms already detected.')
  }

  return (
    <div>
      {isEmpty && (
        <Section title="Get started">
          <p className="mb-1.5 text-[11px] text-neutral-500">Start from an HDB layout:</p>
          <div className="grid grid-cols-3 gap-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadProject(t.make())}
                className="rounded bg-panel2 px-1 py-2 text-[11px] font-medium text-neutral-200 ring-1 ring-edge hover:bg-edge"
              >
                {t.name.replace('HDB ', '')}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => loadProject(makeSampleProject())}
            className="mt-2 w-full rounded bg-accent/15 px-2 py-2 text-xs font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/25"
          >
            ✨ Sample home
          </button>
          <p className="mt-1.5 text-[11px] text-neutral-500">
            Or upload your own floor plan below and trace the walls.
          </p>
        </Section>
      )}

      <Section title="Floor plan">
        <label className="mb-2 flex h-9 cursor-pointer items-center gap-2 rounded bg-panel2 px-2 text-xs text-neutral-200 hover:bg-edge">
          <ImagePlus size={15} className="text-accent" />
          {fp.imageDataUrl ? 'Replace image…' : 'Upload floor plan…'}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
        {fp.imageDataUrl && (
          <>
            <Row label="Show">
              <input
                type="checkbox"
                checked={fp.visible}
                onChange={(e) =>
                  commit((p) => {
                    p.floorPlan.visible = e.target.checked
                  })
                }
              />
            </Row>
            <Row label="Opacity">
              <Slider
                value={fp.opacity}
                onChange={(v) =>
                  useStore.getState().update((p) => {
                    p.floorPlan.opacity = v
                  })
                }
              />
            </Row>
            <div className="mt-1 text-[11px]">
              {fp.pxPerMeter == null ? (
                <span className="text-amber-400">⚠ Not calibrated — set the scale.</span>
              ) : (
                <span className="text-neutral-500">
                  Scale: {fp.pxPerMeter.toFixed(1)} px/m
                </span>
              )}
            </div>
          </>
        )}
      </Section>

      <Section title="Tools">
        <div className="grid grid-cols-1 gap-1">
          {TOOLS.map((t) => (
            <ToolButton
              key={t.id}
              active={tool === t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.key})`}
            >
              {t.icon}
              <span className="flex-1 text-left">{t.label}</span>
              <span className="text-[10px] text-neutral-500">{t.key}</span>
            </ToolButton>
          ))}
        </div>
      </Section>

      <Section title="Wall defaults">
        <Row label="Height">
          <NumberInput
            value={wallHeight}
            step={0.05}
            min={1.5}
            max={5}
            suffix="m"
            onChange={(v) =>
              commit((p) => {
                p.wallHeight = v
              })
            }
          />
        </Row>
        <Row label="Thickness">
          <NumberInput
            value={wallThickness}
            step={0.01}
            min={0.02}
            max={0.5}
            suffix="m"
            onChange={(v) =>
              commit((p) => {
                p.wallThickness = v
              })
            }
          />
        </Row>
      </Section>

      <Section title="Rooms">
        <ToolButton onClick={autoDetect} title="Detect enclosed rooms from walls">
          <Sparkles size={15} className="text-accent" />
          <span className="flex-1 text-left">Detect rooms from walls</span>
        </ToolButton>
        <p className="mt-1 px-1 text-[11px] text-neutral-500">
          {rooms} room{rooms === 1 ? '' : 's'} defined. Or use the Room tool to draw
          floors by hand.
        </p>
      </Section>

      <Section title="Danger">
        <ToolButton
          onClick={() => {
            if (confirm('Delete all walls, rooms and openings? Furniture is kept.')) {
              commit((p) => {
                p.walls = []
                p.rooms = []
                p.openings = []
              })
            }
          }}
          title="Clear all geometry"
        >
          <Trash2 size={15} className="text-red-400" />
          <span className="flex-1 text-left text-red-300">Clear all walls</span>
        </ToolButton>
      </Section>
    </div>
  )
}
