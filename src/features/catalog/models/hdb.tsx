import type { Material } from '../../../types/project'
import { Mat } from './shared'

// HDB household shelter (bomb shelter): a full-height reinforced box with a
// heavy steel door and a ventilation panel.
export function Shelter({
  w,
  d,
  h,
  m,
}: {
  w: number
  d: number
  h: number
  m: Material
}) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Mat material={m} repeat={[2, 2]} />
      </mesh>
      {/* steel door */}
      <mesh position={[0, h * 0.5, d / 2 + 0.02]} castShadow>
        <boxGeometry args={[w * 0.55, h * 0.82, 0.06]} />
        <meshStandardMaterial color="#5b6068" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* handle wheel */}
      <mesh position={[w * 0.12, h * 0.5, d / 2 + 0.07]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.09, 0.02, 8, 20]} />
        <meshStandardMaterial color="#3a3f47" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* vent slots near the top */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, h * 0.86 + i * 0.05, d / 2 + 0.03]}>
          <boxGeometry args={[w * 0.4, 0.02, 0.02]} />
          <meshStandardMaterial color="#2b2f35" />
        </mesh>
      ))}
    </group>
  )
}

// HDB metal gate: a framed grille of vertical bars, placed in a doorway.
export function Gate({ w, h, m }: { w: number; h: number; m: Material }) {
  const bars = Math.max(4, Math.round(w / 0.12))
  const metal = { color: m.color, metalness: 0.7, roughness: 0.35 }
  return (
    <group>
      {/* frame */}
      {[
        [0, h, w, 0.05],
        [0, 0.03, w, 0.05],
        [-w / 2, h / 2, 0.05, h],
        [w / 2, h / 2, 0.05, h],
      ].map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, 0]} castShadow>
          <boxGeometry args={[bw, bh, 0.05]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
      {/* vertical bars */}
      {Array.from({ length: bars }).map((_, i) => {
        const x = -w / 2 + (w * (i + 0.5)) / bars
        return (
          <mesh key={i} position={[x, h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, h, 8]} />
            <meshStandardMaterial {...metal} />
          </mesh>
        )
      })}
      {/* mid rail */}
      <mesh position={[0, h * 0.45, 0]} castShadow>
        <boxGeometry args={[w, 0.04, 0.04]} />
        <meshStandardMaterial {...metal} />
      </mesh>
    </group>
  )
}
