import { memo } from 'react'
import type { AirconPlan, TrunkingRun, Vec2 } from '../../types/project'
import { dist } from '../../geometry/vec'

// The trunking casing, drawn as a chain of boxes along each run's plan polyline
// with a filled cube at every corner so the elbows don't show a notch. This is
// the whole point of the aircon feature: the casing is real, visible, 100mm of
// plastic on your wall, and this is where you find out it crosses the middle of
// the living room.

const CASING_COLOR = '#e9eaec'
const DROP_COLOR = '#dfe1e4'

export function TrunkingGroup({ plan }: { plan: AirconPlan | undefined }) {
  if (!plan?.runs.length) return null
  return (
    <group>
      {plan.runs.map((run) => (
        <Run key={run.id} run={run} w={plan.trunkingW} h={plan.trunkingH} />
      ))}
    </group>
  )
}

const Run = memo(function Run({
  run,
  w,
  h,
}: {
  run: TrunkingRun
  w: number
  h: number
}) {
  const segs: { mid: Vec2; len: number; angle: number }[] = []
  for (let i = 1; i < run.points.length; i++) {
    const a = run.points[i - 1]
    const b = run.points[i]
    const len = dist(a, b)
    if (len < 1e-4) continue
    segs.push({
      mid: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
      len,
      // A box's local +x runs along the segment once rotated by this much about Y.
      angle: Math.atan2(-(b.z - a.z), b.x - a.x),
    })
  }
  const corners = run.points.slice(1, -1)

  return (
    <group>
      {segs.map((s, i) => (
        <mesh
          key={i}
          position={[s.mid.x, run.y, s.mid.z]}
          rotation={[0, s.angle, 0]}
          castShadow
        >
          <boxGeometry args={[s.len, h, w]} />
          <meshStandardMaterial color={CASING_COLOR} roughness={0.6} />
        </mesh>
      ))}
      {corners.map((c, i) => (
        <mesh key={`c${i}`} position={[c.x, run.y, c.z]} castShadow>
          <boxGeometry args={[w, h, w]} />
          <meshStandardMaterial color={CASING_COLOR} roughness={0.6} />
        </mesh>
      ))}
      {/* short drop at each end, down to the unit the run connects to */}
      {[run.points[0], run.points[run.points.length - 1]].map((p, i) => (
        <mesh key={`d${i}`} position={[p.x, run.y - 0.12, p.z]}>
          <boxGeometry args={[w * 0.8, 0.24, w * 0.8]} />
          <meshStandardMaterial color={DROP_COLOR} roughness={0.65} />
        </mesh>
      ))}
    </group>
  )
})
