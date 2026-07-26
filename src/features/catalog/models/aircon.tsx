import type { Material } from '../../../types/project'
import { Mat } from './shared'

// Aircon hardware. Both models face +z like every other wall-hugging piece, so
// wall snapping points a fan coil into the room and a condenser's fan away from
// the flat.

/**
 * Indoor wall-mounted fan coil: a rounded case with the discharge louvre along
 * the bottom front edge, angled down the way a running unit sits.
 */
export function FanCoil({
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
      {/* case */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Mat material={m} />
      </mesh>
      {/* intake grille across the top */}
      <mesh position={[0, h - 0.012, d * 0.1]}>
        <boxGeometry args={[w * 0.9, 0.008, d * 0.62]} />
        <meshStandardMaterial color="#c9cdd2" roughness={0.7} />
      </mesh>
      {/* discharge louvre, tilted down at the bottom front */}
      <mesh position={[0, h * 0.14, d / 2 - 0.01]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[w * 0.86, 0.05, 0.012]} />
        <meshStandardMaterial color="#e6e8ea" roughness={0.5} />
      </mesh>
      {/* dark discharge throat behind the louvre */}
      <mesh position={[0, h * 0.13, d / 2 - 0.035]}>
        <boxGeometry args={[w * 0.86, 0.055, 0.02]} />
        <meshStandardMaterial color="#2a2d32" roughness={0.9} />
      </mesh>
      {/* display strip */}
      <mesh position={[w * 0.34, h * 0.36, d / 2 + 0.002]}>
        <boxGeometry args={[w * 0.14, 0.02, 0.004]} />
        <meshStandardMaterial color="#3b4048" roughness={0.4} />
      </mesh>
    </group>
  )
}

/**
 * Outdoor condenser: a boxy case with the fan grille on the front face and
 * louvred coil fins down the sides, standing on two feet.
 */
export function Condenser({
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
  const footH = 0.05
  const bodyH = h - footH
  const fanR = Math.min(w * 0.32, bodyH * 0.34)
  // Tall System 3/4 boxes stack two fans; the short System 2 case has one.
  const fans = bodyH > 0.65 ? 2 : 1
  const metal = { color: '#9aa0a7', metalness: 0.6, roughness: 0.4 }
  return (
    <group>
      {/* feet */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * w) / 3, footH / 2, 0]} castShadow>
          <boxGeometry args={[w / 5, footH, d * 0.9]} />
          <meshStandardMaterial color="#4d5259" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {/* case */}
      <mesh position={[0, footH + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bodyH, d]} />
        <Mat material={m} />
      </mesh>
      {/* side coil fins */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (w + 0.004)) / 2, footH + bodyH / 2, 0]}>
          <boxGeometry args={[0.006, bodyH * 0.86, d * 0.88]} />
          <meshStandardMaterial color="#8d949c" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {Array.from({ length: fans }).map((_, i) => {
        const cy = footH + (bodyH * (i + 0.5)) / fans
        return (
          <group key={i} position={[0, cy, d / 2 + 0.004]}>
            {/* recessed fan opening */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[fanR, fanR, 0.01, 24]} />
              <meshStandardMaterial color="#2b2e33" roughness={0.9} />
            </mesh>
            {/* guard ring + spokes */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.008]}>
              <torusGeometry args={[fanR, 0.008, 6, 24]} />
              <meshStandardMaterial {...metal} />
            </mesh>
            {[0, 1, 2].map((k) => (
              <mesh key={k} position={[0, 0, 0.008]} rotation={[0, 0, (k * Math.PI) / 3]}>
                <boxGeometry args={[fanR * 2, 0.008, 0.008]} />
                <meshStandardMaterial {...metal} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}
