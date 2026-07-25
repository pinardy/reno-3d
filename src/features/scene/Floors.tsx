import { memo, useMemo } from 'react'
import { useStore } from '../../store/store'
import type { Room } from '../../types/project'
import { buildFloorGeometry } from '../../geometry/floor'
import { SurfaceMaterial } from '../materials/SurfaceMaterial'

export const RoomFloor = memo(function RoomFloor({
  room,
  ceiling,
}: {
  room: Room
  ceiling: boolean // force-show ceiling regardless of the room's own flag
}) {
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  const wallHeight = useStore((s) => s.project.wallHeight)
  const floorGeom = useMemo(() => buildFloorGeometry(room.loop, 0.01, true), [room.loop])
  const ceilGeom = useMemo(
    () => buildFloorGeometry(room.loop, wallHeight, false),
    [room.loop, wallHeight],
  )
  const sel = selection.type === 'room' && selection.id === room.id
  const showCeiling = ceiling || room.showCeiling
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
      {showCeiling && (
        <mesh geometry={ceilGeom} receiveShadow>
          <SurfaceMaterial material={room.ceilingMaterial} />
        </mesh>
      )}
    </group>
  )
})
