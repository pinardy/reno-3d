import type { Material } from '../../../types/project'
import { SurfaceMaterial } from '../../materials/SurfaceMaterial'
import { Mat } from './shared'

export function Cabinet({
  w,
  d,
  h,
  doors,
  counter,
  corner = false,
  legLen = 1.0,
  drawers = 0,
  m,
}: {
  w: number
  d: number
  h: number
  doors: number
  counter: boolean
  corner?: boolean
  legLen?: number
  /** > 0 stacks horizontal drawer fronts instead of vertical doors. */
  drawers?: number
  m: Material
}) {
  const counterH = counter ? 0.04 : 0
  const bodyH = h - counterH
  // Main run faces +z. In corner mode a return leg runs back along -z at the
  // left end (facing +x), forming an L that wraps a wall corner. The main run's
  // left part is occupied by the return, so its doors start after that.
  const mainX0 = corner ? -w / 2 + d : -w / 2
  const mainDoorW = w / 2 - mainX0
  const nDoors = Math.max(1, Math.round(doors))
  // drawers are only meaningful on a straight run; a corner unit keeps its doors
  const nDrawers = corner ? 0 : Math.max(0, Math.round(drawers))
  const doorW = (mainDoorW - 0.04) / nDoors
  const doorMat = { ...m, roughness: Math.min(1, m.roughness) }

  // return leg exposed front (beyond the shared corner square)
  const rz0 = d / 2
  const rz1 = -d / 2 + legLen
  const rRun = rz1 - rz0
  const rFaceX = -w / 2 + d
  const rn = rRun > 0.15 ? Math.max(1, Math.round(rRun / 0.5)) : 0
  const rDoorW = rn > 0 ? (rRun - 0.04) / rn : 0

  return (
    <group>
      {/* main body */}
      <mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bodyH, d]} />
        <Mat material={m} />
      </mesh>
      {/* drawer fronts: stacked across the full width, each with a bar pull */}
      {nDrawers > 0
        ? Array.from({ length: nDrawers }).map((_, i) => {
            const frontH = (bodyH - 0.06) / nDrawers
            const cy = 0.03 + frontH * (i + 0.5)
            return (
              <group key={i}>
                <mesh position={[0, cy, d / 2 + 0.005]} castShadow>
                  <boxGeometry args={[w - 0.04, frontH - 0.015, 0.02]} />
                  <SurfaceMaterial material={doorMat} />
                </mesh>
                <mesh position={[0, cy, d / 2 + 0.02]} castShadow>
                  <boxGeometry args={[Math.min(0.3, w * 0.45), 0.02, 0.02]} />
                  <meshStandardMaterial color="#3a3a3d" metalness={0.7} roughness={0.3} />
                </mesh>
              </group>
            )
          })
        : /* main doors */
          Array.from({ length: nDoors }).map((_, i) => {
            const cx = mainX0 + 0.02 + doorW * (i + 0.5)
            return (
              <group key={i}>
                <mesh position={[cx, bodyH / 2, d / 2 + 0.005]} castShadow>
                  <boxGeometry args={[doorW - 0.02, bodyH - 0.06, 0.02]} />
                  <SurfaceMaterial material={doorMat} />
                </mesh>
                <mesh position={[cx + doorW / 2 - 0.06, bodyH / 2, d / 2 + 0.02]} castShadow>
                  <boxGeometry args={[0.02, 0.12, 0.02]} />
                  <meshStandardMaterial color="#3a3a3d" metalness={0.7} roughness={0.3} />
                </mesh>
              </group>
            )
          })}
      {counter && (
        <mesh position={[0, bodyH + counterH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.02, counterH, d + 0.02]} />
          <meshStandardMaterial color="#3b3b40" roughness={0.3} metalness={0.1} />
        </mesh>
      )}

      {corner && (
        <group>
          {/* return leg body */}
          <mesh position={[-w / 2 + d / 2, bodyH / 2, -d / 2 + legLen / 2]} castShadow receiveShadow>
            <boxGeometry args={[d, bodyH, legLen]} />
            <Mat material={m} />
          </mesh>
          {/* return leg doors (face +x) */}
          {Array.from({ length: rn }).map((_, i) => {
            const cz = rz0 + 0.02 + rDoorW * (i + 0.5)
            return (
              <group key={i}>
                <mesh position={[rFaceX + 0.005, bodyH / 2, cz]} rotation={[0, Math.PI / 2, 0]} castShadow>
                  <boxGeometry args={[rDoorW - 0.02, bodyH - 0.06, 0.02]} />
                  <SurfaceMaterial material={doorMat} />
                </mesh>
                <mesh position={[rFaceX + 0.02, bodyH / 2, cz + rDoorW / 2 - 0.06]} castShadow>
                  <boxGeometry args={[0.02, 0.12, 0.02]} />
                  <meshStandardMaterial color="#3a3a3d" metalness={0.7} roughness={0.3} />
                </mesh>
              </group>
            )
          })}
          {counter && (
            <mesh position={[-w / 2 + d / 2, bodyH + counterH / 2, -d / 2 + legLen / 2]} castShadow receiveShadow>
              <boxGeometry args={[d + 0.02, counterH, legLen + 0.02]} />
              <meshStandardMaterial color="#3b3b40" roughness={0.3} metalness={0.1} />
            </mesh>
          )}
        </group>
      )}
    </group>
  )
}


export function Shelf({
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

