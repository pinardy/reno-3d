import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree, useFrame, type ThreeEvent } from '@react-three/fiber'
import {
  OrbitControls,
  PointerLockControls,
  Grid,
  Sky,
  ContactShadows,
} from '@react-three/drei'
import { useStore } from '../../store/store'
import type { Item, Room, Wall, Vec2 } from '../../types/project'
import { buildWallPieces } from '../../geometry/walls'
import { buildFloorGeometry } from '../../geometry/floor'
import { SurfaceMaterial } from '../materials/SurfaceMaterial'
import { FurnitureModel } from '../catalog/FurnitureModel'
import { catalogById } from '../catalog/catalog'
import { polygonCentroid, projectOnSegment, dist } from '../../geometry/vec'
import { roomBBoxSize } from '../trace/rooms'
import { registerCapturer } from './screenshot'
import { DimensionLabels } from './DimensionLabels'
import { OpeningsGroup } from './Openings'
import { MeasureTool } from './MeasureTool'

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
      <Lighting timeOfDay={timeOfDay} />
      {/* soft contact shadow to ground the whole scene */}
      <ContactShadows
        position={[0, 0.002, 0]}
        scale={60}
        far={6}
        blur={2.4}
        opacity={0.5}
        resolution={1024}
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

      <WallsGroup walls={walls} dollhouse={dollhouse} />
      <CornerPosts walls={walls} dollhouse={dollhouse} />
      <OpeningsGroup walls={walls} openings={openings} dollhouse={dollhouse} />
      {rooms.map((room) => (
        <RoomFloor key={room.id} room={room} />
      ))}

      {showDimensions && <DimensionLabels />}
      {measure && cameraMode === 'orbit' && <MeasureTool />}

      <ItemsGroup
        items={items}
        orbitRef={orbitRef}
        intersectGround={intersectGround}
        gizmoMode={gizmoMode}
        enabled={cameraMode === 'orbit' && !measure}
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

const DOLLHOUSE_H = 1.1 // capped wall height for the cutaway view

// re-render walls when openings change too
function WallsGroup({ walls, dollhouse }: { walls: Wall[]; dollhouse: boolean }) {
  const openings = useStore((s) => s.project.openings)
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  return (
    <group>
      {walls.map((wall0) => {
        const wall = dollhouse
          ? { ...wall0, height: Math.min(wall0.height, DOLLHOUSE_H) }
          : wall0
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

// Sky + sun driven by a time-of-day value (0..1, 0.5 = midday), plus per-room
// ceiling lights that brighten as it gets dark.
function Lighting({ timeOfDay }: { timeOfDay: number }) {
  const rooms = useStore((s) => s.project.rooms)
  const wallHeight = useStore((s) => s.project.wallHeight)

  const sunAngle = (timeOfDay - 0.5) * Math.PI * 1.15
  const elevation = Math.cos(sunAngle)
  const daylight = Math.max(0, elevation) // 0 at night, 1 at noon
  const sunX = Math.sin(sunAngle) * 12
  const sunY = elevation * 14
  const sunColor = mixHex('#ffcf99', '#fff6ea', daylight) // warm when low in the sky
  const artificial = 1 - Math.min(1, daylight * 1.4) // how strongly room lights are needed

  return (
    <>
      <Sky
        sunPosition={[sunX, sunY, 4]}
        turbidity={8}
        rayleigh={daylight < 0.35 ? 3 : 1.2}
        mieCoefficient={0.006}
      />
      <hemisphereLight args={['#dfe7f2', '#6a6152', 0.12 + daylight * 0.6]} />
      <ambientLight intensity={0.1 + daylight * 0.3} />
      <directionalLight
        position={[sunX, Math.max(1, sunY), 5]}
        intensity={0.15 + daylight * 2.3}
        color={sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
      />
      {artificial > 0.05 &&
        rooms.map((r) => {
          if (r.loop.length < 3) return null
          const c = polygonCentroid(r.loop)
          const { w, d } = roomBBoxSize(r.loop)
          return (
            <pointLight
              key={r.id}
              position={[c.x, wallHeight - 0.18, c.z]}
              intensity={artificial * 6}
              distance={Math.max(w, d) + 2.5}
              decay={2}
              color="#ffe4bd"
            />
          )
        })}
    </>
  )
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ar = pa >> 16, ag = (pa >> 8) & 0xff, ab = pa & 0xff
  const br = pb >> 16, bg = (pb >> 8) & 0xff, bb = pb & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${bl})`
}

// Vertical posts at each wall endpoint fill the gaps/seams where wall boxes meet.
function CornerPosts({ walls, dollhouse }: { walls: Wall[]; dollhouse: boolean }) {
  const posts = useMemo(() => {
    const vs: { x: number; z: number; thick: number; height: number; material: Wall['material'] }[] = []
    for (const w of walls) {
      const h = dollhouse ? Math.min(w.height, DOLLHOUSE_H) : w.height
      for (const end of [w.a, w.b]) {
        const found = vs.find(
          (v) => Math.abs(v.x - end.x) < 0.02 && Math.abs(v.z - end.z) < 0.02,
        )
        if (found) {
          found.thick = Math.max(found.thick, w.thickness)
          found.height = Math.max(found.height, h)
        } else {
          vs.push({ x: end.x, z: end.z, thick: w.thickness, height: h, material: w.material })
        }
      }
    }
    return vs
  }, [walls, dollhouse])

  return (
    <group>
      {posts.map((v, i) => (
        <mesh key={i} position={[v.x, v.height / 2, v.z]} castShadow receiveShadow>
          <boxGeometry args={[v.thick, v.height, v.thick]} />
          <SurfaceMaterial material={v.material} repeat={[1, Math.max(1, v.height / 2)]} />
        </mesh>
      ))}
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
  ids: string[]
  starts: Record<string, Vec2>
  pointerStart: Vec2
  single: boolean // single-item drags support cabinet wall-snap
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
  const selectedItemIds = useStore((s) => s.selectedItemIds)
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
        let dx = p.x - drag.pointerStart.x
        let dz = p.z - drag.pointerStart.z

        if (drag.single) {
          const id = drag.ids[0]
          const start = drag.starts[id]
          let nx = start.x + dx
          let nz = start.z + dz
          if (e.shiftKey) {
            nx = Math.round(nx / 0.1) * 0.1
            nz = Math.round(nz / 0.1) * 0.1
          }
          const dItem = useStore.getState().project.items.find((i) => i.id === id)
          // kitchen cabinets snap their back against a nearby wall
          let snapped: { x: number; z: number; rotationY: number } | null = null
          if (dItem?.kind === 'cabinet' && !e.shiftKey) {
            const entry = catalogById(dItem.catalogId)
            const depth =
              typeof dItem.params?.depth === 'number'
                ? dItem.params.depth
                : (entry?.size.d ?? 0.6)
            snapped = snapCabinetToWall(
              { x: nx, z: nz },
              depth,
              useStore.getState().project.walls,
            )
          }
          useStore.getState().update((proj) => {
            const it = proj.items.find((i) => i.id === id)
            if (!it) return
            if (snapped) {
              it.position = { x: snapped.x, z: snapped.z }
              it.rotationY = snapped.rotationY
            } else {
              it.position = { x: nx, z: nz }
            }
          })
        } else {
          // group move: apply the same (optionally grid-snapped) delta to all
          if (e.shiftKey) {
            dx = Math.round(dx / 0.1) * 0.1
            dz = Math.round(dz / 0.1) * 0.1
          }
          useStore.getState().update((proj) => {
            for (const id of drag.ids) {
              const it = proj.items.find((i) => i.id === id)
              const start = drag.starts[id]
              if (it && start) it.position = { x: start.x + dx, z: start.z + dz }
            }
          })
        }
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
    const st = useStore.getState()

    // shift-click toggles the item in/out of the multi-selection (no drag)
    if (e.nativeEvent.shiftKey) {
      st.toggleItem(item.id)
      return
    }

    const inMulti =
      st.selectedItemIds.length > 1 && st.selectedItemIds.includes(item.id)
    if (!inMulti) st.select({ type: 'item', id: item.id })

    const p = intersectGround(e.nativeEvent.clientX, e.nativeEvent.clientY)
    if (!p) return
    if (orbitRef.current) orbitRef.current.enabled = false

    if (gizmoMode === 'rotate' && !inMulti) {
      const startAngle = Math.atan2(p.z - item.position.z, p.x - item.position.x)
      rotRef.current = {
        id: item.id,
        startAngle,
        itemStart: item.rotationY,
        pre: st.project,
      }
      return
    }

    const proj = useStore.getState().project
    const ids = inMulti ? [...st.selectedItemIds] : [item.id]
    const starts: Record<string, Vec2> = {}
    for (const id of ids) {
      const it = proj.items.find((i) => i.id === id)
      if (it) starts[id] = { ...it.position }
    }
    dragRef.current = {
      ids,
      starts,
      pointerStart: { x: p.x, z: p.z },
      single: ids.length === 1,
      pre: st.project,
    }
  }

  return (
    <group>
      {items.map((item) => {
        const sel = selectedItemIds.includes(item.id)
        return (
          <group
            key={item.id}
            position={[item.position.x, item.y, item.position.z]}
            rotation={[0, item.rotationY, 0]}
            scale={item.scale}
            onPointerDown={(e) => onItemDown(e, item)}
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
    // resolve wall collisions (doorways at eye height stay passable)
    resolveWallCollision(camera.position, 1.6)
    camera.position.y = 1.6
  })

  return <PointerLockControls makeDefault />
}

// Push a walker position out of any wall it penetrates. Openings that are open
// at the given eye height (doors always; windows only within their vertical
// span) are treated as passable gaps.
function resolveWallCollision(pos: THREE.Vector3, eyeY: number) {
  const { walls, openings } = useStore.getState().project
  const radius = 0.28
  for (const w of walls) {
    const proj = projectOnSegment({ x: pos.x, z: pos.z }, w.a, w.b)
    const minDist = radius + w.thickness / 2
    if (proj.dist >= minDist || proj.dist < 1e-5) continue
    // is this point within a passable opening?
    const offset = dist(w.a, proj.point)
    const passable = openings.some((o) => {
      if (o.wallId !== w.id) return false
      const within = Math.abs(offset - o.offset) < o.width / 2
      if (!within) return false
      // passable if the eye height is inside the opening void
      return eyeY >= o.sillHeight && eyeY <= o.sillHeight + o.height
    })
    if (passable) continue
    const nx = (pos.x - proj.point.x) / proj.dist
    const nz = (pos.z - proj.point.z) / proj.dist
    pos.x = proj.point.x + nx * minDist
    pos.z = proj.point.z + nz * minDist
  }
}

// Snap a cabinet so its back sits against the nearest wall (within maxDist).
// Returns snapped position + rotation, or null if no wall is close enough.
function snapCabinetToWall(
  pos: Vec2,
  depth: number,
  walls: Wall[],
  maxDist = 0.7,
): { x: number; z: number; rotationY: number } | null {
  let best: { w: Wall; point: Vec2 } | null = null
  let bestD = maxDist
  for (const w of walls) {
    const proj = projectOnSegment(pos, w.a, w.b)
    if (proj.t <= 0.001 || proj.t >= 0.999) continue
    if (proj.dist < bestD) {
      bestD = proj.dist
      best = { w, point: proj.point }
    }
  }
  if (!best) return null
  const w = best.w
  const L = dist(w.a, w.b)
  if (L < 1e-4) return null
  const dirx = (w.b.x - w.a.x) / L
  const dirz = (w.b.z - w.a.z) / L
  let nx = -dirz
  let nz = dirx
  // point the normal toward the current (interior) side
  if (nx * (pos.x - best.point.x) + nz * (pos.z - best.point.z) < 0) {
    nx = -nx
    nz = -nz
  }
  const off = depth / 2 + w.thickness / 2
  return {
    x: best.point.x + nx * off,
    z: best.point.z + nz * off,
    rotationY: Math.atan2(nx, nz), // local +z (front) faces the interior normal
  }
}

export { polygonCentroid }
