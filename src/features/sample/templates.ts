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
    // perimeter walls are typically structural/load-bearing in HDB flats
    this.top = this.wall(0, 0, W, 0, true)
    this.right = this.wall(W, 0, W, D, true)
    this.bottom = this.wall(W, D, 0, D, true)
    this.left = this.wall(0, D, 0, 0, true)
  }

  wall(ax: number, az: number, bx: number, bz: number, structural = false): string {
    const id = nanoid()
    this.p.walls.push({
      id,
      a: { x: ax, z: az },
      b: { x: bx, z: bz },
      height: this.p.wallHeight,
      thickness: this.p.wallThickness,
      material: { ...DEFAULT_WALL_MATERIAL },
      structural,
    })
    return id
  }

  private wallById(id: string) {
    return this.p.walls.find((w) => w.id === id)!
  }

  // place a door/window by a world point that lies on the wall
  doorAt(
    wallId: string,
    wx: number,
    wz: number,
    width = 0.9,
    hinge: 'left' | 'right' = 'left',
    type: 'door' | 'sliding' = 'door',
  ) {
    const w = this.wallById(wallId)
    const off = Math.hypot(wx - w.a.x, wz - w.a.z)
    this.p.openings.push({
      id: nanoid(),
      wallId,
      type,
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

  place(catalogId: string, x: number, z: number, rotDeg = 0, y?: number) {
    const e = catalogById(catalogId)
    if (!e) return
    const it = newItemFromCatalog(e, { x, z })
    it.rotationY = (rotDeg * Math.PI) / 180
    if (y !== undefined) it.y = y
    this.p.items.push({ ...it, id: nanoid() })
  }

  private size(catalogId: string) {
    return catalogById(catalogId)!.size
  }

  // --- room "sets" (rough furnishing) ---
  //
  // Laid out from real carcass sizes rather than fixed steps, and kept out of the
  // swept area of the room's door. DOOR_CLEAR is how much of the door-side wall to
  // leave empty: a 0.9m door needs its own width to swing.
  //
  // Where a piece can't fit with the clearance it needs, it's left out. A 2.2×2.4m
  // bedroom genuinely can't take a 2.1m-tall wardrobe as well as a bed and still
  // let you open the doors, and drawing one anyway would just be a lie.

  bedroomSet(x: number, z: number, w: number, d: number, master = false) {
    const bedId = master ? 'bed-queen' : 'bed-single'
    const bed = this.size(bedId)
    const usable = w - DOOR_CLEAR - MARGIN
    if (usable < bed.w) return

    // Bed head to the near wall, pushed to the door side of the usable strip so
    // the far wall stays free for a wardrobe.
    const bedX = x + DOOR_CLEAR + bed.w / 2
    const bedZ = z + MARGIN + bed.d / 2
    this.place(bedId, bedX, bedZ)
    const bedRight = bedX + bed.w / 2
    const bedFoot = bedZ + bed.d / 2

    // Wardrobe against whichever wall leaves it room to open: the side wall if the
    // bed doesn't reach it, otherwise the far wall beyond the foot of the bed.
    const wd = this.size('wardrobe')
    let wardrobeAt: { x: number; z: number; rot: number } | null = null
    const sideFront = x + w - MARGIN - wd.d
    if (sideFront - ACCESS - GAP > bedRight && d - 2 * MARGIN >= wd.w) {
      wardrobeAt = { x: sideFront + wd.d / 2, z: z + d - MARGIN - wd.w / 2, rot: -90 }
    } else if (z + d - MARGIN - wd.d - ACCESS >= bedFoot) {
      wardrobeAt = { x: x + w - MARGIN - wd.w / 2, z: z + d - MARGIN - wd.d / 2, rot: 180 }
    }
    if (wardrobeAt) this.place('wardrobe', wardrobeAt.x, wardrobeAt.z, wardrobeAt.rot)

    // Nightstand on whichever side of the bed still has room for it.
    const ns = this.size('nightstand')
    const nsZ = z + MARGIN + ns.d / 2
    const rightFree = wardrobeAt?.rot === -90 ? sideFront - ACCESS - GAP : x + w - MARGIN
    if (rightFree - bedRight >= ns.w + GAP) {
      this.place('nightstand', bedRight + GAP + ns.w / 2, nsZ)
    } else if (bedX - bed.w / 2 - GAP - ns.w > x + DOOR_CLEAR - ns.w) {
      // fall back to the door side, which is fine for something knee-high
      this.place('nightstand', bedX - bed.w / 2 - GAP - ns.w / 2, nsZ)
    }
  }

  bathroomSet(x: number, z: number, w: number, d: number) {
    // bathroom doors slide (see the door calls), so unlike a bedroom there is no
    // swing to keep clear and the full width is usable
    const left = x + MARGIN
    const sh = this.size('shower')
    const wc = this.size('toilet')
    const bs = this.size('bathroom-sink')

    // shower in the far corner, opening back towards the door
    const showerX = x + w - MARGIN - sh.w / 2
    const showerZ = z + d - MARGIN - sh.d / 2
    const hasShower = w - 2 * MARGIN >= sh.w && d >= sh.d + ACCESS + MARGIN
    if (hasShower) this.place('shower', showerX, showerZ, 180)

    // toilet along the near wall, clear of the shower's footprint
    const wcRight = hasShower ? showerX - sh.w / 2 - GAP : x + w - MARGIN
    const wcX = wcRight - wc.w / 2
    if (wcX - wc.w / 2 > left) this.place('toilet', wcX, z + MARGIN + wc.d / 2)

    // basin further along the same wall, clear of the toilet's standing room
    const bsX = wcX - wc.w / 2 - GAP - bs.w / 2
    if (bsX - bs.w / 2 > left) this.place('bathroom-sink', bsX, z + MARGIN + bs.d / 2)
  }

  kitchenRun(x: number, z: number, w: number, d?: number) {
    // step by each carcass's own width — a fixed step buried the wider sink unit
    // in its neighbours
    let cx = x + MARGIN
    const leftover: string[] = []
    for (const id of ['base-cabinet', 'kitchen-sink', 'base-cabinet', 'stove', 'fridge']) {
      const e = this.size(id)
      if (cx + e.w > x + w - MARGIN) {
        leftover.push(id)
        continue
      }
      this.place(id, cx + e.w / 2, z + MARGIN + e.d / 2)
      cx += e.w + GAP
    }
    // a galley kitchen has a second wall; anything that didn't fit goes there,
    // facing back across the walkway
    if (!d) return
    const backRow = z + d - MARGIN
    const firstRow = z + MARGIN + 0.7 // deepest carcass in the run
    let bx = x + MARGIN
    for (const id of leftover) {
      const e = this.size(id)
      if (bx + e.w > x + w - MARGIN) break
      if (backRow - e.d - firstRow < ACCESS) break // no walkway left between rows
      this.place(id, bx + e.w / 2, backRow - e.d / 2, 180)
      bx += e.w + GAP
    }
  }

  build(): Project {
    this.p.updatedAt = 0
    return this.p
  }
}

// layout constants, metres
const MARGIN = 0.08 // gap from a wall face, so nothing reads as sunk into it
const GAP = 0.04 // between neighbouring carcasses
const ACCESS = 0.7 // standing room in front of a tall unit
const DOOR_CLEAR = 1.0 // strip left empty along the door wall for the swing

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
  b.doorAt(spine, vx, 3.5, 0.9, 'left', 'sliding') // bath doors slide in HDB flats
  b.doorAt(spine, vx, 6.2) // to bedroom
  b.windowAt(b.left, 0, 4, 1.8)
  b.windowAt(b.right, W, 6.2)

  // living/dining
  b.place('sofa-3', 1.8, 6.6, 0)
  b.place('coffee-table', 1.8, 5.4)
  b.place('tv-console', 1.8, 0.5, 180)
  b.place('tv-55', 1.8, 0.5, 180, 0.5) // stood on the console
  b.place('rug', 1.8, 5.6)
  b.place('dining-table', 2.6, 2.6)
  b.place('chair', 2.6, 1.9)
  b.place('chair', 2.6, 3.3, 180)
  b.kitchenRun(vx, 0, W - vx, 2.6)
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
  b.doorAt(spine, vx, 3.6, 0.9, 'left', 'sliding')
  b.doorAt(spine, vx, 5.6)
  b.doorAt(spine, vx, 8.3)
  b.windowAt(b.left, 0, 5, 1.8)
  b.windowAt(b.right, W, 5.6)
  b.windowAt(b.right, W, 8.3)

  b.place('sectional-sofa', 1.9, 7.0, 0)
  b.place('coffee-table', 1.9, 5.6)
  b.place('tv-console', 1.9, 0.5, 180)
  b.place('tv-55', 1.9, 0.5, 180, 0.5) // stood on the console
  b.place('rug', 1.9, 5.8)
  b.place('dining-table', 3.2, 2.8)
  b.place('chair', 3.2, 2.1)
  b.place('chair', 3.2, 3.5, 180)
  b.kitchenRun(vx, 0, W - vx, 2.8)
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
  b.doorAt(spine, vx, 3.9, 0.9, 'left', 'sliding')
  b.doorAt(spine, vx, 6.0)
  b.doorAt(spine, vx, 9.1)
  b.windowAt(b.left, 0, 5.5, 2.0)
  b.windowAt(b.right, W, 6.0)
  b.windowAt(b.right, W, 9.1)

  b.place('sectional-sofa', 2.2, 7.6, 0)
  b.place('coffee-table', 2.2, 6.0)
  b.place('tv-console', 2.2, 0.5, 180)
  b.place('tv-55', 2.2, 0.5, 180, 0.5) // stood on the console
  b.place('rug', 2.2, 6.2)
  b.place('dining-table', 3.8, 3.0)
  b.place('chair', 3.8, 2.2)
  b.place('chair', 3.8, 3.8, 180)
  b.place('bookshelf', 0.5, 1.0, 90)
  b.kitchenRun(vx, 0, W - vx, 3.0)
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
