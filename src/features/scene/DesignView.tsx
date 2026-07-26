import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Move, RotateCw, Info, Ruler, Map, Building2, PencilRuler, Sun, SquareStack, Sparkles } from 'lucide-react'
import { SceneRoot, type GroundPicker } from './SceneRoot'
import { Compass } from './Compass'
import { ViewsControl } from './ViewsControl'
import { useStore, storeApi } from '../../store/store'
import { catalogById, newItemFromCatalog } from '../catalog/catalog'
import { makeSampleProject } from '../sample/sample'
import { TEMPLATES } from '../sample/templates'
import { exportFloorPlanPNG } from '../persistence/floorplanExport'
import { isSmallScreen, useIsSmallScreen } from '../../lib/device'

export function DesignView() {
  const pickerRef = useRef<GroundPicker | null>(null)
  const [gizmoMode, setGizmoMode] = useState<'move' | 'rotate'>('move')
  const [showDimensions, setShowDimensions] = useState(false)
  const [dollhouse, setDollhouse] = useState(false)
  const [measure, setMeasure] = useState(false)
  const [showCeilings, setShowCeilings] = useState(false)
  // the postprocessing pass (AO + bloom + AA) is too heavy for a phone GPU, so
  // start it off there — the toggle is still available if the device can take it
  const [hq, setHq] = useState(() => !isSmallScreen())
  const [timeOfDay, setTimeOfDay] = useState(0.5)
  const small = useIsSmallScreen()
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
        // a phone's device pixel ratio is often 3; rendering the full 3D scene at
        // that resolution costs far more than it shows
        dpr={[1, small ? 1.5 : 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [10, 9, 12], fov: 50, near: 0.05, far: 500 }}
      >
        <SceneRoot
          pickerRef={pickerRef}
          gizmoMode={gizmoMode}
          showDimensions={showDimensions}
          dollhouse={dollhouse}
          measure={measure}
          timeOfDay={timeOfDay}
          showCeilings={showCeilings}
          hq={hq}
        />
      </Canvas>

      {/* top-left toolbar — wraps into rows once it runs out of width */}
      <div className="absolute left-2 right-2 top-2 flex flex-wrap items-start gap-1.5 sm:left-3 sm:right-auto sm:top-3 sm:items-center sm:gap-2">
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
              <Move size={14} /> <span className="hidden sm:inline">Move</span>
            </button>
            <button
              type="button"
              title="Rotate (drag furniture to spin it)"
              onClick={() => setGizmoMode('rotate')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
                gizmoMode === 'rotate' ? 'bg-accent text-white' : 'text-neutral-300 hover:bg-panel2'
              }`}
            >
              <RotateCw size={14} /> <span className="hidden sm:inline">Rotate</span>
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
            <Ruler size={14} /> <span className="hidden sm:inline">Dimensions</span>
          </button>
          <button
            type="button"
            title="Dollhouse view — cut walls down for a top-down look inside"
            onClick={() => setDollhouse((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
              dollhouse ? 'bg-accent text-white' : 'text-neutral-300 hover:bg-panel2'
            }`}
          >
            <Building2 size={14} /> <span className="hidden sm:inline">Dollhouse</span>
          </button>
          <button
            type="button"
            title="Measure — click two points to get the distance"
            onClick={() => setMeasure((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
              measure ? 'bg-accent text-white' : 'text-neutral-300 hover:bg-panel2'
            }`}
          >
            <PencilRuler size={14} /> <span className="hidden sm:inline">Measure</span>
          </button>
          <button
            type="button"
            title="Show ceilings on all rooms"
            onClick={() => setShowCeilings((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
              showCeilings ? 'bg-accent text-white' : 'text-neutral-300 hover:bg-panel2'
            }`}
          >
            <SquareStack size={14} /> <span className="hidden sm:inline">Ceilings</span>
          </button>
          <button
            type="button"
            title="High-quality rendering (ambient occlusion, bloom, anti-aliasing)"
            onClick={() => setHq((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
              hq ? 'bg-accent text-white' : 'text-neutral-300 hover:bg-panel2'
            }`}
          >
            <Sparkles size={14} /> <span className="hidden sm:inline">HQ</span>
          </button>
          <button
            type="button"
            title="Export a top-down floor plan (PNG)"
            onClick={() => exportFloorPlanPNG(useStore.getState().project)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-neutral-300 hover:bg-panel2"
          >
            <Map size={14} /> <span className="hidden sm:inline">Floor plan</span>
          </button>
        </div>
        {/* time of day */}
        <div
          className="flex items-center gap-2 rounded-lg bg-panel/90 px-2.5 py-1.5 backdrop-blur"
          title="Time of day — drag from night to midday"
        >
          <Sun size={14} className="text-amber-300" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            className="w-24"
          />
        </div>
        <Compass />
        {cameraMode === 'orbit' && <ViewsControl />}
      </div>

      {/* hints */}
      <div className="pointer-events-none absolute bottom-3 left-2 right-2 flex items-center gap-1.5 rounded-md bg-panel/80 px-3 py-1.5 text-[11px] text-neutral-400 backdrop-blur sm:left-3 sm:right-auto">
        <Info size={12} className="shrink-0" />
        {cameraMode === 'walk'
          ? 'Walk: click to lock the mouse, WASD / arrows to move, Esc to release.'
          : measure
            ? small
              ? 'Measure: tap two points on any surface to see the distance.'
              : 'Measure: click two points on any surface to see the distance. Click again to start over.'
            : small
              ? 'Tap Furniture below to add · drag an item to move it · two fingers to pan and zoom.'
              : 'Drag furniture from the left. Drag it on the floor to move · switch to Rotate to spin · Shift snaps to grid.'}
      </div>

      {!hasContent && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="mx-4 rounded-xl bg-panel/90 px-6 py-5 text-center backdrop-blur">
            <p className="text-sm font-medium text-neutral-200">Nothing to show yet</p>
            <p className="mt-1 text-xs text-neutral-400">
              Switch to <span className="text-accent">Trace 2D</span> and draw some
              walls — they'll appear here in 3D.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => useStore.getState().loadProject(t.make())}
                  className="rounded bg-panel2 px-2.5 py-1.5 text-xs font-medium text-neutral-200 ring-1 ring-edge hover:bg-edge"
                >
                  {t.name.replace('HDB ', '')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => useStore.getState().loadProject(makeSampleProject())}
                className="rounded bg-accent/15 px-2.5 py-1.5 text-xs font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/25"
              >
                ✨ Sample
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
