import { memo, useCallback, useEffect, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useStore } from '../../store/store'
import type { Item, Project, Vec2 } from '../../types/project'
import { catalogById } from '../catalog/catalog'
import { FurnitureModel } from '../catalog/FurnitureModel'
import { num } from '../../lib/params'
import { snapCabinetToWall } from './collision'

interface ItemDrag {
  ids: string[]
  starts: Record<string, Vec2>
  pointerStart: Vec2
  single: boolean // single-item drags support cabinet wall-snap
  pre: Project
}

export function ItemsGroup({
  items,
  orbitRef,
  intersectGround,
  gizmoMode,
  enabled,
}: {
  items: Item[]
  // third-party OrbitControls ref — only `.enabled` is read
  orbitRef: React.MutableRefObject<{ enabled: boolean } | null>
  intersectGround: (x: number, y: number) => Vec2 | null
  gizmoMode: 'move' | 'rotate'
  enabled: boolean
}) {
  const selectedItemIds = useStore((s) => s.selectedItemIds)
  const { gl } = useThree()
  const dragRef = useRef<ItemDrag | null>(null)
  const rotRef = useRef<{ id: string; startAngle: number; itemStart: number; pre: Project } | null>(null)

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
            const depth = num(dItem.params?.depth, entry?.size.d ?? 0.6)
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

  const onItemDown = useCallback(
    (e: ThreeEvent<PointerEvent>, item: Item) => {
      if (!enabled) return
      e.stopPropagation()
      const st = useStore.getState()

      // shift-click toggles the item in/out of the multi-selection (no drag)
      if (e.nativeEvent.shiftKey) {
        st.toggleItem(item.id)
        return
      }

      const inMulti = st.selectedItemIds.length > 1 && st.selectedItemIds.includes(item.id)
      if (!inMulti) st.select({ type: 'item', id: item.id })

      const p = intersectGround(e.nativeEvent.clientX, e.nativeEvent.clientY)
      if (!p) return
      if (orbitRef.current) orbitRef.current.enabled = false

      if (gizmoMode === 'rotate' && !inMulti) {
        rotRef.current = {
          id: item.id,
          startAngle: Math.atan2(p.z - item.position.z, p.x - item.position.x),
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
    },
    [enabled, gizmoMode, intersectGround, orbitRef],
  )

  return (
    <group>
      {items.map((item) => (
        <ItemView
          key={item.id}
          item={item}
          selected={selectedItemIds.includes(item.id)}
          onDown={onItemDown}
        />
      ))}
    </group>
  )
}

// Memoized per item: only the item whose data actually changed (immer preserves
// unchanged item refs) re-renders during a drag, instead of the whole scene.
const ItemView = memo(function ItemView({
  item,
  selected,
  onDown,
}: {
  item: Item
  selected: boolean
  onDown: (e: ThreeEvent<PointerEvent>, item: Item) => void
}) {
  return (
    <group
      position={[item.position.x, item.y, item.position.z]}
      rotation={[0, item.rotationY, 0]}
      scale={item.scale}
      onPointerDown={(e) => onDown(e, item)}
    >
      <FurnitureModel item={item} />
      {selected && <SelectionRing />}
    </group>
  )
})

function SelectionRing() {
  const r = 0.6
  return (
    <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[r, r + 0.05, 40]} />
      <meshBasicMaterial color="#4f8cff" transparent opacity={0.9} />
    </mesh>
  )
}
