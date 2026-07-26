import type { Project, Vec2 } from '../../types/project'
import { dist, polygonArea, polygonCentroid } from '../../geometry/vec'
import { num } from '../../lib/params'
import { catalogById } from '../catalog/catalog'
import { roomBBoxSize } from '../trace/rooms'
import { AIRCON_KINDS, totalTrunkingLength } from '../aircon/aircon'

// Render a clean top-down floor plan of the finished design to a PNG and
// download it: walls, door/window symbols, room labels + areas, furniture
// footprints, overall dimensions, and a title block with a scale bar.

interface Bounds {
  minX: number
  minZ: number
  maxX: number
  maxZ: number
}

function computeBounds(p: Project): Bounds {
  const pts: Vec2[] = []
  for (const w of p.walls) pts.push(w.a, w.b)
  for (const r of p.rooms) pts.push(...r.loop)
  for (const it of p.items) pts.push(it.position)
  if (pts.length === 0) return { minX: 0, minZ: 0, maxX: 8, maxZ: 6 }
  return {
    minX: Math.min(...pts.map((q) => q.x)),
    minZ: Math.min(...pts.map((q) => q.z)),
    maxX: Math.max(...pts.map((q) => q.x)),
    maxZ: Math.max(...pts.map((q) => q.z)),
  }
}

export function exportFloorPlanPNG(project: Project) {
  const dataUrl = renderFloorPlan(project)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${project.name.replace(/[^\w-]+/g, '_') || 'home'}-floorplan.png`
  a.click()
}

export function renderFloorPlan(p: Project): string {
  const b = computeBounds(p)
  const worldW = Math.max(1, b.maxX - b.minX)
  const worldD = Math.max(1, b.maxZ - b.minZ)

  // scale so the longest side is ~1400px, clamped to a sane px/m range
  const scale = Math.max(30, Math.min(160, 1400 / Math.max(worldW, worldD)))
  const margin = 90 // room for dimension lines
  const titleH = 90
  const W = Math.round(worldW * scale + margin * 2)
  const H = Math.round(worldD * scale + margin * 2 + titleH)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // world (metres) -> canvas px
  const X = (x: number) => margin + (x - b.minX) * scale
  const Y = (z: number) => margin + (z - b.minZ) * scale

  // background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // --- room fills + labels ---
  for (const room of p.rooms) {
    if (room.loop.length < 3) continue
    ctx.beginPath()
    room.loop.forEach((pt, i) => {
      const px = X(pt.x)
      const py = Y(pt.z)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.fillStyle = '#eef2f7'
    ctx.fill()
  }

  // --- furniture footprints ---
  for (const it of p.items) {
    const entry = catalogById(it.catalogId)
    if (!entry) continue
    const isCab = entry.kind === 'cabinet'
    const w = (isCab ? num(it.params?.width, entry.size.w) : entry.size.w) * it.scale
    const d = (isCab ? num(it.params?.depth, entry.size.d) : entry.size.d) * it.scale
    const isCorner = isCab && it.params?.corner === true
    const legLen = num(it.params?.legLen, 1.0) * it.scale
    const cx = X(it.position.x)
    const cy = Y(it.position.z)
    // Aircon hardware reads as its own layer, to match the trunking runs.
    const isAircon = AIRCON_KINDS.has(entry.kind)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-it.rotationY)
    ctx.fillStyle = isAircon ? 'rgba(20,160,180,0.22)' : 'rgba(120,140,170,0.18)'
    ctx.strokeStyle = isAircon ? '#0e8a9c' : '#7a8aa3'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.rect((-w / 2) * scale, (-d / 2) * scale, w * scale, d * scale)
    if (isCorner) {
      // return leg: matches the 3D construction (back-left, running along -z)
      ctx.rect((-w / 2) * scale, (-d / 2) * scale, d * scale, legLen * scale)
    }
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    // label if there's room
    if (Math.min(w, d) * scale > 34) {
      ctx.fillStyle = '#5b6472'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(entry.name, cx, cy)
    }
  }

  // --- walls (draw as thick strokes) ---
  for (const wall of p.walls) {
    const th = Math.max(4, wall.thickness * scale)
    ctx.strokeStyle = '#20242c'
    ctx.lineWidth = th
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.moveTo(X(wall.a.x), Y(wall.a.z))
    ctx.lineTo(X(wall.b.x), Y(wall.b.z))
    ctx.stroke()
  }

  // --- openings (erase gap + symbol) ---
  for (const op of p.openings) {
    const wall = p.walls.find((w) => w.id === op.wallId)
    if (!wall) continue
    const L = dist(wall.a, wall.b)
    if (L === 0) continue
    const th = Math.max(4, wall.thickness * scale)
    const ux = (wall.b.x - wall.a.x) / L
    const uz = (wall.b.z - wall.a.z) / L
    const s = op.offset - op.width / 2
    const e = op.offset + op.width / 2
    const ax = X(wall.a.x + ux * s)
    const ay = Y(wall.a.z + uz * s)
    const bx = X(wall.a.x + ux * e)
    const by = Y(wall.a.z + uz * e)
    // erase the wall in the opening
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = th + 2
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
    // jamb ticks
    ctx.strokeStyle = '#20242c'
    ctx.lineWidth = 1.5
    const nx = -uz
    const nz = ux
    const half = th / 2
    for (const [jx, jy] of [
      [ax, ay],
      [bx, by],
    ]) {
      ctx.beginPath()
      ctx.moveTo(jx + nx * half, jy + nz * half)
      ctx.lineTo(jx - nx * half, jy - nz * half)
      ctx.stroke()
    }
    if (op.type === 'door') {
      // swing arc + leaf from the first jamb
      const wpx = op.width * scale
      ctx.strokeStyle = '#3a86ff'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      const a0 = Math.atan2(by - ay, bx - ax)
      ctx.arc(ax, ay, wpx, a0, a0 - Math.PI / 2, true)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax + Math.cos(a0 - Math.PI / 2) * wpx, ay + Math.sin(a0 - Math.PI / 2) * wpx)
      ctx.stroke()
    } else {
      // window: thin glass line across the gap
      ctx.strokeStyle = '#3a86ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
  }

  // --- aircon trunking runs ---
  // Dashed, so it reads as a service run above head height rather than something
  // standing on the floor. The contractor gets the route, not just the units.
  const runs = p.aircon?.runs ?? []
  if (runs.length) {
    ctx.save()
    ctx.strokeStyle = '#0e8a9c'
    ctx.lineWidth = 2
    ctx.setLineDash([7, 4])
    ctx.lineJoin = 'round'
    for (const run of runs) {
      if (run.points.length < 2) continue
      ctx.beginPath()
      run.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(X(pt.x), Y(pt.z))
        else ctx.lineTo(X(pt.x), Y(pt.z))
      })
      ctx.stroke()
    }
    ctx.setLineDash([])
    // a dot at each end so it's clear which units a run joins
    ctx.fillStyle = '#0e8a9c'
    for (const run of runs) {
      for (const pt of [run.points[0], run.points[run.points.length - 1]]) {
        if (!pt) continue
        ctx.beginPath()
        ctx.arc(X(pt.x), Y(pt.z), 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  // --- room labels (on top of everything) ---
  let totalArea = 0
  for (const room of p.rooms) {
    if (room.loop.length < 3) continue
    const c = polygonCentroid(room.loop)
    const { w, d, area } = roomBBoxSize(room.loop)
    totalArea += Math.abs(polygonArea(room.loop))
    const cx = X(c.x)
    const cy = Y(c.z)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#1b2431'
    ctx.font = '600 15px system-ui'
    ctx.fillText(room.name, cx, cy - 8)
    ctx.fillStyle = '#5b6472'
    ctx.font = '12px system-ui'
    ctx.fillText(`${w.toFixed(2)} × ${d.toFixed(2)} m · ${area.toFixed(1)} m²`, cx, cy + 10)
  }

  // --- north arrow (respects the project orientation) ---
  drawNorthArrow(ctx, W - 46, 46, p.orientationDeg ?? 0)

  // --- overall dimension lines ---
  ctx.strokeStyle = '#9aa1ab'
  ctx.fillStyle = '#3b4250'
  ctx.lineWidth = 1
  ctx.font = '12px system-ui'
  // top: width
  const dimY = margin - 40
  drawDimLine(ctx, X(b.minX), dimY, X(b.maxX), dimY, `${worldW.toFixed(2)} m`, 'h')
  // left: depth
  const dimX = margin - 40
  drawDimLine(ctx, dimX, Y(b.minZ), dimX, Y(b.maxZ), `${worldD.toFixed(2)} m`, 'v')

  // --- title block ---
  const ty = H - titleH
  ctx.fillStyle = '#f4f5f7'
  ctx.fillRect(0, ty, W, titleH)
  ctx.strokeStyle = '#d7dae0'
  ctx.beginPath()
  ctx.moveTo(0, ty)
  ctx.lineTo(W, ty)
  ctx.stroke()

  ctx.fillStyle = '#1b2431'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '600 20px system-ui'
  ctx.fillText(p.name || 'Floor Plan', 24, ty + 34)
  ctx.fillStyle = '#5b6472'
  ctx.font = '13px system-ui'
  const trunking = p.aircon
    ? totalTrunkingLength(p.aircon)
    : 0
  ctx.fillText(
    `${p.rooms.length} room(s) · ${p.items.length} item(s) · total floor area ${totalArea.toFixed(1)} m²` +
      (trunking > 0 ? ` · ${trunking.toFixed(1)} m aircon trunking (dashed)` : ''),
    24,
    ty + 58,
  )

  // scale bar (1 m or 2 m)
  const barMeters = worldW > 12 ? 2 : 1
  const barPx = barMeters * scale
  const bx0 = W - 24 - barPx
  const by0 = ty + 46
  ctx.strokeStyle = '#1b2431'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(bx0, by0)
  ctx.lineTo(bx0 + barPx, by0)
  ctx.moveTo(bx0, by0 - 5)
  ctx.lineTo(bx0, by0 + 5)
  ctx.moveTo(bx0 + barPx, by0 - 5)
  ctx.lineTo(bx0 + barPx, by0 + 5)
  ctx.stroke()
  ctx.fillStyle = '#1b2431'
  ctx.font = '12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(`${barMeters} m`, bx0 + barPx / 2, by0 - 10)

  return canvas.toDataURL('image/png')
}

function drawNorthArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  orientationDeg: number,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((-orientationDeg * Math.PI) / 180) // North points up when orientation = 0
  ctx.fillStyle = '#20242c'
  ctx.beginPath()
  ctx.moveTo(0, -18)
  ctx.lineTo(6, 6)
  ctx.lineTo(0, 1)
  ctx.lineTo(-6, 6)
  ctx.closePath()
  ctx.fill()
  ctx.font = '600 12px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', 0, -24)
  ctx.restore()
}

function drawDimLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  label: string,
  dir: 'h' | 'v',
) {
  ctx.strokeStyle = '#9aa1ab'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  // end ticks
  if (dir === 'h') {
    ctx.moveTo(x0, y0 - 5)
    ctx.lineTo(x0, y0 + 5)
    ctx.moveTo(x1, y1 - 5)
    ctx.lineTo(x1, y1 + 5)
  } else {
    ctx.moveTo(x0 - 5, y0)
    ctx.lineTo(x0 + 5, y0)
    ctx.moveTo(x1 - 5, y1)
    ctx.lineTo(x1 + 5, y1)
  }
  ctx.stroke()
  ctx.fillStyle = '#3b4250'
  ctx.font = '12px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (dir === 'h') {
    ctx.fillText(label, (x0 + x1) / 2, y0 - 12)
  } else {
    ctx.save()
    ctx.translate(x0 - 12, (y0 + y1) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(label, 0, 0)
    ctx.restore()
  }
}
