import type { Item, Project } from '../../types/project'
import { catalogById, catalogPrice } from '../catalog/catalog'
import { pointInPolygon } from '../../geometry/vec'

export interface LineItem {
  name: string
  qty: number
  unit: number // S$
  subtotal: number // S$
}

// Group a project's furniture into a priced shopping list (by catalog item).
export function shoppingList(project: Project): LineItem[] {
  const map = new Map<string, LineItem>()
  for (const it of project.items) {
    const entry = catalogById(it.catalogId)
    const name = entry?.name ?? it.name ?? 'Custom model'
    const unit = entry ? catalogPrice(entry) : 0
    const cur = map.get(it.catalogId)
    if (cur) {
      cur.qty += 1
      cur.subtotal = cur.qty * cur.unit
    } else {
      map.set(it.catalogId, { name, qty: 1, unit, subtotal: unit })
    }
  }
  return [...map.values()].sort((a, b) => b.subtotal - a.subtotal)
}

export function furnitureTotal(project: Project): number {
  return shoppingList(project).reduce((s, l) => s + l.subtotal, 0)
}

export const UNPLACED = 'Elsewhere'

/** Which room an item stands in, by its floor position. */
export function roomOf(project: Project, item: Item): string {
  const room = project.rooms.find(
    (r) => r.loop.length >= 3 && pointInPolygon(item.position, r.loop),
  )
  return room?.name || UNPLACED
}

export interface RoomGroup {
  room: string
  lines: LineItem[]
  total: number
}

/**
 * The same list broken down by room, which is how you actually buy and budget —
 * one room at a time. Items outside every room floor collect under "Elsewhere".
 */
export function shoppingListByRoom(project: Project): RoomGroup[] {
  const byRoom = new Map<string, Item[]>()
  for (const it of project.items) {
    const room = roomOf(project, it)
    byRoom.set(room, [...(byRoom.get(room) ?? []), it])
  }
  const groups = [...byRoom.entries()].map(([room, items]) => {
    const lines = shoppingList({ ...project, items })
    return { room, lines, total: lines.reduce((s, l) => s + l.subtotal, 0) }
  })
  // biggest spend first, but keep the catch-all group last
  return groups.sort((a, b) =>
    a.room === UNPLACED ? 1 : b.room === UNPLACED ? -1 : b.total - a.total,
  )
}

export function exportShoppingListCSV(project: Project) {
  const groups = shoppingListByRoom(project)
  const rows: (string | number)[][] = [
    ['Room', 'Item', 'Qty', 'Unit (S$)', 'Subtotal (S$)'],
    ...groups.flatMap((g) => [
      ...g.lines.map((l) => [g.room, l.name, l.qty, l.unit, l.subtotal]),
      [g.room, 'Room subtotal', '', '', g.total],
    ]),
    ['', 'Total', '', '', furnitureTotal(project)],
  ]
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/[^\w-]+/g, '_') || 'home'}-shopping-list.csv`
  a.click()
  URL.revokeObjectURL(url)
}
