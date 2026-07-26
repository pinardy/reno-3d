import { nanoid } from 'nanoid'
import {
  type Project,
  type Wall,
  emptyProject,
  DEFAULT_WALL_MATERIAL,
  DEFAULT_FLOOR_MATERIAL,
  DEFAULT_CEILING_MATERIAL,
} from '../../types/project'
import { CATALOG, newItemFromCatalog, catalogById } from '../catalog/catalog'

// A small 2-room flat (roughly a BTO living room + bedroom) so the app has
// something to show immediately, without needing a floor-plan image.
export function makeSampleProject(): Project {
  const p = emptyProject(nanoid(), 'Sample 2-Room Flat')
  p.floorPlan.pxPerMeter = 100 // arbitrary; no image, drawing works in metres

  const wall = (ax: number, az: number, bx: number, bz: number): Wall => ({
    id: nanoid(),
    a: { x: ax, z: az },
    b: { x: bx, z: bz },
    height: p.wallHeight,
    thickness: p.wallThickness,
    material: { ...DEFAULT_WALL_MATERIAL },
  })

  const top = wall(0, 0, 7, 0)
  const right = wall(7, 0, 7, 5)
  const bottom = wall(7, 5, 0, 5)
  const left = wall(0, 5, 0, 0)
  const mid = wall(4, 0, 4, 5)
  p.walls = [top, right, bottom, left, mid]

  p.openings = [
    {
      id: nanoid(),
      wallId: mid.id,
      type: 'door',
      offset: 2.6,
      width: 0.9,
      height: 2.05,
      sillHeight: 0,
    },
    {
      id: nanoid(),
      wallId: top.id,
      type: 'window',
      offset: 5.5,
      width: 1.6,
      height: 1.2,
      sillHeight: 0.9,
    },
    {
      id: nanoid(),
      wallId: left.id,
      type: 'door',
      offset: 2.5,
      width: 0.95,
      height: 2.05,
      sillHeight: 0,
    },
  ]

  p.rooms = [
    {
      id: nanoid(),
      name: 'Living Room',
      loop: [
        { x: 0.05, z: 0.05 },
        { x: 3.95, z: 0.05 },
        { x: 3.95, z: 4.95 },
        { x: 0.05, z: 4.95 },
      ],
      floorMaterial: { ...DEFAULT_FLOOR_MATERIAL },
      ceilingMaterial: { ...DEFAULT_CEILING_MATERIAL },
      showCeiling: false,
    },
    {
      id: nanoid(),
      name: 'Bedroom',
      loop: [
        { x: 4.05, z: 0.05 },
        { x: 6.95, z: 0.05 },
        { x: 6.95, z: 4.95 },
        { x: 4.05, z: 4.95 },
      ],
      floorMaterial: {
        color: '#7a5334',
        roughness: 0.6,
        metalness: 0,
        texture: 'wood-dark',
      },
      ceilingMaterial: { ...DEFAULT_CEILING_MATERIAL },
      showCeiling: false,
    },
  ]

  const place = (catalogId: string, x: number, z: number, rotDeg = 0) => {
    const entry = catalogById(catalogId) ?? CATALOG[0]
    const it = newItemFromCatalog(entry, { x, z })
    it.rotationY = (rotDeg * Math.PI) / 180
    return { ...it, id: nanoid() }
  }

  p.items = [
    place('sofa-3', 2, 4.1, 180),
    place('coffee-table', 2, 3.1),
    place('tv-console', 2, 0.4),
    place('rug', 2, 3.2),
    // clear of the bedroom door's swing, which reaches ~0.9m in from x=4
    place('bed-queen', 5.75, 1.25),
    place('wardrobe', 6.6, 4.1, -90),
    place('nightstand', 4.75, 0.35),
  ]

  p.updatedAt = 0
  return p
}
