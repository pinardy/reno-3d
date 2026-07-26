import { describe, it, expect } from 'vitest'
import {
  CATALOG,
  CATEGORIES,
  catalogById,
  catalogPrice,
  newItemFromCatalog,
} from '../features/catalog/catalog'

// Kinds the 3D renderer (FurnitureModel) has a case for. If a new catalog kind
// is added without a render case, this test fails.
const HANDLED = new Set([
  'sofa', 'bed', 'table', 'chair', 'wardrobe', 'rug', 'lamp', 'cabinet',
  'shelf', 'stool', 'tv', 'toilet', 'sink', 'bathtub', 'pendant',
  'piano', 'vase', 'plant', 'picture', 'appliance', 'hood', 'shower', 'toiletries',
  'curtain', 'shelter', 'gate', 'glb',
])

describe('catalog', () => {
  it('every catalog kind is renderable', () => {
    for (const c of CATALOG) expect(HANDLED.has(c.kind), `${c.id} (${c.kind})`).toBe(true)
  })
  it('all sizes are positive', () => {
    for (const c of CATALOG) {
      expect(c.size.w).toBeGreaterThan(0)
      expect(c.size.d).toBeGreaterThan(0)
      expect(c.size.h).toBeGreaterThan(0)
    }
  })
  it('ids are unique', () => {
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length)
  })
  it('prices are non-negative numbers', () => {
    for (const c of CATALOG) expect(catalogPrice(c)).toBeGreaterThanOrEqual(0)
  })
  it('the corner cabinet is an L-shape with a leg length', () => {
    const corner = catalogById('corner-cabinet')!
    expect(corner.kind).toBe('cabinet')
    expect(corner.params?.corner).toBe(true)
    expect(typeof corner.params?.legLen).toBe('number')
  })
  // Cabinets are the one kind whose renderer reads its dimensions from params
  // rather than size, while collision and wall-snapping still use size. If the
  // two disagree the model and its footprint quietly drift apart.
  it('cabinet params match their declared size', () => {
    for (const c of CATALOG.filter((e) => e.kind === 'cabinet')) {
      const p = c.params ?? {}
      if (typeof p.width === 'number') expect(p.width, c.id).toBeCloseTo(c.size.w)
      if (typeof p.depth === 'number') expect(p.depth, c.id).toBeCloseTo(c.size.d)
      if (typeof p.height === 'number') expect(p.height, c.id).toBeCloseTo(c.size.h)
    }
  })
  it('drawer fronts are only asked for on cabinets', () => {
    for (const c of CATALOG) {
      if (c.params?.drawers !== undefined) {
        expect(c.kind, c.id).toBe('cabinet')
        expect(Number(c.params.drawers), c.id).toBeGreaterThan(0)
      }
    }
  })
  it('every entry sits in a listed category, and no category is empty', () => {
    for (const c of CATALOG) expect(CATEGORIES, c.id).toContain(c.category)
    for (const cat of CATEGORIES)
      expect(CATALOG.some((c) => c.category === cat), cat).toBe(true)
  })
  it('lifted items are lifted by a sane amount', () => {
    for (const c of CATALOG) {
      if (c.baseY === undefined) continue
      expect(c.baseY, c.id).toBeGreaterThanOrEqual(0)
      expect(c.baseY, c.id).toBeLessThan(2.4) // below a standard ceiling
    }
  })
  it('newItemFromCatalog copies material + position and lifts pendants', () => {
    const it = newItemFromCatalog(CATALOG[0], { x: 1, z: 2 })
    expect(it.position).toEqual({ x: 1, z: 2 })
    expect(it.material.color).toBe(CATALOG[0].material.color)
    expect(newItemFromCatalog(catalogById('pendant-light')!, { x: 0, z: 0 }).y).toBeGreaterThan(1)
  })
})
