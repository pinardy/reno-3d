import { Suspense, lazy, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { useStore } from '../../store/store'
import type { Vec2 } from '../../types/project'
import { registerCapturer, registerHomeExporter } from './screenshot'
import { registerFocusPicker } from './focus'
import { registerCameraControl } from './cameraBridge'
import { usePanModifier, isPanModifierHeld } from './panModifier'
import { DimensionLabels } from './DimensionLabels'
import { OpeningsGroup } from './Openings'
import { MeasureTool } from './MeasureTool'
import { Lighting } from './Lighting'
import { ItemLights } from './ItemLights'
import { WallsGroup, CornerPosts } from './Walls'
import { RoomFloor } from './Floors'
import { ItemsGroup } from './Items'
import { WalkControls } from './controls'
import { TrunkingGroup } from '../aircon/Trunking'

// postprocessing + n8ao are ~820KB of the 3D bundle, for a pass that phones
// start with switched off. Load them only once HQ is actually asked for.
const Effects = lazy(() => import('./Effects').then((m) => ({ default: m.Effects })))

// Bridge so the HTML layer (drag-drop) can convert screen coords to a floor point.
export type GroundPicker = (clientX: number, clientY: number) => Vec2 | null

export function SceneRoot({
  pickerRef,
  gizmoMode,
  showDimensions,
  dollhouse,
  measure,
  timeOfDay,
  showCeilings,
  showTrunking,
  hq,
  onContextLost,
}: {
  pickerRef: React.MutableRefObject<GroundPicker | null>
  gizmoMode: 'move' | 'rotate'
  showDimensions: boolean
  dollhouse: boolean
  measure: boolean
  timeOfDay: number // 0..1, 0.5 = midday
  showCeilings: boolean
  showTrunking: boolean
  hq: boolean
  onContextLost: (lost: boolean) => void
}) {
  const walls = useStore((s) => s.project.walls)
  const rooms = useStore((s) => s.project.rooms)
  const items = useStore((s) => s.project.items)
  const openings = useStore((s) => s.project.openings)
  const aircon = useStore((s) => s.project.aircon)
  const cameraMode = useStore((s) => s.cameraMode)

  const { camera, gl, raycaster, scene } = useThree()
  const groundRef = useRef<THREE.Mesh>(null)
  const homeRef = useRef<THREE.Group>(null)
  // third-party OrbitControls ref (typed `any` at this boundary only)
  const orbitRef = useRef<any>(null)

  // Middle-drag pans, which is what every CAD and 3D tool does and what the wheel
  // being a scroll wheel already implies — OrbitControls otherwise puts dolly on
  // the middle button, duplicating the scroll it sits under. Right-drag keeps
  // panning too. Built once per mount so the reference stays stable: this is the
  // very object usePanModifier flips LEFT on, and a fresh literal each render
  // would have drei reassign it and undo a space-hold mid-gesture.
  const mouseButtons = useMemo(
    () => ({
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    }),
    [],
  )

  usePanModifier(orbitRef, cameraMode === 'orbit')

  // register the ground picker + screenshot capturer + glTF exporter
  useEffect(() => {
    pickerRef.current = (clientX, clientY) => intersectGround(clientX, clientY)
    registerCapturer(() => {
      try {
        gl.render(scene, camera) // ensure a fresh frame is in the buffer
        return gl.domElement.toDataURL('image/png')
      } catch {
        return null
      }
    })
    registerHomeExporter(() => {
      if (!homeRef.current) return
      new GLTFExporter().parse(
        homeRef.current,
        (result) => {
          const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' })
          const name = useStore.getState().project.name.replace(/[^\w-]+/g, '_') || 'home'
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `${name}.glb`
          a.click()
          URL.revokeObjectURL(a.href)
        },
        (err) => console.error('glTF export failed', err),
        { binary: true },
      )
    })
    registerFocusPicker(() => focusPoint())
    registerCameraControl({
      get: () => {
        const t = orbitRef.current?.target as THREE.Vector3 | undefined
        if (!t) return null
        return {
          pos: [camera.position.x, camera.position.y, camera.position.z],
          target: [t.x, t.y, t.z],
        }
      },
      apply: ({ pos, target }) => {
        camera.position.set(pos[0], pos[1], pos[2])
        const c = orbitRef.current
        if (c) {
          c.target.set(target[0], target[1], target[2])
          c.update()
        }
      },
    })
    return () => {
      pickerRef.current = null
      registerCapturer(null)
      registerHomeExporter(null)
      registerFocusPicker(null)
      registerCameraControl(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A lost GPU context (driver reset, or the OS reclaiming it from a backgrounded
  // tab on a low-memory device) is permanent unless we opt into restoration —
  // otherwise the canvas just goes black. preventDefault lets the browser hand
  // the context back, and three re-initialises its resources on restore.
  useEffect(() => {
    const canvas = gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      console.warn('WebGL context lost — awaiting restore')
      onContextLost(true)
    }
    // three's WebGLRenderer listens for this and rebuilds its resources; we just
    // clear the notice so the user knows the view is live again.
    const onRestored = () => onContextLost(false)
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl, onContextLost])

  /**
   * The floor point the camera is looking at. In orbit mode that is the pivot
   * the camera turns around, which is what panning and zooming aim at. In walk
   * mode it is where the view direction meets the floor.
   */
  function focusPoint(): Vec2 | null {
    if (useStore.getState().cameraMode === 'orbit') {
      const target = orbitRef.current?.target as THREE.Vector3 | undefined
      return target ? { x: target.x, z: target.z } : null
    }
    const dir = camera.getWorldDirection(new THREE.Vector3())
    const hit = new THREE.Vector3()
    const ray = new THREE.Ray(camera.position.clone(), dir)
    const ahead = (m: number) => ({
      x: camera.position.x + dir.x * m,
      z: camera.position.z + dir.z * m,
    })
    // near the horizon the floor is hit far away (or never), which would drop the
    // item somewhere off in the distance — keep it within arm's reach instead
    if (!ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit))
      return ahead(3)
    const reach = Math.hypot(hit.x - camera.position.x, hit.z - camera.position.z)
    return reach > 6 ? ahead(3) : { x: hit.x, z: hit.z }
  }

  function intersectGround(clientX: number, clientY: number): Vec2 | null {
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(ndc, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(plane, hit)) return { x: hit.x, z: hit.z }
    return null
  }

  return (
    <>
      <Lighting timeOfDay={timeOfDay} />
      <ItemLights items={items} timeOfDay={timeOfDay} />
      <ContactShadows
        position={[0, 0.002, 0]}
        scale={60}
        far={6}
        blur={2.4}
        opacity={0.5}
        resolution={1024}
      />

      <Grid
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#8a9098"
        sectionSize={5}
        sectionColor="#6f767e"
        infiniteGrid
        fadeDistance={45}
        position={[0, -0.001, 0]}
      />
      <mesh
        ref={groundRef}
        rotation-x={-Math.PI / 2}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          // a click that ends a drag (orbiting the camera, or dropping an item
          // that snapped away from the cursor) is not a deliberate deselect
          if (e.delta > 4 || isPanModifierHeld()) return
          useStore.getState().clearSelection()
        }}
      >
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#9aa1a8" roughness={1} transparent opacity={0} />
      </mesh>

      {/* home content — this group is what gets exported to glTF */}
      <group ref={homeRef}>
        <WallsGroup walls={walls} dollhouse={dollhouse} />
        <CornerPosts walls={walls} dollhouse={dollhouse} />
        <OpeningsGroup walls={walls} openings={openings} dollhouse={dollhouse} />
        {rooms.map((room) => (
          <RoomFloor key={room.id} room={room} ceiling={showCeilings} />
        ))}
        <ItemsGroup
          items={items}
          orbitRef={orbitRef}
          intersectGround={intersectGround}
          gizmoMode={gizmoMode}
          enabled={cameraMode === 'orbit' && !measure}
        />
        {showTrunking && <TrunkingGroup plan={aircon} />}
      </group>

      {showDimensions && <DimensionLabels />}
      {measure && cameraMode === 'orbit' && <MeasureTool />}

      {cameraMode === 'orbit' ? (
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.12}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={1}
          maxDistance={60}
          target={[4, 1, 3]}
          mouseButtons={mouseButtons}
        />
      ) : (
        <WalkControls />
      )}

      {hq && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </>
  )
}
