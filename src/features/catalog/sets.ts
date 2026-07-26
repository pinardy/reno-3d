import type { Item, Vec2 } from '../../types/project'
import { catalogById, newItemFromCatalog } from './catalog'

// Ready-made groupings you drop as one piece, then nudge into place — the tedious
// part of decorating a room is the first rough arrangement, not the fine-tuning.
// Offsets are in metres relative to the drop point; rotations follow the scene's
// convention (a rot-0 sofa faces -z, the way the templates lay them out).

export interface FurnitureSet {
  id: string
  name: string
  hint: string
  make: (pos: Vec2) => Omit<Item, 'id'>[]
}

interface Placement {
  catalogId: string
  dx: number
  dz: number
  rotDeg?: number
  y?: number
}

function build(pos: Vec2, parts: Placement[]): Omit<Item, 'id'>[] {
  const out: Omit<Item, 'id'>[] = []
  for (const part of parts) {
    const entry = catalogById(part.catalogId)
    if (!entry) continue
    const it = newItemFromCatalog(entry, { x: pos.x + part.dx, z: pos.z + part.dz })
    it.rotationY = ((part.rotDeg ?? 0) * Math.PI) / 180
    if (part.y !== undefined) it.y = part.y
    out.push(it)
  }
  return out
}

export const FURNITURE_SETS: FurnitureSet[] = [
  {
    id: 'living',
    name: 'Living room',
    hint: 'Sofa, coffee table, rug, TV console + TV',
    make: (pos) =>
      build(pos, [
        { catalogId: 'rug', dx: 0, dz: 0.2 },
        { catalogId: 'coffee-table', dx: 0, dz: 0.2 },
        { catalogId: 'sofa-3', dx: 0, dz: 1.4, rotDeg: 0 },
        { catalogId: 'tv-console', dx: 0, dz: -1.4, rotDeg: 180 },
        { catalogId: 'tv-55', dx: 0, dz: -1.4, rotDeg: 180, y: 0.5 },
      ]),
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    hint: 'Queen bed, two nightstands, wardrobe',
    make: (pos) =>
      build(pos, [
        { catalogId: 'bed-queen', dx: 0, dz: 0.3, rotDeg: 0 },
        { catalogId: 'nightstand', dx: -1.1, dz: -0.6 },
        { catalogId: 'nightstand', dx: 1.1, dz: -0.6 },
        { catalogId: 'wardrobe', dx: 0, dz: 2.1, rotDeg: 180 },
      ]),
  },
  {
    id: 'dining',
    name: 'Dining',
    hint: 'Table with four chairs',
    make: (pos) =>
      build(pos, [
        { catalogId: 'dining-table', dx: 0, dz: 0 },
        { catalogId: 'chair', dx: 0, dz: -0.75, rotDeg: 0 },
        { catalogId: 'chair', dx: 0, dz: 0.75, rotDeg: 180 },
        { catalogId: 'chair', dx: 0.8, dz: 0, rotDeg: -90 },
        { catalogId: 'chair', dx: -0.8, dz: 0, rotDeg: 90 },
      ]),
  },
]

export function setById(id: string): FurnitureSet | undefined {
  return FURNITURE_SETS.find((s) => s.id === id)
}
