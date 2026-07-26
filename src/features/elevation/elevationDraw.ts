import type { Project } from '../../types/project'
import {
  elevationRuns,
  feetRun,
  isRaised,
  type ElevationRun,
  type ElevationUnit,
} from './elevation'

// Canvas rendering of a carpentry elevation, in the flat black-on-white style of
// a shop drawing: carcass outlines, panel fronts, a dimension chain of unit widths
// under the run, overall width below that, heights up the right side, and the
// ceiling as a dashed reference. Sizes are in millimetres, which is what carpenters
// and IDs quote in.

const INK = '#1b2431'
const HAIR = '#9aa1ab'
const PANEL = '#f7f8fa'
const PANEL_LINE = '#8d97a5'
const COUNTER = '#3b3b40'
const HATCH = '#c3cad4'
const OPEN_BG = '#eceff3'

interface Layout {
  scale: number // px per metre
  W: number
  H: number
  /** world (metres, x from run's left, y up from floor) -> canvas px */
  X: (x: number) => number
  Y: (y: number) => number
}

const PAD_L = 40
const PAD_T = 46
const PAD_B = 108 // two width dimension chains + labels
const TITLE_H = 54
/** Horizontal spacing between stacked height dimension lines. */
const BAND_STEP = 30
/** Room for the outermost band's label plus its "NNNN AFF" note. */
const BAND_LABEL_ROOM = 96

/** Distinct vertical bands in the run — one height dimension each. */
function heightBands(run: ElevationRun): { y0: number; y1: number }[] {
  const bands = new Map<string, { y0: number; y1: number }>()
  for (const u of run.units) {
    bands.set(`${u.y0.toFixed(2)}-${u.y1.toFixed(2)}`, { y0: u.y0, y1: u.y1 })
  }
  return [...bands.values()].sort((a, b) => a.y0 - b.y0)
}

function layoutFor(run: ElevationRun, maxWidthPx: number): Layout {
  const worldH = Math.max(run.wallHeight, run.height) + 0.1
  // The height chain stacks one dimension line per band, so the right margin has
  // to grow with them — otherwise a run with base, wall and tall units clips its
  // outermost label off the canvas.
  const padR = 34 + heightBands(run).length * BAND_STEP + BAND_LABEL_ROOM
  const scale = Math.max(
    26,
    Math.min(190, (maxWidthPx - PAD_L - padR) / Math.max(0.4, run.width)),
  )
  // An upper row needs its own width chain, drawn above the run.
  const padT = run.units.some(isRaised) ? PAD_T + 34 : PAD_T
  const W = Math.round(run.width * scale + PAD_L + padR)
  const H = Math.round(worldH * scale + padT + PAD_B + TITLE_H)
  const floorY = padT + worldH * scale
  return {
    scale,
    W,
    H,
    X: (x) => PAD_L + x * scale,
    Y: (y) => floorY - y * scale,
  }
}

function mm(metres: number): string {
  return `${Math.round(metres * 1000)}`
}

/** Render one run to its own canvas. */
export function renderElevation(run: ElevationRun, maxWidthPx = 1500): HTMLCanvasElement {
  const L = layoutFor(run, maxWidthPx)
  const canvas = document.createElement('canvas')
  canvas.width = L.W
  canvas.height = L.H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, L.W, L.H)

  drawWallAndFloor(ctx, run, L)
  for (const u of run.units) drawUnit(ctx, u, L)
  drawWidthChain(ctx, run, L)
  drawHeightChain(ctx, run, L)
  drawTitle(ctx, run, L)

  return canvas
}

function drawWallAndFloor(ctx: CanvasRenderingContext2D, run: ElevationRun, L: Layout) {
  const x0 = L.X(0)
  const x1 = L.X(run.width)
  // floor line, run a little past the carcass on both sides
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x0 - 18, L.Y(0))
  ctx.lineTo(x1 + 18, L.Y(0))
  ctx.stroke()

  // ceiling reference
  ctx.save()
  ctx.strokeStyle = HAIR
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(x0 - 18, L.Y(run.wallHeight))
  ctx.lineTo(x1 + 18, L.Y(run.wallHeight))
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = HAIR
  ctx.font = '11px system-ui'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText(`ceiling ${mm(run.wallHeight)}`, x0 - 16, L.Y(run.wallHeight) - 3)
}

function drawUnit(ctx: CanvasRenderingContext2D, u: ElevationUnit, L: Layout) {
  const px = L.X(u.x)
  const pw = u.w * L.scale
  const counterH = u.counter ? 0.04 : 0
  const bodyTop = u.y1 - counterH

  // carcass
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.rect(px, L.Y(bodyTop), pw, (bodyTop - u.y0) * L.scale)
  ctx.fill()
  ctx.stroke()

  for (const f of u.fronts) {
    const fx = L.X(u.x + f.x)
    const fw = f.w * L.scale
    const fy = L.Y(f.y + f.h)
    const fh = f.h * L.scale
    if (fw <= 0 || fh <= 0) continue

    if (f.kind === 'appliance') {
      // hatched box: the gap the carpenter leaves for a bought-in appliance
      ctx.save()
      ctx.beginPath()
      ctx.rect(fx, fy, fw, fh)
      ctx.clip()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(fx, fy, fw, fh)
      ctx.strokeStyle = HATCH
      ctx.lineWidth = 1
      for (let d = -fh; d < fw; d += 9) {
        ctx.beginPath()
        ctx.moveTo(fx + d, fy + fh)
        ctx.lineTo(fx + d + fh, fy)
        ctx.stroke()
      }
      ctx.restore()
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.4
      ctx.strokeRect(fx, fy, fw, fh)
      continue
    }

    if (f.kind === 'open') {
      ctx.fillStyle = OPEN_BG
      ctx.fillRect(fx, fy, fw, fh)
      ctx.strokeStyle = PANEL_LINE
      ctx.lineWidth = 1
      ctx.strokeRect(fx, fy, fw, fh)
      continue
    }

    ctx.fillStyle = PANEL
    ctx.strokeStyle = PANEL_LINE
    ctx.lineWidth = 1.1
    ctx.fillRect(fx, fy, fw, fh)
    ctx.strokeRect(fx, fy, fw, fh)

    // handle: a vertical bar on a door, a horizontal one on a drawer
    ctx.fillStyle = '#5a6473'
    if (f.kind === 'drawer') {
      const hw = Math.min(fw * 0.45, 34)
      ctx.fillRect(fx + fw / 2 - hw / 2, fy + fh / 2 - 1.5, hw, 3)
    } else {
      const hh = Math.min(fh * 0.3, 30)
      ctx.fillRect(fx + fw - 9, fy + fh / 2 - hh / 2, 3, hh)
    }
  }

  // worktop slab, drawn overhanging its carcass the way a real one does
  if (u.counter) {
    ctx.fillStyle = COUNTER
    ctx.fillRect(px - 2, L.Y(u.y1), pw + 4, counterH * L.scale)
  }
}

/**
 * Per-unit widths, then the overall width beneath them. The floor row and the wall
 * row get separate chains — below and above the run respectively — because the two
 * rows don't line up and one combined chain would be unreadable.
 */
function drawWidthChain(ctx: CanvasRenderingContext2D, run: ElevationRun, L: Layout) {
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const raised = run.units.filter(isRaised)
  const floorRow = run.units.filter((u) => !isRaised(u))
  const row = floorRow.length ? floorRow : run.units

  const y = L.Y(0) + 30
  for (const u of row) dimLine(ctx, L.X(u.x), y, L.X(u.x + u.w), y, mm(u.w))

  if (row.length > 1 || Math.abs(run.width - (row[0]?.w ?? 0)) > 0.01) {
    ctx.font = '600 12px system-ui'
    dimLine(ctx, L.X(0), y + 34, L.X(run.width), y + 34, `${mm(run.width)} overall`)
    ctx.font = '11px system-ui'
  }

  // wall units, dimensioned above the drawing
  if (raised.length && floorRow.length) {
    const top = Math.min(...raised.map((u) => u.y1))
    const yUp = L.Y(top) - 26
    for (const u of raised) dimLine(ctx, L.X(u.x), yUp, L.X(u.x + u.w), yUp, mm(u.w))
  }
}

/** Carcass heights up the right-hand side, one dimension per distinct band. */
function drawHeightChain(ctx: CanvasRenderingContext2D, run: ElevationRun, L: Layout) {
  const x = L.X(run.width) + 34
  ctx.font = '11px system-ui'
  // One entry per band, so a row of identical base units gets one dimension
  // instead of eight stacked on the same line.
  heightBands(run).forEach((b, i) => {
    const bx = x + i * BAND_STEP
    dimLine(ctx, bx, L.Y(b.y0), bx, L.Y(b.y1), mm(b.y1 - b.y0), 'v')
    // where the band starts off the floor, call that out too
    if (b.y0 > 0.05) {
      ctx.save()
      ctx.strokeStyle = HAIR
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(L.X(run.width) + 4, L.Y(b.y0))
      ctx.lineTo(bx, L.Y(b.y0))
      ctx.stroke()
      ctx.restore()
      ctx.fillStyle = HAIR
      ctx.font = '10px system-ui'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${mm(b.y0)} AFF`, bx + 6, L.Y(b.y0))
      ctx.font = '11px system-ui'
    }
  })
}

function drawTitle(ctx: CanvasRenderingContext2D, run: ElevationRun, L: Layout) {
  const ty = L.H - TITLE_H
  ctx.fillStyle = '#f4f5f7'
  ctx.fillRect(0, ty, L.W, TITLE_H)
  ctx.strokeStyle = '#d7dae0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, ty)
  ctx.lineTo(L.W, ty)
  ctx.stroke()

  ctx.fillStyle = INK
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '600 15px system-ui'
  ctx.fillText(run.name, 16, ty + 22)
  ctx.fillStyle = '#5b6472'
  ctx.font = '12px system-ui'
  const appliances = run.units.filter((u) => !u.carpentry).length
  ctx.fillText(
    `${run.units.length} unit${run.units.length > 1 ? 's' : ''} · ${runSummary(run)}` +
      (appliances ? ` · ${appliances} appliance gap${appliances > 1 ? 's' : ''} (hatched)` : ''),
    16,
    ty + 40,
  )
  ctx.textAlign = 'right'
  ctx.fillText('Dimensions in mm · AFF = above finished floor', L.W - 16, ty + 40)
}

const ft = (m: number) => `${m.toFixed(2)} m (${feetRun(m).toFixed(1)} ft)`

/**
 * The foot run, split the way a kitchen is quoted: bottom cabinets and top
 * cabinets are two separate line items, so adding them into one figure next to a
 * 3.6 m overall width just reads like a mistake.
 */
export function runSummary(run: ElevationRun): string {
  if (run.wallRun > 0 && run.baseRun > 0)
    return `${ft(run.baseRun)} base + ${ft(run.wallRun)} wall units`
  if (run.wallRun > 0) return `${ft(run.wallRun)} wall units`
  return `${ft(run.baseRun)} carpentry run`
}

function dimLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  label: string,
  dir: 'h' | 'v' = 'h',
) {
  ctx.save()
  ctx.strokeStyle = HAIR
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  if (dir === 'h') {
    ctx.moveTo(x0, y0 - 4)
    ctx.lineTo(x0, y0 + 4)
    ctx.moveTo(x1, y1 - 4)
    ctx.lineTo(x1, y1 + 4)
  } else {
    ctx.moveTo(x0 - 4, y0)
    ctx.lineTo(x0 + 4, y0)
    ctx.moveTo(x1 - 4, y1)
    ctx.lineTo(x1 + 4, y1)
  }
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = '#3b4250'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (dir === 'h') {
    const span = Math.abs(x1 - x0)
    // a 300mm filler is narrower than its own label; put it under the line instead
    if (span < 34) {
      ctx.save()
      ctx.translate((x0 + x1) / 2, y0 + 16)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(label, 0, 0)
      ctx.restore()
    } else {
      ctx.fillText(label, (x0 + x1) / 2, y0 - 9)
    }
  } else {
    ctx.save()
    ctx.translate(x0 - 9, (y0 + y1) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(label, 0, 0)
    ctx.restore()
  }
}

// ---- export helpers --------------------------------------------------------

export function elevationDataUrl(run: ElevationRun, maxWidthPx = 1500): string {
  return renderElevation(run, maxWidthPx).toDataURL('image/png')
}

export function downloadElevation(run: ElevationRun, projectName: string) {
  const a = document.createElement('a')
  a.href = elevationDataUrl(run)
  a.download = `${slug(projectName)}-${slug(run.name)}.png`
  a.click()
}

/** All runs stacked on one sheet, for handing over as a single drawing. */
export function renderElevationSheet(project: Project): string | null {
  const runs = elevationRuns(project)
  if (!runs.length) return null
  const canvases = runs.map((r) => renderElevation(r, 1400))
  const GAP = 26
  const HEAD = 62
  const W = Math.max(...canvases.map((c) => c.width))
  const H = HEAD + canvases.reduce((s, c) => s + c.height + GAP, 0)

  const sheet = document.createElement('canvas')
  sheet.width = W
  sheet.height = H
  const ctx = sheet.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const totalRun = runs.reduce((s, r) => s + r.carpentryRun, 0)
  ctx.fillStyle = INK
  ctx.font = '600 20px system-ui'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`${project.name} — Carpentry elevations`, 16, 30)
  ctx.fillStyle = '#5b6472'
  ctx.font = '13px system-ui'
  ctx.fillText(
    `${runs.length} run${runs.length > 1 ? 's' : ''} · ${totalRun.toFixed(2)} m (${feetRun(totalRun).toFixed(1)} ft) of carcass in total`,
    16,
    50,
  )

  let y = HEAD
  for (const c of canvases) {
    ctx.drawImage(c, 0, y)
    y += c.height + GAP
  }
  return sheet.toDataURL('image/png')
}

export function downloadElevationSheet(project: Project) {
  const url = renderElevationSheet(project)
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug(project.name)}-elevations.png`
  a.click()
}

function slug(s: string): string {
  return s.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'home'
}
