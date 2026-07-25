import { useGLTF } from '@react-three/drei'
import type { Material } from '../../../types/project'
import { SurfaceMaterial } from '../../materials/SurfaceMaterial'
import { Mat, matProps } from './shared'

export function Lamp({ h, m }: { h: number; m: Material }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.04, 20]} />
        <meshStandardMaterial color="#3a3a3d" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, h, 8]} />
        <meshStandardMaterial color="#3a3a3d" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, h - 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.24, 20, 1, true]} />
        <SurfaceMaterial material={m} side={2} />
      </mesh>
      <pointLight position={[0, h - 0.15, 0]} intensity={6} distance={4} decay={2} color="#ffe9c7" />
    </group>
  )
}


export function Plant({ h, tall = false, m }: { h: number; tall?: boolean; m: Material }) {
  const potH = Math.min(0.35, h * 0.3)
  return (
    <group>
      {/* pot */}
      <mesh position={[0, potH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, potH, 16]} />
        <meshStandardMaterial color="#b5651d" roughness={0.8} />
      </mesh>
      {tall ? (
        <group>
          {/* slender trunk + leafy crown */}
          <mesh position={[0, h * 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, h * 0.6, 8]} />
            <meshStandardMaterial color="#6b4a2f" roughness={0.8} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.18, h - 0.2, Math.sin(a) * 0.18]}
                rotation={[0.5, a, 0]}
                castShadow
              >
                <coneGeometry args={[0.09, 0.5, 6]} />
                <Mat material={m} />
              </mesh>
            )
          })}
        </group>
      ) : (
        <group>
          <mesh position={[0, potH + (h - potH) * 0.55, 0]} castShadow>
            <sphereGeometry args={[Math.min(0.35, h * 0.34), 12, 10]} />
            <Mat material={m} />
          </mesh>
          <mesh position={[0.1, potH + (h - potH) * 0.75, 0.05]} castShadow>
            <sphereGeometry args={[Math.min(0.22, h * 0.22), 10, 8]} />
            <Mat material={m} />
          </mesh>
        </group>
      )}
    </group>
  )
}


export function Piano({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
  const kbH = h * 0.52
  return (
    <group>
      {/* body */}
      <mesh position={[0, h / 2, -d * 0.15]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d * 0.7]} />
        <Mat material={m} />
      </mesh>
      {/* keyboard shelf */}
      <mesh position={[0, kbH, d * 0.25]} castShadow>
        <boxGeometry args={[w * 0.94, 0.1, d * 0.4]} />
        <Mat material={m} />
      </mesh>
      {/* white keys */}
      <mesh position={[0, kbH + 0.06, d * 0.33]} castShadow>
        <boxGeometry args={[w * 0.9, 0.03, 0.16]} />
        <meshStandardMaterial color="#f7f6f2" roughness={0.4} />
      </mesh>
      {/* black keys hint */}
      <mesh position={[0, kbH + 0.08, d * 0.29]}>
        <boxGeometry args={[w * 0.9, 0.03, 0.08]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.5} />
      </mesh>
      {/* lid line */}
      <mesh position={[0, h * 0.82, d * 0.1]}>
        <boxGeometry args={[w, 0.02, d * 0.05]} />
        <meshStandardMaterial color="#000" roughness={0.4} />
      </mesh>
      {/* feet */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * w) / 2.4, 0.06, 0]} castShadow>
          <boxGeometry args={[0.1, 0.12, d * 0.6]} />
          <Mat material={m} />
        </mesh>
      ))}
    </group>
  )
}


export function Vase({ w, h, flowers = false, m }: { w: number; h: number; flowers?: boolean; m: Material }) {
  const r = w / 2
  return (
    <group>
      {/* body: bulged bottom + narrow neck */}
      <mesh position={[0, h * 0.35, 0]} castShadow>
        <sphereGeometry args={[r, 16, 12]} />
        <Mat material={m} />
      </mesh>
      <mesh position={[0, h * 0.72, 0]} castShadow>
        <cylinderGeometry args={[r * 0.55, r * 0.7, h * 0.5, 16]} />
        <Mat material={m} />
      </mesh>
      {flowers && (
        <group position={[0, h, 0]}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2
            return (
              <group key={i}>
                <mesh
                  position={[Math.cos(a) * 0.06, 0.12, Math.sin(a) * 0.06]}
                  rotation={[0, 0, Math.cos(a) * 0.4]}
                >
                  <cylinderGeometry args={[0.006, 0.006, 0.28, 5]} />
                  <meshStandardMaterial color="#3f7d4f" roughness={0.8} />
                </mesh>
                <mesh position={[Math.cos(a) * 0.12, 0.26, Math.sin(a) * 0.12]} castShadow>
                  <sphereGeometry args={[0.05, 8, 6]} />
                  <meshStandardMaterial
                    color={['#e57373', '#f6bd60', '#d98cb3', '#f7ede2', '#b5838d'][i]}
                    roughness={0.7}
                  />
                </mesh>
              </group>
            )
          })}
        </group>
      )}
    </group>
  )
}


export function Picture({
  w,
  h,
  round = false,
  mirror = false,
  m,
}: {
  w: number
  h: number
  round?: boolean
  mirror?: boolean
  m: Material
}) {
  const frameMat: Material = mirror
    ? { color: '#c9ccd2', roughness: 0.3, metalness: 0.6 }
    : { color: '#3a2e22', roughness: 0.5, metalness: 0 }
  // built standing upright, facing +z, bottom at y=0
  return (
    <group position={[0, h / 2, 0]}>
      {round ? (
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[w / 2, w / 2, 0.04, 32]} />
          <meshStandardMaterial {...matProps(frameMat)} />
        </mesh>
      ) : (
        <mesh castShadow>
          <boxGeometry args={[w, h, 0.04]} />
          <meshStandardMaterial {...matProps(frameMat)} />
        </mesh>
      )}
      {/* face (planeGeometry / circleGeometry face +z by default) */}
      <mesh position={[0, 0, 0.025]}>
        {round ? (
          <circleGeometry args={[w / 2 - 0.03, 32]} />
        ) : (
          <planeGeometry args={[w - 0.06, h - 0.06]} />
        )}
        <meshStandardMaterial
          color={m.color}
          roughness={mirror ? 0.05 : 0.6}
          metalness={mirror ? 0.95 : 0}
        />
      </mesh>
    </group>
  )
}


export function Pendant({ m }: { m: Material }) {
  return (
    <group>
      {/* cord */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.4, 6]} />
        <meshStandardMaterial color="#2b2b2f" />
      </mesh>
      {/* shade */}
      <mesh position={[0, -0.08, 0]} castShadow>
        <coneGeometry args={[0.18, 0.2, 20, 1, true]} />
        <SurfaceMaterial material={m} side={2} />
      </mesh>
      <pointLight position={[0, -0.12, 0]} intensity={8} distance={6} decay={2} color="#ffe6bf" />
    </group>
  )
}


export function TV({ w, h, m }: { w: number; h: number; m: Material }) {
  const screenH = h * 0.62
  const standH = 0.05
  const centreY = h - screenH / 2
  return (
    <group>
      {/* screen */}
      <mesh position={[0, centreY, 0]} castShadow>
        <boxGeometry args={[w, screenH, 0.05]} />
        <meshStandardMaterial color="#0b0c0e" roughness={0.35} metalness={0.2} />
      </mesh>
      {/* faint screen face */}
      <mesh position={[0, centreY, 0.026]}>
        <planeGeometry args={[w - 0.06, screenH - 0.06]} />
        <meshStandardMaterial color="#1c2733" emissive="#22303f" emissiveIntensity={0.4} roughness={0.2} />
      </mesh>
      {/* neck + foot */}
      <mesh position={[0, standH + 0.12, 0]} castShadow>
        <boxGeometry args={[0.08, 0.24, 0.06]} />
        <Mat material={m} />
      </mesh>
      <mesh position={[0, standH / 2, 0]} castShadow>
        <boxGeometry args={[w * 0.4, standH, 0.22]} />
        <Mat material={m} />
      </mesh>
    </group>
  )
}


export function Curtain({
  w,
  h,
  blinds = false,
  m,
}: {
  w: number
  h: number
  blinds?: boolean
  m: Material
}) {
  if (blinds) {
    const n = Math.max(3, Math.round(h / 0.12))
    return (
      <group>
        {/* headrail */}
        <mesh position={[0, h - 0.03, 0]} castShadow>
          <boxGeometry args={[w, 0.06, 0.06]} />
          <meshStandardMaterial color="#d7d3c8" roughness={0.6} />
        </mesh>
        {/* slats */}
        {Array.from({ length: n }).map((_, i) => (
          <mesh key={i} position={[0, (h * (i + 0.5)) / n, 0]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[w - 0.04, 0.09, 0.012]} />
            <Mat material={m} />
          </mesh>
        ))}
      </group>
    )
  }
  // gathered fabric curtain: several vertical folds
  const folds = Math.max(4, Math.round(w / 0.18))
  const fw = w / folds
  return (
    <group>
      <mesh position={[0, h - 0.02, 0]} castShadow>
        <boxGeometry args={[w + 0.1, 0.05, 0.08]} />
        <meshStandardMaterial color="#8a8378" metalness={0.4} roughness={0.5} />
      </mesh>
      {Array.from({ length: folds }).map((_, i) => (
        <mesh
          key={i}
          position={[-w / 2 + fw * (i + 0.5), h / 2, (i % 2 === 0 ? 0.03 : -0.03)]}
          castShadow
        >
          <boxGeometry args={[fw * 0.96, h, 0.05]} />
          <Mat material={m} repeat={[1, 2]} />
        </mesh>
      ))}
    </group>
  )
}

export function GLBModel({ url }: { url: string; m: Material }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} />
}
