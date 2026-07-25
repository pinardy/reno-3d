import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Move, RotateCw, Info, Ruler, Map } from 'lucide-react'
import { SceneRoot, type GroundPicker } from './SceneRoot'
import { useStore, storeApi } from '../../store/store'
import { catalogById, newItemFromCatalog } from '../catalog/catalog'
import { makeSampleProject } from '../sample/sample'
import { exportFloorPlanPNG } from '../persistence/floorplanExport'

export function DesignView() {
  const pickerRef = useRef<GroundPicker | null>(null)
  const [gizmoMode, setGizmoMode] = useState<'move' | 'rotate'>('move')
  const [showDimensions, setShowDimensions] = useState(false)
  const cameraMode = useStore((s) => s.cameraMode)
  const hasContent = useStore(
    (s) => s.project.walls.length > 0 || s.project.items.length > 0,
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/catalog-id')
    if (!id) return
    const entry = catalogById(id)
    if (!entry) return
    const pos = pickerRef.current?.(e.clientX, e.clientY) ?? { x: 0, z: 0 }
    const item = newItemFromCatalog(entry, pos)
    const newId = storeApi.addItem(item)
    useStore.getState().select({ type: 'item', id: newId })
  }

  return (
    <div
      className="absolute inset-0"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [10, 9, 12], fov: 50, near: 0.05, far: 500 }}
      >
        <SceneRoot
          pickerRef={pickerRef}
          gizmoMode={gizmoMode}
          showDimensions={showDimensions}
        />
      </Canvas>

      {/* top-left toolbar */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        {cameraMode === 'orbit' && (
          <div className="flex items-center gap-1 rounded-lg bg-panel/90 p-1 backdrop-blur">
            <button
              type="button"
              title="Move (drag furniture along the floor)"
              onClick={() => setGizmoMode('move')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
                gizmoMode === 'move' ? 'bg-accent text-white' : 'text-neutral-300 hover:bg-panel2'
              }`}
            >
              <Move size={14} /> Move
            </button>
            <button
              type="button"
              title="Rotate (drag furniture to spin it)"
              onClick={() => setGizmoMode('rotate')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
                gizmoMode === 'rotate' ? 'bg-accent text-white' : 'text-neutral-300 hover:bg-panel2'
              }`}
            >
              <RotateCw size={14} /> Rotate
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 rounded-lg bg-panel/90 p-1 backdrop-blur">
          <button
            type="button"
            title="Toggle measurement labels"
            onClick={() => setShowDimensions((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
              showDimensions ? 'bg-accent text-white' : 'text-neutral-300 hover:bg-panel2'
            }`}
          >
            <Ruler size={14} /> Dimensions
          </button>
          <button
            type="button"
            title="Export a top-down floor plan (PNG)"
            onClick={() => exportFloorPlanPNG(useStore.getState().project)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-neutral-300 hover:bg-panel2"
          >
            <Map size={14} /> Floor plan
          </button>
        </div>
      </div>

      {/* hints */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-panel/80 px-3 py-1.5 text-[11px] text-neutral-400 backdrop-blur">
        <Info size={12} />
        {cameraMode === 'walk'
          ? 'Walk: click to lock the mouse, WASD / arrows to move, Esc to release.'
          : 'Drag furniture from the left. Drag it on the floor to move · switch to Rotate to spin · Shift snaps to grid.'}
      </div>

      {!hasContent && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-panel/90 px-6 py-5 text-center backdrop-blur">
            <p className="text-sm font-medium text-neutral-200">Nothing to show yet</p>
            <p className="mt-1 text-xs text-neutral-400">
              Switch to <span className="text-accent">Trace 2D</span> and draw some
              walls — they'll appear here in 3D.
            </p>
            <button
              type="button"
              onClick={() => useStore.getState().loadProject(makeSampleProject())}
              className="mt-3 rounded bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/25"
            >
              ✨ Load sample home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
