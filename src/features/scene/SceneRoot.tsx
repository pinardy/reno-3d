import { Suspense, lazy, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { useStore } from '../../store/store'
import type { Vec2 } from '../../types/project'
import { registerCapturer, registerHomeExporter } from './screenshot'
import { registerFocusPicker } from './focus'
import { usePanModifier, isPanModifierHeld } from './panModifier'
import { DimensionLabels } from './DimensionLabels'
import { OpeningsGroup } from './Openings'
import { MeasureTool } from './MeasureTool'
import { Lighting } from './Lighting'
import { WallsGroup, CornerPosts } from './Walls'
import { RoomFloor } from './Floors'
import { ItemsGroup } from './Items'
import { WalkControls } from './controls'

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
  hq,
}: {
  pickerRef: React.MutableRefObject<GroundPicker | null>
  gizmoMode: 'move' | 'rotate'
  showDimensions: boolean
  dollhouse: boolean
  measure: boolean
  timeOfDay: number // 0..1, 0.5 = midday
  showCeilings: boolean
  hq: boolean
}) {
  const walls = useStore((s) => s.project.walls)
  const rooms = useStore((s) => s.project.rooms)
  const items = useStore((s) => s.project.items)
  const openings = useStore((s) => s.project.openings)
  const cameraMode = useStore((s) => s.cameraMode)

  const { camera, gl, raycaster, scene } = useThree()
  const groundRef = useRef<THREE.Mesh>(null)
  const homeRef = useRef<THREE.Group>(null)
  // third-party OrbitControls ref (typed `any` at this boundary only)
  const orbitRef = useRef<any>(null)

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
    return () => {
      pickerRef.current = null
      registerCapturer(null)
      registerHomeExporter(null)
      registerFocusPicker(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
