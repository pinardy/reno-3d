import { describe, it, expect } from 'vitest'
import { CATALOG, catalogById, catalogPrice, newItemFromCatalog } from '../features/catalog/catalog'

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
  it('newItemFromCatalog copies material + position and lifts pendants', () => {
    const it = newItemFromCatalog(CATALOG[0], { x: 1, z: 2 })
    expect(it.position).toEqual({ x: 1, z: 2 })
    expect(it.material.color).toBe(CATALOG[0].material.color)
    expect(newItemFromCatalog(catalogById('pendant-light')!, { x: 0, z: 0 }).y).toBeGreaterThan(1)
  })
})
