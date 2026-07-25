import { nanoid } from 'nanoid'
import {
  type Project,
  type Material,
  emptyProject,
  DEFAULT_WALL_MATERIAL,
  DEFAULT_FLOOR_MATERIAL,
  DEFAULT_CEILING_MATERIAL,
} from '../../types/project'
import { catalogById, newItemFromCatalog } from '../catalog/catalog'

// Approximate HDB/BTO starter layouts. These are clean, editable starting
// points — not exact blueprints. Dimensions are in metres.

const TILE: Material = { color: '#d7d2c8', roughness: 0.5, metalness: 0, texture: 'tile' }
const WOODF: Material = { color: '#b7936a', roughness: 0.7, metalness: 0, texture: 'wood' }
const DARKF: Material = { color: '#7a5334', roughness: 0.6, metalness: 0, texture: 'wood-dark' }

class FlatBuilder {
  p: Project
  W: number
  D: number
  top: string
  right: string
  bottom: string
  left: string

  constructor(name: string, W: number, D: number) {
    this.p = emptyProject(nanoid(), name)
    this.p.floorPlan.pxPerMeter = 100
    this.W = W
    this.D = D
    this.top = this.wall(0, 0, W, 0)
    this.right = this.wall(W, 0, W, D)
    this.bottom = this.wall(W, D, 0, D)
    this.left = this.wall(0, D, 0, 0)
  }

  wall(ax: number, az: number, bx: number, bz: number): string {
    const id = nanoid()
    this.p.walls.push({
      id,
      a: { x: ax, z: az },
      b: { x: bx, z: bz },
      height: this.p.wallHeight,
      thickness: this.p.wallThickness,
      material: { ...DEFAULT_WALL_MATERIAL },
    })
    return id
  }

  private wallById(id: string) {
    return this.p.walls.find((w) => w.id === id)!
  }

  // place a door/window by a world point that lies on the wall
  doorAt(wallId: string, wx: number, wz: number, width = 0.9, hinge: 'left' | 'right' = 'left') {
    const w = this.wallById(wallId)
    const off = Math.hypot(wx - w.a.x, wz - w.a.z)
    this.p.openings.push({
      id: nanoid(),
      wallId,
      type: 'door',
      offset: off,
      width,
      height: 2.05,
      sillHeight: 0,
      hinge,
    })
  }

  windowAt(wallId: string, wx: number, wz: number, width = 1.4) {
    const w = this.wallById(wallId)
    const off = Math.hypot(wx - w.a.x, wz - w.a.z)
    this.p.openings.push({
      id: nanoid(),
      wallId,
      type: 'window',
      offset: off,
      width,
      height: 1.2,
      sillHeight: 0.9,
    })
  }

  room(name: string, x: number, z: number, w: number, d: number, mat?: Material) {
    const i = 0.05
    this.p.rooms.push({
      id: nanoid(),
      name,
      loop: [
        { x: x + i, z: z + i },
        { x: x + w - i, z: z + i },
        { x: x + w - i, z: z + d - i },
        { x: x + i, z: z + d - i },
      ],
      floorMaterial: mat ? { ...mat } : { ...DEFAULT_FLOOR_MATERIAL },
      ceilingMaterial: { ...DEFAULT_CEILING_MATERIAL },
      showCeiling: false,
    })
  }

  place(catalogId: string, x: number, z: number, rotDeg = 0) {
    const e = catalogById(catalogId)
    if (!e) return
    const it = newItemFromCatalog(e, { x, z })
    it.rotationY = (rotDeg * Math.PI) / 180
    this.p.items.push({ ...it, id: nanoid() })
  }

  // --- room "sets" (rough furnishing) ---
  bedroomSet(x: number, z: number, w: number, d: number, master = false) {
    this.place(master ? 'bed-queen' : 'bed-single', x + w / 2, z + 1.2)
    this.place('wardrobe', x + w - 0.45, z + d - 0.9, -90)
    this.place('nightstand', x + 0.45, z + 0.5)
  }
  bathroomSet(x: number, z: number, w: number, d: number) {
    this.place('toilet', x + 0.45, z + 0.6, 90)
    this.place('bathroom-sink', x + w - 0.35, z + 0.6, -90)
    this.place('shower', x + w - 0.6, z + d - 0.6)
  }
  kitchenRun(x: number, z: number, w: number) {
    let cx = x + 0.35
    const step = 0.62
    for (const id of ['base-cabinet', 'kitchen-sink', 'base-cabinet', 'stove', 'fridge']) {
      if (cx > x + w - 0.35) break
      this.place(id, cx, z + 0.4)
      cx += step
    }
  }

  build(): Project {
    this.p.updatedAt = 0
    return this.p
  }
}

export function makeHDB3Room(): Project {
  const W = 8
  const D = 8
  const b = new FlatBuilder('HDB 3-Room (approx)', W, D)
  const vx = 4.6
  const spine = b.wall(vx, 0, vx, D)
  b.wall(vx, 2.6, W, 2.6)
  b.wall(vx, 4.4, W, 4.4)

  b.room('Living / Dining', 0, 0, vx, D, WOODF)
  b.room('Kitchen', vx, 0, W - vx, 2.6, TILE)
  b.room('Bathroom', vx, 2.6, W - vx, 1.8, TILE)
  b.room('Bedroom', vx, 4.4, W - vx, D - 4.4, DARKF)

  b.doorAt(b.bottom, 2.3, D) // entrance
  b.doorAt(spine, vx, 1.3, 0.9, 'left') // to kitchen
  b.doorAt(spine, vx, 3.5) // to bath
  b.doorAt(spine, vx, 6.2) // to bedroom
  b.windowAt(b.left, 0, 4, 1.8)
  b.windowAt(b.right, W, 6.2)

  // living/dining
  b.place('sofa-3', 1.8, 6.6, 0)
  b.place('coffee-table', 1.8, 5.4)
  b.place('tv-console', 1.8, 0.5, 180)
  b.place('tv-55', 1.8, 0.7, 180)
  b.place('rug', 1.8, 5.6)
  b.place('dining-table', 2.6, 2.6)
  b.place('chair', 2.6, 1.9)
  b.place('chair', 2.6, 3.3, 180)
  b.kitchenRun(vx, 0, W - vx)
  b.bathroomSet(vx, 2.6, W - vx, 1.8)
  b.bedroomSet(vx, 4.4, W - vx, D - 4.4, true)
  return b.build()
}

export function makeHDB4Room(): Project {
  const W = 9.6
  const D = 9.8
  const b = new FlatBuilder('HDB 4-Room (approx)', W, D)
  const vx = 5.2
  const spine = b.wall(vx, 0, vx, D)
  b.wall(vx, 2.8, W, 2.8)
  b.wall(vx, 4.6, W, 4.6)
  b.wall(vx, 7.0, W, 7.0)
  b.wall(7.4, 2.8, 7.4, 4.6)
  b.wall(7.4, 4.6, 7.4, 7.0)

  b.room('Living / Dining', 0, 0, vx, D, WOODF)
  b.room('Kitchen', vx, 0, W - vx, 2.8, TILE)
  b.room('Bathroom', vx, 2.8, 2.2, 1.8, TILE)
  b.room('WC', 7.4, 2.8, W - 7.4, 1.8, TILE)
  b.room('Bedroom 2', vx, 4.6, 2.2, 2.4, DARKF)
  b.room('Bedroom 3', 7.4, 4.6, W - 7.4, 2.4, DARKF)
  b.room('Master Bedroom', vx, 7.0, W - vx, D - 7.0, DARKF)

  b.doorAt(b.bottom, 2.6, D)
  b.doorAt(spine, vx, 1.3)
  b.doorAt(spine, vx, 3.6)
  b.doorAt(spine, vx, 5.6)
  b.doorAt(spine, vx, 8.3)
  b.windowAt(b.left, 0, 5, 1.8)
  b.windowAt(b.right, W, 5.6)
  b.windowAt(b.right, W, 8.3)

  b.place('sectional-sofa', 1.9, 7.0, 0)
  b.place('coffee-table', 1.9, 5.6)
  b.place('tv-console', 1.9, 0.5, 180)
  b.place('tv-55', 1.9, 0.7, 180)
  b.place('rug', 1.9, 5.8)
  b.place('dining-table', 3.2, 2.8)
  b.place('chair', 3.2, 2.1)
  b.place('chair', 3.2, 3.5, 180)
  b.kitchenRun(vx, 0, W - vx)
  b.bathroomSet(vx, 2.8, 2.2, 1.8)
  b.bathroomSet(7.4, 2.8, W - 7.4, 1.8)
  b.bedroomSet(vx, 4.6, 2.2, 2.4)
  b.bedroomSet(7.4, 4.6, W - 7.4, 2.4)
  b.bedroomSet(vx, 7.0, W - vx, D - 7.0, true)
  return b.build()
}

export function makeHDB5Room(): Project {
  const W = 10.6
  const D = 10.7
  const b = new FlatBuilder('HDB 5-Room (approx)', W, D)
  const vx = 6
  const spine = b.wall(vx, 0, vx, D)
  b.wall(vx, 3.0, W, 3.0)
  b.wall(vx, 4.8, W, 4.8)
  b.wall(vx, 7.6, W, 7.6)
  b.wall(8.3, 3.0, 8.3, 4.8)
  b.wall(8.3, 4.8, 8.3, 7.6)

  b.room('Living / Dining', 0, 0, vx, D, WOODF)
  b.room('Kitchen', vx, 0, W - vx, 3.0, TILE)
  b.room('Bathroom', vx, 3.0, 2.3, 1.8, TILE)
  b.room('WC', 8.3, 3.0, W - 8.3, 1.8, TILE)
  b.room('Bedroom 2', vx, 4.8, 2.3, 2.8, DARKF)
  b.room('Bedroom 3', 8.3, 4.8, W - 8.3, 2.8, DARKF)
  b.room('Master Bedroom', vx, 7.6, W - vx, D - 7.6, DARKF)

  b.doorAt(b.bottom, 3.0, D)
  b.doorAt(spine, vx, 1.4)
  b.doorAt(spine, vx, 3.9)
  b.doorAt(spine, vx, 6.0)
  b.doorAt(spine, vx, 9.1)
  b.windowAt(b.left, 0, 5.5, 2.0)
  b.windowAt(b.right, W, 6.0)
  b.windowAt(b.right, W, 9.1)

  b.place('sectional-sofa', 2.2, 7.6, 0)
  b.place('coffee-table', 2.2, 6.0)
  b.place('tv-console', 2.2, 0.5, 180)
  b.place('tv-55', 2.2, 0.7, 180)
  b.place('rug', 2.2, 6.2)
  b.place('dining-table', 3.8, 3.0)
  b.place('chair', 3.8, 2.2)
  b.place('chair', 3.8, 3.8, 180)
  b.place('bookshelf', 0.5, 1.0, 90)
  b.kitchenRun(vx, 0, W - vx)
  b.bathroomSet(vx, 3.0, 2.3, 1.8)
  b.bathroomSet(8.3, 3.0, W - 8.3, 1.8)
  b.bedroomSet(vx, 4.8, 2.3, 2.8)
  b.bedroomSet(8.3, 4.8, W - 8.3, 2.8)
  b.bedroomSet(vx, 7.6, W - vx, D - 7.6, true)
  return b.build()
}

export const TEMPLATES: { id: string; name: string; make: () => Project }[] = [
  { id: 'hdb3', name: 'HDB 3-Room', make: makeHDB3Room },
  { id: 'hdb4', name: 'HDB 4-Room', make: makeHDB4Room },
  { id: 'hdb5', name: 'HDB 5-Room', make: makeHDB5Room },
]
