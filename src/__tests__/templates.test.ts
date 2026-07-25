import { describe, it, expect } from 'vitest'
import { TEMPLATES } from '../features/sample/templates'
import { catalogById } from '../features/catalog/catalog'
import { shoppingList, furnitureTotal } from '../features/persistence/shoppingList'
import { migrateProject } from '../features/persistence/io'

describe('HDB templates', () => {
  for (const t of TEMPLATES) {
    it(`${t.name} builds a coherent project`, () => {
      const p = t.make()
      expect(p.walls.length).toBeGreaterThanOrEqual(5)
      expect(p.rooms.length).toBeGreaterThanOrEqual(4)
      expect(p.openings.some((o) => o.type === 'door')).toBe(true)
      expect(p.items.every((i) => !!catalogById(i.catalogId))).toBe(true)
    })
  }
})

describe('shopping list', () => {
  it('groups items and totals correctly', () => {
    const p = TEMPLATES[0].make()
    const list = shoppingList(p)
    expect(list.length).toBeGreaterThan(0)
    expect(list.length).toBeLessThanOrEqual(p.items.length)
    expect(list.reduce((s, l) => s + l.qty, 0)).toBe(p.items.length)
    expect(furnitureTotal(p)).toBe(list.reduce((s, l) => s + l.subtotal, 0))
    expect(furnitureTotal(p)).toBeGreaterThan(0)
  })
})

describe('project migration', () => {
  it('fills defaults for a partial project', () => {
    const m = migrateProject({ name: 'x' })
    expect(m.walls).toEqual([])
    expect(m.rooms).toEqual([])
    expect(m.wallHeight).toBeGreaterThan(0)
    expect(m.floorPlan).toBeDefined()
  })
})
