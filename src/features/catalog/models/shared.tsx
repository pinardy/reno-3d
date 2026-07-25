import type { Material } from '../../../types/project'
import { SurfaceMaterial } from '../../materials/SurfaceMaterial'

// Shared helpers for the parametric furniture models. All models are authored
// with their base at y=0 and centred on x/z; the parent <group> applies world
// position, rotationY and uniform scale.

export function Mat({ material, repeat }: { material: Material; repeat?: [number, number] }) {
  return <SurfaceMaterial material={material} repeat={repeat} />
}

export function matProps(m: Material) {
  return { color: m.color, roughness: m.roughness, metalness: m.metalness }
}
