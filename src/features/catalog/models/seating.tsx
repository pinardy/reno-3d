import type { Material } from '../../../types/project'
import { SurfaceMaterial } from '../../materials/SurfaceMaterial'
import { Mat } from './shared'

export function Sofa({
  w,
  d,
  h,
  chaise = false,
  m,
}: {
  w: number
  d: number
  h: number
  chaise?: boolean
  m: Material
}) {
  const seatH = h * 0.45
  const armW = 0.16
  const bodyD = chaise ? d * 0.62 : d
  return (
    <group>
      {/* seat base */}
      <mesh position={[0, seatH / 2, -(d - bodyD) / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, seatH, bodyD]} />
        <Mat material={m} repeat={[2, 1]} />
      </mesh>
      {/* backrest */}
      <mesh position={[0, seatH + (h - seatH) / 2, -d / 2 + 0.12]} castShadow>
        <boxGeometry args={[w, h - seatH, 0.22]} />
        <Mat material={m} repeat={[2, 1]} />
      </mesh>
      {/* arms */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[(s * (w - armW)) / 2, h * 0.35, -(d - bodyD) / 2 + 0.02]}
          castShadow
        >
          <boxGeometry args={[armW, h * 0.65, bodyD - 0.1]} />
          <Mat material={m} />
        </mesh>
      ))}
      {/* seat cushions */}
      <mesh position={[0, seatH + 0.06, -(d - bodyD) / 2 + 0.05]} castShadow>
        <boxGeometry args={[w - armW * 2 - 0.04, 0.12, bodyD - 0.24]} />
        <Mat material={m} />
      </mesh>
      {/* chaise extension (L-shape) on the right, extending forward */}
      {chaise && (
        <mesh position={[(w - w * 0.42) / 2, seatH / 2, (bodyD) / 2]} castShadow receiveShadow>
          <boxGeometry args={[w * 0.42, seatH, d - bodyD]} />
          <Mat material={m} repeat={[1, 1]} />
        </mesh>
      )}
    </group>
  )
}


export function Chair({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
  const seatH = 0.46
  const legR = 0.02
  return (
    <group>
      <mesh position={[0, seatH, 0]} castShadow>
        <boxGeometry args={[w, 0.06, d]} />
        <Mat material={m} />
      </mesh>
      <mesh position={[0, seatH + (h - seatH) / 2, -d / 2 + 0.03]} castShadow>
        <boxGeometry args={[w, h - seatH, 0.05]} />
        <Mat material={m} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx * (w / 2 - 0.04), seatH / 2, sz * (d / 2 - 0.04)]}
          castShadow
        >
          <cylinderGeometry args={[legR, legR, seatH, 6]} />
          <Mat material={m} />
        </mesh>
      ))}
    </group>
  )
}


export function Stool({ w, h, m }: { w: number; h: number; m: Material }) {
  const seatH = 0.05
  const r = w / 2
  return (
    <group>
      <mesh position={[0, h - seatH / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, seatH, 20]} />
        <Mat material={m} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * (r - 0.05), (h - seatH) / 2, Math.sin(a) * (r - 0.05)]}
            castShadow
          >
            <cylinderGeometry args={[0.018, 0.018, h - seatH, 6]} />
            <meshStandardMaterial color="#3a3a3d" metalness={0.5} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}


export function Bed({ w, d, m }: { w: number; d: number; m: Material }) {
  const frameH = 0.3
  const mattH = 0.22
  const wood: Material = { color: '#6b4a30', roughness: 0.5, metalness: 0, texture: 'wood' }
  return (
    <group>
      {/* frame */}
      <mesh position={[0, frameH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.1, frameH, d + 0.1]} />
        <Mat material={wood} />
      </mesh>
      {/* mattress */}
      <mesh position={[0, frameH + mattH / 2, 0.03]} castShadow>
        <boxGeometry args={[w, mattH, d - 0.1]} />
        <SurfaceMaterial material={{ ...m, color: '#f2efe9' }} />
      </mesh>
      {/* duvet */}
      <mesh position={[0, frameH + mattH + 0.03, 0.12]} castShadow>
        <boxGeometry args={[w, 0.06, d * 0.62]} />
        <Mat material={m} repeat={[2, 2]} />
      </mesh>
      {/* pillows */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[(s * w) / 4, frameH + mattH + 0.06, -d / 2 + 0.28]}
          castShadow
        >
          <boxGeometry args={[w * 0.42, 0.1, 0.32]} />
          <SurfaceMaterial material={{ ...m, color: '#ffffff' }} />
        </mesh>
      ))}
      {/* headboard */}
      <mesh position={[0, 0.55, -d / 2 - 0.02]} castShadow>
        <boxGeometry args={[w + 0.1, 1.1, 0.08]} />
        <Mat material={wood} />
      </mesh>
    </group>
  )
}


export function Table({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
  const legR = 0.03
  const topH = 0.05
  const inset = 0.08
  return (
    <group>
      <mesh position={[0, h - topH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, topH, d]} />
        <Mat material={m} repeat={[2, 1]} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[(sx * (w / 2 - inset)), (h - topH) / 2, sz * (d / 2 - inset)]}
          castShadow
        >
          <cylinderGeometry args={[legR, legR, h - topH, 8]} />
          <Mat material={m} />
        </mesh>
      ))}
    </group>
  )
}

