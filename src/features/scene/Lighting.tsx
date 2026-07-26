import { memo } from 'react'
import { Sky } from '@react-three/drei'
import { useStore } from '../../store/store'
import { polygonCentroid } from '../../geometry/vec'
import { roomBBoxSize } from '../trace/rooms'
import { useIsSmallScreen } from '../../lib/device'

// Sky + sun driven by a time-of-day value (0..1, 0.5 = midday), plus per-room
// ceiling lights that brighten as it gets dark.
export const Lighting = memo(function Lighting({ timeOfDay }: { timeOfDay: number }) {
  const rooms = useStore((s) => s.project.rooms)
  const wallHeight = useStore((s) => s.project.wallHeight)
  const orientation = useStore((s) => s.project.orientationDeg ?? 0)
  const small = useIsSmallScreen()

  const elevation = Math.cos((timeOfDay - 0.5) * Math.PI * 1.15)
  const daylight = Math.max(0, elevation) // 0 at night, 1 at noon
  // sun compass bearing: sunrise East(90°) -> noon South(180°) -> sunset West(270°),
  // mapped into world space given the plan's orientation (screen-up = -z = North).
  const bearing = 90 + (timeOfDay - 0.25) * 360
  const a = ((bearing - orientation) * Math.PI) / 180
  const sunX = Math.sin(a) * 12
  const sunZ = -Math.cos(a) * 12
  const sunY = elevation * 14
  const sunColor = mixHex('#ffcf99', '#fff6ea', daylight) // warm when low in the sky
  const artificial = 1 - Math.min(1, daylight * 1.4) // how strongly room lights are needed

  return (
    <>
      <Sky
        sunPosition={[sunX, sunY, sunZ]}
        turbidity={8}
        rayleigh={daylight < 0.35 ? 3 : 1.2}
        mieCoefficient={0.006}
      />
      <hemisphereLight args={['#dfe7f2', '#6a6152', 0.12 + daylight * 0.6]} />
      <ambientLight intensity={0.1 + daylight * 0.3} />
      <directionalLight
        position={[sunX, Math.max(1, sunY), sunZ]}
        intensity={0.15 + daylight * 2.3}
        color={sunColor}
        castShadow
        // a 2048² sun shadow map is a heavy allocation on a phone GPU
        shadow-mapSize={small ? [1024, 1024] : [2048, 2048]}
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
})

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
