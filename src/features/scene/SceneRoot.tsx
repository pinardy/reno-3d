import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { useStore } from '../../store/store'
import type { Vec2 } from '../../types/project'
import { registerCapturer, registerHomeExporter } from './screenshot'
import { DimensionLabels } from './DimensionLabels'
import { OpeningsGroup } from './Openings'
import { MeasureTool } from './MeasureTool'
import { Lighting } from './Lighting'
import { WallsGroup, CornerPosts } from './Walls'
import { RoomFloor } from './Floors'
import { ItemsGroup } from './Items'
import { WalkControls } from './controls'

// Bridge so the HTML layer (drag-drop) can convert screen coords to a floor point.
export type GroundPicker = (clientX: number, clientY: number) => Vec2 | null

export function SceneRoot({
  pickerRef,
  gizmoMode,
  showDimensions,
  dollhouse,
  measure,
  timeOfDay,
}: {
  pickerRef: React.MutableRefObject<GroundPicker | null>
  gizmoMode: 'move' | 'rotate'
  showDimensions: boolean
  dollhouse: boolean
  measure: boolean
  timeOfDay: number // 0..1, 0.5 = midday
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
    return () => {
      pickerRef.current = null
      registerCapturer(null)
      registerHomeExporter(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <RoomFloor key={room.id} room={room} />
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
    </>
  )
}
