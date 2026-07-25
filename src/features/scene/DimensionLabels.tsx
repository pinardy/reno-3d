import { Html } from '@react-three/drei'
import { useStore } from '../../store/store'
import { dist, polygonCentroid } from '../../geometry/vec'
import { roomBBoxSize } from '../trace/rooms'

const pill: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: 5,
  fontSize: 11,
  fontFamily: 'system-ui, sans-serif',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
  transform: 'translate(-50%, -50%)',
}

// Floating measurement labels: each wall's length and each room's size/area.
export function DimensionLabels() {
  const walls = useStore((s) => s.project.walls)
  const rooms = useStore((s) => s.project.rooms)

  return (
    <group>
      {walls.map((w) => {
        const mx = (w.a.x + w.b.x) / 2
        const mz = (w.a.z + w.b.z) / 2
        const L = dist(w.a, w.b)
        return (
          <Html key={w.id} position={[mx, 0.25, mz]} zIndexRange={[10, 0]} occlude={false}>
            <div
              style={{
                ...pill,
                background: 'rgba(24,27,33,0.85)',
                color: '#dfe4ec',
                border: '1px solid rgba(120,130,150,0.4)',
              }}
            >
              {L.toFixed(2)} m
            </div>
          </Html>
        )
      })}

      {rooms.map((r) => {
        const c = polygonCentroid(r.loop)
        const { w, d, area } = roomBBoxSize(r.loop)
        return (
          <Html key={r.id} position={[c.x, 0.05, c.z]} zIndexRange={[9, 0]} occlude={false}>
            <div
              style={{
                ...pill,
                background: 'rgba(79,140,255,0.9)',
                color: '#fff',
                textAlign: 'center',
                lineHeight: 1.3,
              }}
            >
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 10, opacity: 0.9 }}>
                {w.toFixed(2)} × {d.toFixed(2)} m · {area.toFixed(1)} m²
              </div>
            </div>
          </Html>
        )
      })}
    </group>
  )
}
