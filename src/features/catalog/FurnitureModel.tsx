import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'
import type { Item, Material } from '../../types/project'
import { SurfaceMaterial } from '../materials/SurfaceMaterial'
import { catalogById } from './catalog'

// All models are authored with their base at y=0 and centred on x/z. The parent
// <group> applies world position, rotationY and uniform scale.

function Mat({ material, repeat }: { material: Material; repeat?: [number, number] }) {
  return <SurfaceMaterial material={material} repeat={repeat} />
}

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)

export function FurnitureModel({ item }: { item: Item }) {
  const entry = catalogById(item.catalogId)
  const size = entry?.size ?? { w: 1, d: 1, h: 1 }
  const m = item.material

  switch (item.kind) {
    case 'sofa':
      return (
        <Sofa
          w={size.w}
          d={size.d}
          h={size.h}
          chaise={bool(item.params?.chaise, false)}
          m={m}
        />
      )
    case 'bed':
      return <Bed w={size.w} d={size.d} m={m} />
    case 'table':
      return <Table w={size.w} d={size.d} h={size.h} m={m} />
    case 'chair':
      return <Chair w={size.w} d={size.d} h={size.h} m={m} />
    case 'wardrobe':
      return (
        <Cabinet
          w={size.w}
          d={size.d}
          h={size.h}
          doors={num(item.params?.doors, 2)}
          counter={false}
          m={m}
        />
      )
    case 'cabinet':
      return (
        <Cabinet
          w={num(item.params?.width, size.w)}
          d={num(item.params?.depth, size.d)}
          h={num(item.params?.height, size.h)}
          doors={num(item.params?.doors, 2)}
          counter={bool(item.params?.counter, false)}
          m={m}
        />
      )
    case 'shelf':
      return <Shelf w={size.w} d={size.d} h={size.h} shelves={num(item.params?.shelves, 4)} m={m} />
    case 'stool':
      return <Stool w={size.w} h={size.h} m={m} />
    case 'tv':
      return <TV w={size.w} h={size.h} m={m} />
    case 'toilet':
      return <Toilet w={size.w} d={size.d} h={size.h} m={m} />
    case 'sink':
      return <Sink w={size.w} d={size.d} h={size.h} m={m} />
    case 'bathtub':
      return <Bathtub w={size.w} d={size.d} h={size.h} m={m} />
    case 'pendant':
      return <Pendant m={m} />
    case 'rug':
      return (
        <mesh position={[0, 0.011, 0]} receiveShadow>
          <boxGeometry args={[size.w, 0.02, size.d]} />
          <Mat material={m} repeat={[2, 2]} />
        </mesh>
      )
    case 'lamp':
      return <Lamp h={size.h} m={m} />
    case 'piano':
      return <Piano w={size.w} d={size.d} h={size.h} m={m} />
    case 'vase':
      return <Vase w={size.w} h={size.h} flowers={bool(item.params?.flowers, false)} m={m} />
    case 'plant':
      return <Plant h={size.h} tall={bool(item.params?.tall, false)} m={m} />
    case 'picture':
      return (
        <Picture
          w={size.w}
          h={size.h}
          round={bool(item.params?.round, false)}
          mirror={bool(item.params?.mirror, false)}
          m={m}
        />
      )
    case 'appliance':
      return (
        <Appliance
          w={size.w}
          d={size.d}
          h={size.h}
          roundDoor={bool(item.params?.roundDoor, false)}
          m={m}
        />
      )
    case 'hood':
      return <Hood w={size.w} d={size.d} h={size.h} m={m} />
    case 'shower':
      return <Shower w={size.w} d={size.d} h={size.h} m={m} />
    case 'toiletries':
      return <Toiletries m={m} />
    case 'glb':
      return item.modelUrl ? (
        <Suspense fallback={null}>
          <GLBModel url={item.modelUrl} m={m} />
        </Suspense>
      ) : null
    default:
      return (
        <mesh castShadow>
          <boxGeometry args={[size.w, size.h, size.d]} />
          <Mat material={m} />
        </mesh>
      )
  }
}

function Sofa({
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

function Bed({ w, d, m }: { w: number; d: number; m: Material }) {
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

function Table({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
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

function Chair({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
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

function Cabinet({
  w,
  d,
  h,
  doors,
  counter,
  m,
}: {
  w: number
  d: number
  h: number
  doors: number
  counter: boolean
  m: Material
}) {
  const counterH = counter ? 0.04 : 0
  const bodyH = h - counterH
  const nDoors = Math.max(1, Math.round(doors))
  const doorW = (w - 0.04) / nDoors
  return (
    <group>
      {/* body */}
      <mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bodyH, d]} />
        <Mat material={m} />
      </mesh>
      {/* doors (slightly proud) */}
      {Array.from({ length: nDoors }).map((_, i) => {
        const cx = -w / 2 + 0.02 + doorW * (i + 0.5)
        return (
          <group key={i}>
            <mesh position={[cx, bodyH / 2, d / 2 + 0.005]} castShadow>
              <boxGeometry args={[doorW - 0.02, bodyH - 0.06, 0.02]} />
              <SurfaceMaterial material={{ ...m, roughness: Math.min(1, m.roughness) }} />
            </mesh>
            {/* handle */}
            <mesh
              position={[cx + doorW / 2 - 0.06, bodyH / 2, d / 2 + 0.02]}
              castShadow
            >
              <boxGeometry args={[0.02, 0.12, 0.02]} />
              <meshStandardMaterial color="#3a3a3d" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        )
      })}
      {/* countertop */}
      {counter && (
        <mesh position={[0, bodyH + counterH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.02, counterH, d + 0.02]} />
          <meshStandardMaterial color="#3b3b40" roughness={0.3} metalness={0.1} />
        </mesh>
      )}
    </group>
  )
}

function Lamp({ h, m }: { h: number; m: Material }) {
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

function Plant({ h, tall = false, m }: { h: number; tall?: boolean; m: Material }) {
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

function Piano({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
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

function Vase({ w, h, flowers = false, m }: { w: number; h: number; flowers?: boolean; m: Material }) {
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

function Picture({
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

function Appliance({
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

function Hood({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
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

function Shower({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
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

function Toiletries({ m }: { m: Material }) {
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

function matProps(m: Material) {
  return { color: m.color, roughness: m.roughness, metalness: m.metalness }
}

function Shelf({
  w,
  d,
  h,
  shelves,
  m,
}: {
  w: number
  d: number
  h: number
  shelves: number
  m: Material
}) {
  const t = 0.03
  const n = Math.max(2, Math.round(shelves))
  return (
    <group>
      {/* sides + top + bottom + back */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (w - t)) / 2, h / 2, 0]} castShadow>
          <boxGeometry args={[t, h, d]} />
          <Mat material={m} />
        </mesh>
      ))}
      <mesh position={[0, 0, -d / 2 + t / 2]} castShadow>
        <boxGeometry args={[w, h, t]} />
        <Mat material={m} />
      </mesh>
      {Array.from({ length: n + 1 }).map((_, i) => (
        <mesh key={i} position={[0, (h * i) / n, 0]} castShadow receiveShadow>
          <boxGeometry args={[w - t, t, d]} />
          <Mat material={m} />
        </mesh>
      ))}
    </group>
  )
}

function Stool({ w, h, m }: { w: number; h: number; m: Material }) {
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

function TV({ w, h, m }: { w: number; h: number; m: Material }) {
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

function Toilet({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
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

function Sink({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
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

function Bathtub({ w, d, h, m }: { w: number; d: number; h: number; m: Material }) {
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

function Pendant({ m }: { m: Material }) {
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

function GLBModel({ url }: { url: string; m: Material }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} />
}
