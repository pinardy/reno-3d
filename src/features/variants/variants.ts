import type { Project } from '../../types/project'
import { polygonArea } from '../../geometry/vec'
import { findIssues } from '../checks/clearance'
import { furnitureTotal } from '../persistence/shoppingList'
import { elevationRuns } from '../elevation/elevation'
import { btuOf, fanCoils, condensers, totalTrunkingLength, airconPlan } from '../aircon/aircon'
import { takeoff } from '../takeoff/takeoff'

// Comparing layouts. People rarely settle a floor plan in one go — they keep two
// or three arrangements around and argue about them — and the argument is usually
// about numbers nobody has to hand: which one costs more, which one wastes less
// space, which one has the checks complaining. A variant family is those layouts
// grouped so the numbers can sit next to each other.

/** The root of a variant family: a project's `variantOf`, or its own id. */
export function familyRoot(p: Pick<Project, 'id' | 'variantOf'>): string {
  return p.variantOf ?? p.id
}

export function sameFamily(
  a: Pick<Project, 'id' | 'variantOf'>,
  b: Pick<Project, 'id' | 'variantOf'>,
): boolean {
  return familyRoot(a) === familyRoot(b)
}

// The leading separator is optional so a name that is *only* a suffix still
// strips to nothing and picks up the fallback below.
const VARIANT_SUFFIX = /(?:^|\s*)[—-]\s+Variant\s+(\S+)$/i
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** The name without any "— Variant X" suffix, so variants don't nest their names. */
export function baseName(name: string): string {
  return name.replace(VARIANT_SUFFIX, '').trim() || 'Untitled Home'
}

/**
 * Next free variant name in a family. The original counts as A even though it
 * isn't labelled, so the first variant you make is B — which is what people
 * already say out loud when comparing two options.
 */
export function nextVariantName(sourceName: string, taken: string[]): string {
  const base = baseName(sourceName)
  const used = new Set(
    taken.map((n) => n.match(VARIANT_SUFFIX)?.[1]?.toUpperCase()).filter(Boolean) as string[],
  )
  for (const letter of LETTERS.slice(1)) {
    if (!used.has(letter)) return `${base} — Variant ${letter}`
  }
  return `${base} — Variant ${taken.length + 1}`
}

export interface VariantMetrics {
  id: string
  name: string
  updatedAt: number
  rooms: number
  items: number
  floorArea: number
  /** Floor area × the user's S$/m² rate. */
  renoEstimate: number
  furniture: number
  /** Metres of carpentry carcass, base + wall units. */
  carpentryRun: number
  fanCoils: number
  installedBtu: number
  trunking: number
  /** Layout check count — fewer is better. */
  warnings: number
  paintArea: number
  floorTileArea: number
}

export function variantMetrics(p: Project, ratePerM2: number): VariantMetrics {
  const floorArea = p.rooms.reduce((s, r) => s + Math.abs(polygonArea(r.loop)), 0)
  const t = takeoff(p)
  const coils = fanCoils(p)
  return {
    id: p.id,
    name: p.name,
    updatedAt: p.updatedAt,
    rooms: p.rooms.length,
    items: p.items.length,
    floorArea,
    renoEstimate: floorArea * ratePerM2,
    furniture: furnitureTotal(p),
    carpentryRun: elevationRuns(p).reduce((s, r) => s + r.carpentryRun, 0),
    fanCoils: coils.length,
    installedBtu: coils.reduce((s, c) => s + btuOf(c), 0),
    trunking: totalTrunkingLength(airconPlan(p)),
    warnings: findIssues(p).length,
    paintArea: t.paintWallArea + t.ceilingArea,
    floorTileArea: t.floorArea,
  }
}

/** Whether a condenser is present at all, for the aircon row's footnote. */
export function hasCondenser(p: Project): boolean {
  return condensers(p).length > 0
}

export type Direction = 'lower' | 'higher' | 'none'

export interface MetricRow {
  key: keyof VariantMetrics
  label: string
  /** Which way is preferable, for highlighting. 'none' means it's just context. */
  better: Direction
  format: (v: number) => string
}

const sgd = (v: number) => `S$${Math.round(v).toLocaleString('en-SG')}`
const m2 = (v: number) => `${v.toFixed(1)} m²`
const m = (v: number) => `${v.toFixed(1)} m`
const int = (v: number) => String(Math.round(v))

/**
 * Rows are ordered the way the decision actually gets made: how big is it, what
 * does it cost, then what's wrong with it.
 */
export const METRIC_ROWS: MetricRow[] = [
  { key: 'floorArea', label: 'Floor area', better: 'none', format: m2 },
  { key: 'rooms', label: 'Rooms', better: 'none', format: int },
  { key: 'renoEstimate', label: 'Reno estimate', better: 'lower', format: sgd },
  { key: 'furniture', label: 'Furniture', better: 'lower', format: sgd },
  { key: 'carpentryRun', label: 'Carpentry run', better: 'lower', format: m },
  { key: 'paintArea', label: 'Paint area', better: 'lower', format: m2 },
  { key: 'floorTileArea', label: 'Floor tile', better: 'lower', format: m2 },
  { key: 'installedBtu', label: 'Aircon installed', better: 'none', format: (v) => `${v.toLocaleString('en-SG')} BTU` },
  { key: 'trunking', label: 'Trunking', better: 'lower', format: m },
  { key: 'items', label: 'Furniture pieces', better: 'none', format: int },
  { key: 'warnings', label: 'Layout warnings', better: 'lower', format: int },
]

/**
 * Which variants hold the preferred value for a row. Returns every id that ties,
 * and none at all when they all match — highlighting a "winner" that every column
 * shares would just be noise.
 */
export function bestIds(rows: VariantMetrics[], row: MetricRow): Set<string> {
  if (row.better === 'none' || rows.length < 2) return new Set()
  const values = rows.map((r) => Number(r[row.key]))
  const target = row.better === 'lower' ? Math.min(...values) : Math.max(...values)
  if (values.every((v) => v === target)) return new Set()
  return new Set(rows.filter((r) => Number(r[row.key]) === target).map((r) => r.id))
}
