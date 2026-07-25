import type { Material } from '../../../types/project'
import { SurfaceMaterial } from '../../materials/SurfaceMaterial'
import { Mat } from './shared'

export function Appliance({
  w,
  d,
  h,
  roundDoor = false,
  m,
}: {
  w: number
  d: number
  h: number
  roundDoor?: boolean
  m: Material
}) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Mat material={m} />
      </mesh>
      {/* front panel */}
      <mesh position={[0, h / 2, d / 2 + 0.005]}>
        <boxGeometry args={[w - 0.04, h - 0.06, 0.02]} />
        <meshStandardMaterial color="#2c2f34" roughness={0.35} metalness={0.4} />
      </mesh>
      {roundDoor ? (
        <mesh position={[0, h / 2, d / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[Math.min(w, h) * 0.32, Math.min(w, h) * 0.32, 0.02, 24]}
          />
          <meshStandardMaterial color="#11141a" roughness={0.2} metalness={0.3} />
        </mesh>
      ) : (
        <mesh position={[w / 2 - 0.06, h * 0.78, d / 2 + 0.03]} castShadow>
          <boxGeometry args={[0.03, 0.14, 0.03]} />
          <meshStandardMaterial color="#d5d7da" metalness={0.7} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}


export function Hood({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
  return (
    <group>
      {/* canopy */}
      <mesh position={[0, h * 0.2, 0]} castShadow>
        <boxGeometry args={[w, h * 0.4, d]} />
        <Mat material={m} />
      </mesh>
      {/* chimney */}
      <mesh position={[0, h * 0.7, -d * 0.1]} castShadow>
        <boxGeometry args={[w * 0.3, h * 0.6, d * 0.4]} />
        <Mat material={m} />
      </mesh>
    </group>
  )
}


export function Sink({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
  const counterH = 0.05
  const cabH = h - counterH
  return (
    <group>
      {/* cabinet */}
      <mesh position={[0, cabH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, cabH, d]} />
        <Mat material={m} />
      </mesh>
      {/* counter */}
      <mesh position={[0, cabH + counterH / 2, 0]} castShadow>
        <boxGeometry args={[w + 0.02, counterH, d + 0.02]} />
        <meshStandardMaterial color="#efeeea" roughness={0.25} metalness={0.05} />
      </mesh>
      {/* basin */}
      <mesh position={[0, cabH + counterH, 0]}>
        <cylinderGeometry args={[Math.min(w, d) * 0.3, Math.min(w, d) * 0.24, 0.02, 20]} />
        <meshStandardMaterial color="#dfe0dd" roughness={0.2} metalness={0.1} />
      </mesh>
      {/* faucet */}
      <mesh position={[0, cabH + counterH + 0.12, -d * 0.28]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.24, 8]} />
        <meshStandardMaterial color="#c8ccd0" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}


export function Toilet({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
  const bowlH = h * 0.5
  return (
    <group>
      {/* pedestal / bowl */}
      <mesh position={[0, bowlH / 2, d * 0.12]} castShadow>
        <cylinderGeometry args={[w * 0.42, w * 0.32, bowlH, 20]} />
        <Mat material={m} />
      </mesh>
      {/* seat */}
      <mesh position={[0, bowlH + 0.02, d * 0.12]} castShadow>
        <cylinderGeometry args={[w * 0.46, w * 0.46, 0.05, 20]} />
        <Mat material={m} />
      </mesh>
      {/* cistern */}
      <mesh position={[0, h * 0.75, -d / 2 + 0.1]} castShadow>
        <boxGeometry args={[w, h * 0.5, 0.18]} />
        <Mat material={m} />
      </mesh>
    </group>
  )
}


export function Bathtub({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Mat material={m} />
      </mesh>
      {/* inner recess */}
      <mesh position={[0, h - 0.06, 0]}>
        <boxGeometry args={[w - 0.16, 0.12, d - 0.16]} />
        <meshStandardMaterial color="#eef1f2" roughness={0.2} />
      </mesh>
    </group>
  )
}


export function Shower({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
  const glass = (
    <meshStandardMaterial
      color="#cfe0e6"
      transparent
      opacity={0.22}
      roughness={0.05}
      metalness={0.1}
    />
  )
  return (
    <group>
      {/* tray */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.08, d]} />
        <Mat material={m} />
      </mesh>
      {/* back + side wall (tiled) */}
      <mesh position={[0, h / 2, -d / 2 + 0.02]}>
        <boxGeometry args={[w, h, 0.04]} />
        <SurfaceMaterial material={{ color: '#e6e8ea', roughness: 0.4, metalness: 0, texture: 'tile' }} repeat={[3, 6]} />
      </mesh>
      <mesh position={[-w / 2 + 0.02, h / 2, 0]}>
        <boxGeometry args={[0.04, h, d]} />
        <SurfaceMaterial material={{ color: '#e6e8ea', roughness: 0.4, metalness: 0, texture: 'tile' }} repeat={[3, 6]} />
      </mesh>
      {/* glass front + side */}
      <mesh position={[0, h / 2, d / 2 - 0.02]}>
        <boxGeometry args={[w, h, 0.02]} />
        {glass}
      </mesh>
      <mesh position={[w / 2 - 0.02, h / 2, 0]}>
        <boxGeometry args={[0.02, h, d]} />
        {glass}
      </mesh>
      {/* shower head */}
      <mesh position={[0, h - 0.15, -d / 2 + 0.12]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
        <meshStandardMaterial color="#c8ccd0" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}


export function Toiletries({ m }: { m: Material }) {
  const bottles: { x: number; h: number; r: number; c: string }[] = [
    { x: -0.09, h: 0.2, r: 0.03, c: '#8fbfc8' },
    { x: -0.02, h: 0.16, r: 0.028, c: '#e8a0a0' },
    { x: 0.05, h: 0.12, r: 0.025, c: '#f2e2b0' },
    { x: 0.11, h: 0.09, r: 0.022, c: '#b8d8b0' },
  ]
  return (
    <group>
      {/* tray */}
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.03, 0.14]} />
        <Mat material={m} />
      </mesh>
      {bottles.map((b, i) => (
        <mesh key={i} position={[b.x, 0.03 + b.h / 2, 0]} castShadow>
          <cylinderGeometry args={[b.r, b.r, b.h, 12]} />
          <meshStandardMaterial color={b.c} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

