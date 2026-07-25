import type { Material } from '../../types/project'
import type { TextureId } from './textures'

export interface Preset {
  name: string
  material: Material
}

// Quick paint colours (walls) — muted, home-friendly palette.
export const PAINT_PRESETS: Preset[] = [
  { name: 'Warm White', material: { color: '#efece5', roughness: 0.95, metalness: 0 } },
  { name: 'Cool Grey', material: { color: '#c9ccd1', roughness: 0.95, metalness: 0 } },
  { name: 'Greige', material: { color: '#cfc6b8', roughness: 0.95, metalness: 0 } },
  { name: 'Sage', material: { color: '#b7c1a8', roughness: 0.95, metalness: 0 } },
  { name: 'Blush', material: { color: '#e3c7bd', roughness: 0.95, metalness: 0 } },
  { name: 'Sky', material: { color: '#b9cddb', roughness: 0.95, metalness: 0 } },
  { name: 'Terracotta', material: { color: '#c17a5b', roughness: 0.95, metalness: 0 } },
  { name: 'Charcoal', material: { color: '#3a3d42', roughness: 0.9, metalness: 0 } },
  { name: 'Navy', material: { color: '#39445a', roughness: 0.9, metalness: 0 } },
]

// Floor finishes.
export const FLOOR_PRESETS: Preset[] = [
  { name: 'Oak', material: { color: '#c49a6c', roughness: 0.7, metalness: 0, texture: 'wood' } },
  { name: 'Walnut', material: { color: '#7a5334', roughness: 0.6, metalness: 0, texture: 'wood-dark' } },
  { name: 'Marble', material: { color: '#eceae7', roughness: 0.25, metalness: 0.05, texture: 'marble' } },
  { name: 'Grey Tile', material: { color: '#c7c7c9', roughness: 0.4, metalness: 0, texture: 'tile' } },
  { name: 'Concrete', material: { color: '#9a9a9d', roughness: 0.8, metalness: 0, texture: 'concrete' } },
  { name: 'Carpet', material: { color: '#8a8378', roughness: 1, metalness: 0, texture: 'carpet' } },
]

export const TEXTURE_LABELS: Record<TextureId, string> = {
  none: 'None',
  wood: 'Wood (light)',
  'wood-dark': 'Wood (dark)',
  tile: 'Tile',
  marble: 'Marble',
  carpet: 'Carpet',
  concrete: 'Concrete',
  fabric: 'Fabric',
}
