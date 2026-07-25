import type { Project } from '../../types/project'
import { catalogById, catalogPrice } from '../catalog/catalog'

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

export function exportShoppingListCSV(project: Project) {
  const lines = shoppingList(project)
  const rows: (string | number)[][] = [
    ['Item', 'Qty', 'Unit (S$)', 'Subtotal (S$)'],
    ...lines.map((l) => [l.name, l.qty, l.unit, l.subtotal]),
    ['Total', '', '', furnitureTotal(project)],
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
