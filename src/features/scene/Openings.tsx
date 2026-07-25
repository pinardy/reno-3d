import { memo } from 'react'
import type { Wall, Opening } from '../../types/project'
import { dist } from '../../geometry/vec'

// Renders frames, glass panes and swinging door leaves inside each wall opening.
// Everything is authored in the wall's local frame: local x runs along the wall,
// y is up, z is the wall thickness direction.

const FRAME = { color: '#eceae4', roughness: 0.55, metalness: 0.1 }
const WOOD = { color: '#6f4c30', roughness: 0.5, metalness: 0 }
const BAR = 0.06

export const OpeningsGroup = memo(function OpeningsGroup({
  walls,
  openings,
  dollhouse,
}: {
  walls: Wall[]
  openings: Opening[]
  dollhouse: boolean
}) {
  if (dollhouse) return null
  return (
    <group>
      {openings.map((op) => {
        const wall = walls.find((w) => w.id === op.wallId)
        if (!wall) return null
        const L = dist(wall.a, wall.b)
        if (L < 1e-4) return null
        const dirx = (wall.b.x - wall.a.x) / L
        const dirz = (wall.b.z - wall.a.z) / L
        const angle = Math.atan2(dirz, dirx)
        const cx = wall.a.x + dirx * op.offset
        const cz = wall.a.z + dirz * op.offset
        return (
          <group key={op.id} position={[cx, 0, cz]} rotation={[0, -angle, 0]}>
            {op.type === 'window' ? (
              <Window w={op.width} h={op.height} sill={op.sillHeight} t={wall.thickness} />
            ) : op.type === 'cased' ? (
              <CasedOpening w={op.width} h={op.height} t={wall.thickness} />
            ) : op.type === 'sliding' ? (
              <SlidingDoor w={op.width} h={op.height} t={wall.thickness} />
            ) : (
              <Door w={op.width} h={op.height} t={wall.thickness} hinge={op.hinge ?? 'left'} />
            )}
          </group>
        )
      })}
    </group>
  )
})

function Window({ w, h, sill, t }: { w: number; h: number; sill: number; t: number }) {
  const yC = sill + h / 2
  const fd = t * 1.05
  return (
    <group>
      {/* frame */}
      <mesh position={[0, sill, 0]} castShadow>
        <boxGeometry args={[w, BAR, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[0, sill + h, 0]} castShadow>
        <boxGeometry args={[w, BAR, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[-w / 2, yC, 0]} castShadow>
        <boxGeometry args={[BAR, h, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[w / 2, yC, 0]} castShadow>
        <boxGeometry args={[BAR, h, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      {/* mullion */}
      <mesh position={[0, yC, 0]}>
        <boxGeometry args={[0.04, h, fd * 0.7]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      {/* glass */}
      <mesh position={[0, yC, 0]}>
        <boxGeometry args={[w - BAR, h - BAR, 0.02]} />
        <meshStandardMaterial
          color="#bcd6e6"
          transparent
          opacity={0.28}
          roughness={0.05}
          metalness={0.1}
        />
      </mesh>
    </group>
  )
}

// A cased opening: just the frame, no leaf (open-concept doorway).
function CasedOpening({ w, h, t }: { w: number; h: number; t: number }) {
  const fd = t * 1.05
  return (
    <group>
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w, BAR, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[BAR, h, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[BAR, h, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
    </group>
  )
}

// A sliding door: two overlapping panels on a track (e.g. to a balcony/yard).
function SlidingDoor({ w, h, t }: { w: number; h: number; t: number }) {
  const fd = t * 1.05
  const panelW = w / 2
  return (
    <group>
      {/* frame */}
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w, BAR, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[BAR, h, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[BAR, h, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      {/* two glass panels, slightly overlapping and offset in depth */}
      {[
        [-panelW / 2 + 0.02, -0.015],
        [panelW / 2 - 0.02, 0.015],
      ].map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, h / 2, z]}>
            <boxGeometry args={[panelW, h - 0.04, 0.02]} />
            <meshStandardMaterial color="#bcd6e6" transparent opacity={0.28} roughness={0.05} />
          </mesh>
          {/* panel frame edges */}
          <mesh position={[x, h / 2, z]} castShadow>
            <boxGeometry args={[panelW, 0.04, 0.03]} />
            <meshStandardMaterial color="#9aa0a8" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Door({
  w,
  h,
  t,
  hinge = 'left',
}: {
  w: number
  h: number
  t: number
  hinge?: 'left' | 'right'
}) {
  const fd = t * 1.05
  const leafW = w - BAR
  const s = hinge === 'left' ? 1 : -1 // mirror the leaf for a right-hand hinge
  return (
    <group>
      {/* frame (top + jambs, no sill) */}
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w, BAR, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[BAR, h, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[BAR, h, fd]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      {/* leaf, hinged on the chosen side and swung ajar */}
      <group position={[s * (-w / 2 + 0.02), 0, 0]} rotation={[0, s * -0.55, 0]}>
        <mesh position={[s * (leafW / 2), (h - 0.06) / 2, 0]} castShadow>
          <boxGeometry args={[leafW, h - 0.06, 0.045]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
        {/* handle */}
        <mesh position={[s * (leafW - 0.08), h * 0.5, 0.04]} castShadow>
          <boxGeometry args={[0.04, 0.12, 0.03]} />
          <meshStandardMaterial color="#c8ccd0" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
    </group>
  )
}
