import { memo, useMemo } from 'react'
import { useStore } from '../../store/store'
import type { Wall } from '../../types/project'
import { buildWallPieces } from '../../geometry/walls'
import { SurfaceMaterial } from '../materials/SurfaceMaterial'
import { DOLLHOUSE_H } from './constants'
import { isPanModifierHeld } from './panModifier'

// Memoized so an unrelated store change (e.g. dragging furniture) doesn't
// re-render the walls. It still re-renders when walls/openings/selection change
// via its own store subscriptions.
export const WallsGroup = memo(function WallsGroup({
  walls,
  dollhouse,
}: {
  walls: Wall[]
  dollhouse: boolean
}) {
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
              if (isPanModifierHeld()) return // space-drag is a camera pan, not a pick
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
})

// Vertical posts at each wall endpoint fill the gaps/seams where wall boxes meet.
export const CornerPosts = memo(function CornerPosts({
  walls,
  dollhouse,
}: {
  walls: Wall[]
  dollhouse: boolean
}) {
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
})
