import type { Project } from '../../types/project'
import { polygonArea } from '../../geometry/vec'
import { renderFloorPlan } from './floorplanExport'
import { shoppingList, furnitureTotal } from './shoppingList'
import { captureScene } from '../scene/screenshot'

const RATE_KEY = 'reno:costRatePerM2'

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

// Opens a printable spec sheet (plan + 3D render + areas + shopping list) in a
// new window and triggers the print dialog (where the user can "Save as PDF").
export function openSpecSheet(project: Project) {
  const plan = renderFloorPlan(project)
  const render = captureScene() // null if not in 3D view
  const rate = Number(localStorage.getItem(RATE_KEY)) || 1500

  const areas = project.rooms.map((r) => ({ name: r.name, area: Math.abs(polygonArea(r.loop)) }))
  const totalArea = areas.reduce((s, a) => s + a.area, 0)
  const list = shoppingList(project)
  const furniture = furnitureTotal(project)
  const reno = Math.round(totalArea * rate)

  const date = new Date().toLocaleDateString()

  const areaRows = areas
    .map((a) => `<tr><td>${esc(a.name)}</td><td class="num">${a.area.toFixed(1)} m²</td></tr>`)
    .join('')
  const listRows = list
    .map(
      (l) =>
        `<tr><td>${esc(l.name)}</td><td class="num">${l.qty}</td><td class="num">S$${l.unit.toLocaleString()}</td><td class="num">S$${l.subtotal.toLocaleString()}</td></tr>`,
    )
    .join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(project.name)} — Spec Sheet</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; color: #1b2431; margin: 24px; }
  h1 { font-size: 22px; margin: 0; }
  .sub { color: #5b6472; font-size: 12px; margin-bottom: 16px; }
  .imgs { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
  .imgs figure { margin: 0; flex: 1 1 340px; }
  .imgs img { width: 100%; border: 1px solid #d7dae0; border-radius: 8px; }
  figcaption { font-size: 11px; color: #5b6472; margin-top: 4px; }
  h2 { font-size: 14px; border-bottom: 2px solid #1b2431; padding-bottom: 4px; margin: 20px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
  th { color: #5b6472; font-weight: 600; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { display: flex; gap: 24px; margin-top: 10px; font-size: 13px; }
  .totals b { font-size: 16px; }
  @media print { body { margin: 0; } }
</style></head><body onload="setTimeout(function(){window.print()},400)">
  <h1>${esc(project.name)}</h1>
  <div class="sub">Reno 3D spec sheet · ${date} · ${project.rooms.length} rooms · ${totalArea.toFixed(1)} m²</div>
  <div class="imgs">
    <figure><img src="${plan}"><figcaption>Floor plan</figcaption></figure>
    ${render ? `<figure><img src="${render}"><figcaption>3D render</figcaption></figure>` : ''}
  </div>

  <h2>Rooms</h2>
  <table><tbody>${areaRows || '<tr><td>No rooms defined</td><td></td></tr>'}
    <tr><td><b>Total floor area</b></td><td class="num"><b>${totalArea.toFixed(1)} m²</b></td></tr>
  </tbody></table>

  <h2>Furniture shopping list</h2>
  <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Subtotal</th></tr></thead>
  <tbody>${listRows || '<tr><td>No furniture added</td><td></td><td></td><td></td></tr>'}
    <tr><td colspan="3"><b>Furniture total</b></td><td class="num"><b>S$${furniture.toLocaleString()}</b></td></tr>
  </tbody></table>

  <div class="totals">
    <div>Rough renovation estimate<br><b>S$${reno.toLocaleString()}</b> <span style="color:#5b6472">(${totalArea.toFixed(1)} m² × S$${rate}/m²)</span></div>
    <div>Furniture<br><b>S$${furniture.toLocaleString()}</b></div>
  </div>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    alert('Please allow pop-ups to generate the spec sheet.')
    return
  }
  w.document.write(html)
  w.document.close()
}
