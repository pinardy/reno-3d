import * as THREE from 'three'
import type { Vec2 } from '../types/project'

/**
 * Triangulate a room polygon (metres, x/z plane) into a flat BufferGeometry at
 * the given height. `up = true` faces +Y (floor); `up = false` faces -Y
 * (ceiling). UVs are world x/z so textures keep a real-world scale (1 unit = 1m).
 */
export function buildFloorGeometry(loop: Vec2[], y: number, up = true): THREE.BufferGeometry {
  const contour = loop.map((p) => new THREE.Vector2(p.x, p.z))
  // ensure CCW for triangulateShape
  const area = THREE.ShapeUtils.area(contour)
  const pts = area < 0 ? [...contour].reverse() : contour
  const tris = THREE.ShapeUtils.triangulateShape(pts, [])

  const positions: number[] = []
  const uvs: number[] = []
  const normalY = up ? 1 : -1

  for (const [ia, ib, ic] of tris) {
    const order = up ? [ia, ib, ic] : [ic, ib, ia]
    for (const idx of order) {
      const p = pts[idx]
      positions.push(p.x, y, p.y)
      uvs.push(p.x, p.y)
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  const normals: number[] = []
  for (let i = 0; i < positions.length / 3; i++) normals.push(0, normalY, 0)
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geom.computeBoundingSphere()
  return geom
}
