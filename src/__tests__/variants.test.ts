import { describe, it, expect } from 'vitest'
import {
  METRIC_ROWS,
  baseName,
  bestIds,
  familyRoot,
  nextVariantName,
  sameFamily,
  variantMetrics,
} from '../features/variants/variants'
import { TEMPLATES } from '../features/sample/templates'
import { makeSampleProject } from '../features/sample/sample'
import { migrateProject } from '../features/persistence/io'
import type { Project } from '../types/project'

describe('variant families', () => {
  it('roots a plain project at itself', () => {
    expect(familyRoot({ id: 'a' })).toBe('a')
  })

  it('roots a variant at what it points to', () => {
    expect(familyRoot({ id: 'b', variantOf: 'a' })).toBe('a')
  })

  it('keeps a family flat — a variant of a variant shares the same root', () => {
    const root = { id: 'a' }
    const b = { id: 'b', variantOf: familyRoot(root) }
    const c = { id: 'c', variantOf: familyRoot(b) }
    expect(c.variantOf).toBe('a')
    expect(sameFamily(b, c)).toBe(true)
    expect(sameFamily(root, c)).toBe(true)
  })

  it('keeps unrelated projects apart', () => {
    expect(sameFamily({ id: 'a' }, { id: 'x' })).toBe(false)
    expect(sameFamily({ id: 'b', variantOf: 'a' }, { id: 'y', variantOf: 'x' })).toBe(false)
  })
})

describe('variant naming', () => {
  it('starts at B, because the original is A', () => {
    expect(nextVariantName('My Flat', ['My Flat'])).toBe('My Flat — Variant B')
  })

  it('does not nest suffixes when branching off a variant', () => {
    expect(baseName('My Flat — Variant B')).toBe('My Flat')
    const next = nextVariantName('My Flat — Variant B', ['My Flat', 'My Flat — Variant B'])
    expect(next).toBe('My Flat — Variant C')
  })

  it('skips letters already taken, whatever order they were made in', () => {
    const taken = ['My Flat', 'My Flat — Variant C', 'My Flat — Variant B']
    expect(nextVariantName('My Flat', taken)).toBe('My Flat — Variant D')
  })

  it('handles a hyphen as well as an em dash', () => {
    expect(baseName('My Flat - Variant B')).toBe('My Flat')
  })

  it('falls back to a number once the alphabet runs out', () => {
    const taken = ['Flat', ...'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => `Flat — Variant ${l}`)]
    expect(nextVariantName('Flat', taken)).toMatch(/Variant \d+$/)
  })

  it('never produces an empty base name', () => {
    expect(baseName('— Variant B')).toBe('Untitled Home')
  })
})

describe('variant metrics', () => {
  const rate = 1500

  it('measures a furnished project on every row', () => {
    const m = variantMetrics(makeSampleProject(), rate)
    expect(m.floorArea).toBeGreaterThan(0)
    expect(m.renoEstimate).toBeCloseTo(m.floorArea * rate, 5)
    expect(m.furniture).toBeGreaterThan(0)
    expect(m.items).toBeGreaterThan(0)
    expect(m.rooms).toBeGreaterThan(0)
    expect(m.paintArea).toBeGreaterThan(0)
    expect(m.floorTileArea).toBeGreaterThan(0)
    // no aircon in the sample, so those read zero rather than undefined
    expect(m.fanCoils).toBe(0)
    expect(m.installedBtu).toBe(0)
    expect(m.trunking).toBe(0)
  })

  it('gives every row a finite number for every shipped template', () => {
    for (const t of TEMPLATES) {
      const m = variantMetrics(t.make(), rate)
      for (const row of METRIC_ROWS) {
        const v = Number(m[row.key])
        expect(Number.isFinite(v), `${t.name} / ${row.label}`).toBe(true)
        expect(v, `${t.name} / ${row.label}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('scales the reno estimate with the rate', () => {
    const p = TEMPLATES[0].make()
    expect(variantMetrics(p, 2000).renoEstimate).toBeGreaterThan(
      variantMetrics(p, 1000).renoEstimate,
    )
  })

  it('separates a bigger flat from a smaller one', () => {
    const two = variantMetrics(TEMPLATES[0].make(), rate) // 2-room Flexi
    const five = variantMetrics(TEMPLATES[4].make(), rate) // 5-room
    expect(five.floorArea).toBeGreaterThan(two.floorArea)
    expect(five.renoEstimate).toBeGreaterThan(two.renoEstimate)
    expect(five.rooms).toBeGreaterThan(two.rooms)
  })
})

describe('highlighting the better value', () => {
  const rows = [
    { id: 'a', renoEstimate: 50000, warnings: 3, floorArea: 90 },
    { id: 'b', renoEstimate: 40000, warnings: 1, floorArea: 90 },
  ] as unknown as ReturnType<typeof variantMetrics>[]

  const rowFor = (key: string) => METRIC_ROWS.find((r) => r.key === key)!

  it('prefers the lower cost and the fewer warnings', () => {
    expect([...bestIds(rows, rowFor('renoEstimate'))]).toEqual(['b'])
    expect([...bestIds(rows, rowFor('warnings'))]).toEqual(['b'])
  })

  it('highlights nothing for a row with no preferred direction', () => {
    expect(bestIds(rows, rowFor('floorArea')).size).toBe(0)
  })

  it('highlights nothing when every variant matches', () => {
    const same = [
      { id: 'a', renoEstimate: 50000 },
      { id: 'b', renoEstimate: 50000 },
    ] as unknown as ReturnType<typeof variantMetrics>[]
    expect(bestIds(same, rowFor('renoEstimate')).size).toBe(0)
  })

  it('highlights every variant that ties for the best value', () => {
    const three = [
      { id: 'a', warnings: 1 },
      { id: 'b', warnings: 1 },
      { id: 'c', warnings: 5 },
    ] as unknown as ReturnType<typeof variantMetrics>[]
    expect([...bestIds(three, rowFor('warnings'))].sort()).toEqual(['a', 'b'])
  })

  it('highlights nothing when there is only one variant', () => {
    expect(bestIds([rows[0]], rowFor('renoEstimate')).size).toBe(0)
  })
})

describe('variant persistence', () => {
  it('carries variantOf through a save/load round trip', () => {
    const p: Partial<Project> = { id: 'b', name: 'Flat — Variant B', variantOf: 'a' }
    expect(migrateProject(p).variantOf).toBe('a')
  })

  it('leaves a non-variant project without the field', () => {
    expect(migrateProject({ id: 'a', name: 'Flat' }).variantOf).toBeUndefined()
  })
})
