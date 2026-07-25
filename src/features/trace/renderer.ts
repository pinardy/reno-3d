import type { Project, Vec2, Selection } from '../../types/project'
import { type View, worldToScreen, screenToWorld } from './view'
import { dist, polygonCentroid } from '../../geometry/vec'
import { roomBBoxSize } from './rooms'

export interface TraceDrawOpts {
  view: View
  W: number
  H: number
  project: Project
  selection: Selection
  img: HTMLImageElement | null
  ppm: number
  tool: string
  chain: Vec2[]
  hover: { point: Vec2; snap: string } | null
  scale: { a: Vec2; b: Vec2 | null } | null
}

// Renders the whole 2D trace scene onto the canvas. Pure w.r.t. the passed
// options (no component/ref access) so it is easy to reason about and reuse.
export function drawTrace(ctx: CanvasRenderingContext2D, o: TraceDrawOpts) {
  const { view: v, W, H, project, selection } = o
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#14161a'
    ctx.fillRect(0, 0, W, H)

    // --- grid ---
    drawGrid(ctx, v, W, H)

    // --- background image ---
    const img = o.img
    if (img && project.floorPlan.visible) {
      const p = o.ppm
      const tl = worldToScreen({ x: 0, z: 0 }, v)
      ctx.globalAlpha = project.floorPlan.opacity
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(
        img,
        tl.x,
        tl.y,
        (img.naturalWidth / p) * v.zoom,
        (img.naturalHeight / p) * v.zoom,
      )
      ctx.globalAlpha = 1
    }

    // --- rooms ---
    for (const room of project.rooms) {
      if (room.loop.length < 3) continue
      ctx.beginPath()
      room.loop.forEach((pt, i) => {
        const s = worldToScreen(pt, v)
        if (i === 0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
      })
      ctx.closePath()
      const sel = selection.type === 'room' && selection.id === room.id
      ctx.fillStyle = sel ? 'rgba(79,140,255,0.22)' : 'rgba(79,140,255,0.10)'
      ctx.fill()
      ctx.strokeStyle = sel ? 'rgba(79,140,255,0.9)' : 'rgba(79,140,255,0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // label
      const c = worldToScreen(polygonCentroid(room.loop), v)
      const { w, d, area } = roomBBoxSize(room.loop)
      ctx.fillStyle = '#cdd6e6'
      ctx.font = '600 12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(room.name, c.x, c.y - 6)
      ctx.fillStyle = '#8b93a3'
      ctx.font = '11px system-ui'
      ctx.fillText(
        `${w.toFixed(2)} × ${d.toFixed(2)} m · ${area.toFixed(1)} m²`,
        c.x,
        c.y + 10,
      )
    }

    // --- walls ---
    for (const wall of project.walls) {
      const a = worldToScreen(wall.a, v)
      const b = worldToScreen(wall.b, v)
      const sel = selection.type === 'wall' && selection.id === wall.id
      const px = Math.max(3, wall.thickness * v.zoom)
      ctx.lineCap = 'round'
      // structural walls are drawn amber so they stand out as "don't hack"
      ctx.strokeStyle = sel ? '#4f8cff' : wall.structural ? '#e6a23c' : '#c7ccd6'
      ctx.lineWidth = px
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      // hatch structural walls with a dashed centre line
      if (wall.structural && !sel) {
        ctx.save()
        ctx.strokeStyle = '#7a5a1e'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.restore()
      }
      // endpoints
      for (const s of [a, b]) {
        ctx.fillStyle = '#20242c'
        ctx.strokeStyle = sel ? '#4f8cff' : '#7f8797'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.rect(s.x - 3, s.y - 3, 6, 6)
        ctx.fill()
        ctx.stroke()
      }
      // length label
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const L = dist(wall.a, wall.b)
      ctx.save()
      ctx.fillStyle = '#9aa2b1'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(`${L.toFixed(2)}m`, mid.x, mid.y - px / 2 - 4)
      ctx.restore()
    }

    // --- openings ---
    for (const op of project.openings) {
      const wall = project.walls.find((w) => w.id === op.wallId)
      if (!wall) continue
      const L = dist(wall.a, wall.b)
      if (L === 0) continue
      const t0 = (op.offset - op.width / 2) / L
      const t1 = (op.offset + op.width / 2) / L
      const p0 = worldToScreen(
        { x: wall.a.x + (wall.b.x - wall.a.x) * t0, z: wall.a.z + (wall.b.z - wall.a.z) * t0 },
        v,
      )
      const p1 = worldToScreen(
        { x: wall.a.x + (wall.b.x - wall.a.x) * t1, z: wall.a.z + (wall.b.z - wall.a.z) * t1 },
        v,
      )
      const sel = selection.type === 'opening' && selection.id === op.id
      const px = Math.max(3, wall.thickness * v.zoom)
      // erase wall segment
      ctx.strokeStyle = '#14161a'
      ctx.lineWidth = px + 2
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
      // marker
      ctx.strokeStyle = sel ? '#ffd24f' : op.type === 'door' ? '#68d08b' : '#7bb0ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
      if (op.type === 'window') {
        ctx.beginPath()
        const nx = (p1.y - p0.y) / (dist2(p0, p1) || 1)
        const ny = -(p1.x - p0.x) / (dist2(p0, p1) || 1)
        ctx.moveTo(p0.x + nx * 2, p0.y + ny * 2)
        ctx.lineTo(p1.x + nx * 2, p1.y + ny * 2)
        ctx.stroke()
      }
    }

    // --- current drawing chain ---
    const chain = o.chain
    const hover = o.hover
    if (chain.length > 0) {
      ctx.strokeStyle = o.tool === 'room' ? '#4f8cff' : '#68d08b'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      chain.forEach((pt, i) => {
        const s = worldToScreen(pt, v)
        if (i === 0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
      })
      if (hover) {
        const s = worldToScreen(hover.point, v)
        ctx.lineTo(s.x, s.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      // vertices
      chain.forEach((pt) => {
        const s = worldToScreen(pt, v)
        ctx.fillStyle = '#68d08b'
        ctx.beginPath()
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
      // live length of last segment
      if (hover && chain.length) {
        const last = chain[chain.length - 1]
        const L = dist(last, hover.point)
        const s = worldToScreen(hover.point, v)
        ctx.fillStyle = '#e6e8ec'
        ctx.font = '11px system-ui'
        ctx.textAlign = 'left'
        ctx.fillText(`${L.toFixed(2)}m`, s.x + 8, s.y - 8)
      }
    }

    // --- scale line ---
    const sc = o.scale
    if (sc) {
      const a = worldToScreen(sc.a, v)
      const b = sc.b ? worldToScreen(sc.b, v) : hover ? worldToScreen(hover.point, v) : a
      ctx.strokeStyle = '#ffd24f'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ;[a, b].forEach((s) => {
        ctx.fillStyle = '#ffd24f'
        ctx.beginPath()
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // --- snap indicator ---
    if (hover && hover.snap !== 'free') {
      const s = worldToScreen(hover.point, v)
      ctx.strokeStyle = hover.snap === 'vertex' ? '#ffd24f' : '#4f8cff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2)
      ctx.stroke()
    }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  v: View,
  W: number,
  H: number,
) {
  const tl = screenToWorld(0, 0, v)
  const br = screenToWorld(W, H, v)
  const step = v.zoom < 20 ? 1 : v.zoom < 40 ? 0.5 : 0.5
  ctx.lineWidth = 1
  const startX = Math.floor(tl.x / step) * step
  const startZ = Math.floor(tl.z / step) * step
  for (let x = startX; x <= br.x; x += step) {
    const s = worldToScreen({ x, z: 0 }, v)
    ctx.strokeStyle = Math.abs(x % 1) < 1e-6 ? '#262b34' : '#1d222a'
    ctx.beginPath()
    ctx.moveTo(s.x, 0)
    ctx.lineTo(s.x, H)
    ctx.stroke()
  }
  for (let z = startZ; z <= br.z; z += step) {
    const s = worldToScreen({ x: 0, z }, v)
    ctx.strokeStyle = Math.abs(z % 1) < 1e-6 ? '#262b34' : '#1d222a'
    ctx.beginPath()
    ctx.moveTo(0, s.y)
    ctx.lineTo(W, s.y)
    ctx.stroke()
  }
}

function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
