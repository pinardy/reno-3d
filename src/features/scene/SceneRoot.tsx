import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Grid } from '@react-three/drei'
import { useStore } from '../../store/store'
import type { Item, Room, Wall, Vec2 } from '../../types/project'
import { buildWallPieces } from '../../geometry/walls'
import { buildFloorGeometry } from '../../geometry/floor'
import { SurfaceMaterial } from '../materials/SurfaceMaterial'
import { FurnitureModel } from '../catalog/FurnitureModel'
import { polygonCentroid } from '../../geometry/vec'
import { registerCapturer } from './screenshot'
import { DimensionLabels } from './DimensionLabels'

// Bridge so the HTML layer (drag-drop) can convert screen coords to a floor point.
export type GroundPicker = (clientX: number, clientY: number) => Vec2 | null

export function SceneRoot({
  pickerRef,
  gizmoMode,
  showDimensions,
}: {
  pickerRef: React.MutableRefObject<GroundPicker | null>
  gizmoMode: 'move' | 'rotate'
  showDimensions: boolean
}) {
  const walls = useStore((s) => s.project.walls)
  const rooms = useStore((s) => s.project.rooms)
  const items = useStore((s) => s.project.items)
  const cameraMode = useStore((s) => s.cameraMode)

  const { camera, gl, raycaster, scene } = useThree()
  const groundRef = useRef<THREE.Mesh>(null)
  const orbitRef = useRef<any>(null)

  // register ground picker + screenshot capturer
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
    return () => {
      pickerRef.current = null
      registerCapturer(null)
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
      <color attach="background" args={['#aeb7c2']} />
      <hemisphereLight args={['#ffffff', '#8d8272', 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[6, 12, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
      />

      {/* ground */}
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

      <WallsGroup walls={walls} openings={useStore.getState().project.openings} />
      {rooms.map((room) => (
        <RoomFloor key={room.id} room={room} />
      ))}

      {showDimensions && <DimensionLabels />}

      <ItemsGroup
        items={items}
        orbitRef={orbitRef}
        intersectGround={intersectGround}
        gizmoMode={gizmoMode}
        enabled={cameraMode === 'orbit'}
      />

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

// re-render walls when openings change too
function WallsGroup({ walls }: { walls: Wall[]; openings: unknown }) {
  const openings = useStore((s) => s.project.openings)
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  return (
    <group>
      {walls.map((wall) => {
        const pieces = buildWallPieces(wall, openings)
        const sel = selection.type === 'wall' && selection.id === wall.id
        return (
          <group
            key={wall.id}
            onClick={(e) => {
              e.stopPropagation()
              select({ type: 'wall', id: wall.id })
            }}
          >
            {pieces.map((pc, i) => (
              <mesh
                key={i}
                position={pc.position}
                rotation={[0, -pc.angle, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={pc.size} />
                <SurfaceMaterial
                  material={sel ? { ...wall.material, color: '#4f8cff' } : wall.material}
                  repeat={[Math.max(1, pc.size[0] / 2), Math.max(1, pc.size[1] / 2)]}
                />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

function RoomFloor({ room }: { room: Room }) {
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  const wallHeight = useStore((s) => s.project.wallHeight)
  const floorGeom = useMemo(() => buildFloorGeometry(room.loop, 0.01, true), [room.loop])
  const ceilGeom = useMemo(
    () => buildFloorGeometry(room.loop, wallHeight, false),
    [room.loop, wallHeight],
  )
  const sel = selection.type === 'room' && selection.id === room.id
  return (
    <group>
      <mesh
        geometry={floorGeom}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          select({ type: 'room', id: room.id })
        }}
      >
        <SurfaceMaterial
          material={sel ? { ...room.floorMaterial, color: '#6f9bff' } : room.floorMaterial}
        />
      </mesh>
      {room.showCeiling && (
        <mesh geometry={ceilGeom} receiveShadow>
          <SurfaceMaterial material={room.ceilingMaterial} />
        </mesh>
      )}
    </group>
  )
}

interface ItemDrag {
  id: string
  offset: Vec2
  pre: import('../../types/project').Project
}

function ItemsGroup({
  items,
  orbitRef,
  intersectGround,
  gizmoMode,
  enabled,
}: {
  items: Item[]
  orbitRef: React.MutableRefObject<any>
  intersectGround: (x: number, y: number) => Vec2 | null
  gizmoMode: 'move' | 'rotate'
  enabled: boolean
}) {
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  const { gl } = useThree()
  const dragRef = useRef<ItemDrag | null>(null)
  const rotRef = useRef<{ id: string; startAngle: number; itemStart: number; pre: any } | null>(null)

  useEffect(() => {
    const el = gl.domElement
    function move(e: PointerEvent) {
      const drag = dragRef.current
      if (drag && enabled) {
        const p = intersectGround(e.clientX, e.clientY)
        if (!p) return
        let nx = p.x - drag.offset.x
        let nz = p.z - drag.offset.z
        if (e.shiftKey) {
          nx = Math.round(nx / 0.1) * 0.1
          nz = Math.round(nz / 0.1) * 0.1
        }
        useStore.getState().update((proj) => {
          const it = proj.items.find((i) => i.id === drag.id)
          if (it) it.position = { x: nx, z: nz }
        })
        return
      }
      const rot = rotRef.current
      if (rot && enabled) {
        const p = intersectGround(e.clientX, e.clientY)
        if (!p) return
        const it0 = useStore.getState().project.items.find((i) => i.id === rot.id)
        if (!it0) return
        const ang = Math.atan2(p.z - it0.position.z, p.x - it0.position.x)
        useStore.getState().update((proj) => {
          const it = proj.items.find((i) => i.id === rot.id)
          if (it) it.rotationY = rot.itemStart + (ang - rot.startAngle)
        })
      }
    }
    function up() {
      if (dragRef.current) {
        if (dragRef.current.pre !== useStore.getState().project)
          useStore.getState().pushPast(dragRef.current.pre)
        dragRef.current = null
      }
      if (rotRef.current) {
        if (rotRef.current.pre !== useStore.getState().project)
          useStore.getState().pushPast(rotRef.current.pre)
        rotRef.current = null
      }
      if (orbitRef.current) orbitRef.current.enabled = enabled
    }
    el.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl, intersectGround, orbitRef, enabled])

  function onItemDown(e: ThreeEvent<PointerEvent>, item: Item) {
    if (!enabled) return
    e.stopPropagation()
    select({ type: 'item', id: item.id })
    const p = intersectGround(e.nativeEvent.clientX, e.nativeEvent.clientY)
    if (!p) return
    if (orbitRef.current) orbitRef.current.enabled = false
    if (gizmoMode === 'rotate') {
      const startAngle = Math.atan2(p.z - item.position.z, p.x - item.position.x)
      rotRef.current = {
        id: item.id,
        startAngle,
        itemStart: item.rotationY,
        pre: useStore.getState().project,
      }
    } else {
      dragRef.current = {
        id: item.id,
        offset: { x: p.x - item.position.x, z: p.z - item.position.z },
        pre: useStore.getState().project,
      }
    }
  }

  return (
    <group>
      {items.map((item) => {
        const sel = selection.type === 'item' && selection.id === item.id
        return (
          <group
            key={item.id}
            position={[item.position.x, item.y, item.position.z]}
            rotation={[0, item.rotationY, 0]}
            scale={item.scale}
            onPointerDown={(e) => onItemDown(e, item)}
            onClick={(e) => {
              e.stopPropagation()
              select({ type: 'item', id: item.id })
            }}
          >
            <FurnitureModel item={item} />
            {sel && <SelectionRing item={item} />}
          </group>
        )
      })}
    </group>
  )
}

function SelectionRing({ item }: { item: Item }) {
  // a subtle glowing ring at the base to indicate selection
  const r = 0.6
  void item
  return (
    <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[r, r + 0.05, 40]} />
      <meshBasicMaterial color="#4f8cff" transparent opacity={0.9} />
    </mesh>
  )
}

function WalkControls() {
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const started = useRef(false)

  useEffect(() => {
    if (!started.current) {
      started.current = true
      camera.position.set(2, 1.6, 5)
      camera.lookAt(4, 1.6, 0)
    }
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true)
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [camera])

  useFrame((_, dt) => {
    const speed = 2.4 * dt
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    dir.y = 0
    dir.normalize()
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0))
    const k = keys.current
    if (k['KeyW'] || k['ArrowUp']) camera.position.addScaledVector(dir, speed)
    if (k['KeyS'] || k['ArrowDown']) camera.position.addScaledVector(dir, -speed)
    if (k['KeyD'] || k['ArrowRight']) camera.position.addScaledVector(right, speed)
    if (k['KeyA'] || k['ArrowLeft']) camera.position.addScaledVector(right, -speed)
    camera.position.y = 1.6
  })

  return <PointerLockControls makeDefault />
}

export { polygonCentroid }
