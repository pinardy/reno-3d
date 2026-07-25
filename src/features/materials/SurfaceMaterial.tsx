import { useMemo } from 'react'
import * as THREE from 'three'
import type { Material } from '../../types/project'
import { getTexture, type TextureId } from './textures'

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
  const map = useMemo(() => {
    const tex = material.texture
      ? getTexture(material.texture as TextureId)
      : null
    if (!tex) return null
    const t = tex.clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(Math.max(0.01, repeat[0]), Math.max(0.01, repeat[1]))
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.texture, repeat[0], repeat[1]])

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
