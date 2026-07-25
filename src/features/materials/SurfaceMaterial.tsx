import { useMemo } from 'react'
import * as THREE from 'three'
import type { Material } from '../../types/project'
import { getTexture, type TextureId } from './textures'

// Cloned textures are shared across meshes by (id, repeatX, repeatY) so we don't
// allocate a new GPU texture per mesh. Repeat is rounded to 0.1 to bound the
// cache and improve sharing (the visual difference is negligible).
const repeatedCache = new Map<string, THREE.Texture>()

function getRepeatedTexture(id: TextureId, rx: number, ry: number): THREE.Texture | null {
  const key = `${id}|${rx}|${ry}`
  const cached = repeatedCache.get(key)
  if (cached) return cached
  const base = getTexture(id)
  if (!base) return null
  const t = base.clone()
  t.needsUpdate = true
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  repeatedCache.set(key, t)
  return t
}

/**
 * Renders a meshStandardMaterial from a Material spec. `repeat` is how many
 * times the texture tiles across the surface (derive from surface size so the
 * texture keeps a consistent real-world scale).
 */
export function SurfaceMaterial({
  material,
  repeat = [1, 1],
  side,
}: {
  material: Material
  repeat?: [number, number]
  side?: THREE.Side
}) {
  const rx = Math.max(0.1, Math.round(repeat[0] * 10) / 10)
  const ry = Math.max(0.1, Math.round(repeat[1] * 10) / 10)
  const map = useMemo(
    () => (material.texture ? getRepeatedTexture(material.texture as TextureId, rx, ry) : null),
    [material.texture, rx, ry],
  )

  return (
    <meshStandardMaterial
      color={material.color}
      roughness={material.roughness}
      metalness={material.metalness}
      map={map ?? undefined}
      side={side}
    />
  )
}
