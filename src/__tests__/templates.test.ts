import { describe, it, expect } from 'vitest'
import { TEMPLATES } from '../features/sample/templates'
import { catalogById } from '../features/catalog/catalog'
import { shoppingList, furnitureTotal } from '../features/persistence/shoppingList'
import { migrateProject } from '../features/persistence/io'
import { findIssues } from '../features/checks/clearance'
import { makeSampleProject } from '../features/sample/sample'
import type { Project } from '../types/project'

describe('HDB templates', () => {
  for (const t of TEMPLATES) {
    it(`${t.name} builds a coherent project`, () => {
      const p = t.make()
      expect(p.walls.length).toBeGreaterThanOrEqual(5)
      expect(p.rooms.length).toBeGreaterThanOrEqual(4)
      expect(p.openings.some((o) => o.type === 'door')).toBe(true)
      expect(p.items.every((i) => !!catalogById(i.catalogId))).toBe(true)
      expect(p.walls.some((w) => w.structural)).toBe(true) // perimeter marked structural
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

// The templates and sample are the first thing a new user sees, so they should
// pass the same layout checks the app runs on their own work — otherwise the
// checker looks broken on arrival.
describe('shipped layouts pass their own checks', () => {
  const all: [string, () => Project][] = [
    ['sample', makeSampleProject],
    ...TEMPLATES.map((t) => [t.name, t.make] as [string, () => Project]),
  ]

  for (const [name, make] of all) {
    it(`${name} has no clearance issues`, () => {
      const issues = findIssues(make())
      expect(issues.map((i) => i.message), name).toEqual([])
    })
  }

  it('every layout is actually furnished', () => {
    for (const [name, make] of all) {
      const p = make()
      expect(p.items.length, name).toBeGreaterThanOrEqual(7)
      const kinds = new Set(p.items.map((i) => i.kind))
      for (const k of ['bed', 'sofa']) expect(kinds.has(k as never), `${name}: ${k}`).toBe(true)
    }
  })

  // The sample is a 2-room flat with no bathroom, so fixtures are a template-only
  // expectation. Skipping a piece is how the layout stays clearance-clean, and it
  // would be easy to skip so much that a template arrives half empty.
  it('templates keep their kitchen and bathroom fittings', () => {
    for (const t of TEMPLATES) {
      const kinds = new Set(t.make().items.map((i) => i.kind))
      for (const k of ['toilet', 'sink', 'shower', 'cabinet', 'wardrobe'])
        expect(kinds.has(k as never), `${t.name}: ${k}`).toBe(true)
    }
  })
})
