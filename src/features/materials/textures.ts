import * as THREE from 'three'

// Procedurally generated canvas textures so the app needs no external image
// assets. Each is cached by id. Textures tile (RepeatWrapping); callers set
// repeat based on surface size.

const cache = new Map<string, THREE.Texture>()

export type TextureId =
  | 'none'
  | 'wood'
  | 'wood-dark'
  | 'tile'
  | 'marble'
  | 'carpet'
  | 'concrete'
  | 'fabric'

export const TEXTURE_IDS: TextureId[] = [
  'none',
  'wood',
  'wood-dark',
  'tile',
  'marble',
  'carpet',
  'concrete',
  'fabric',
]

function makeCanvas(size = 512) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return { c, ctx: c.getContext('2d')! }
}

// tiny seeded value-noise so results are deterministic per pixel
function fill(ctx: CanvasRenderingContext2D, base: string) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

function grain(ctx: CanvasRenderingContext2D, amount: number, alpha = 0.06) {
  const { width, height } = ctx.canvas
  const img = ctx.getImageData(0, 0, width, height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    // deterministic pseudo-random from index
    const n = ((i * 1103515245 + 12345) >>> 8) % 255
    const v = (n / 255 - 0.5) * amount
    d[i] = Math.max(0, Math.min(255, d[i] + v))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + v))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + v))
    d[i + 3] = Math.max(0, Math.min(255, d[i + 3]))
  }
  ctx.putImageData(img, 0, 0)
  void alpha
}

function drawWood(dark: boolean): HTMLCanvasElement {
  const { c, ctx } = makeCanvas()
  fill(ctx, dark ? '#5a3d28' : '#b78a5a')
  const planks = 6
  const pw = c.width / planks
  for (let p = 0; p < planks; p++) {
    const shade = (p % 2 === 0 ? 1 : -1) * 10
    ctx.fillStyle = shadeColor(dark ? '#6b4a30' : '#c49765', shade)
    ctx.fillRect(p * pw, 0, pw - 2, c.height)
    // grain streaks
    ctx.strokeStyle = shadeColor(dark ? '#4a3120' : '#a67c4d', -6)
    ctx.lineWidth = 1
    for (let g = 0; g < 10; g++) {
      const x = p * pw + 4 + ((g * 37) % (pw - 8))
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.bezierCurveTo(x + 6, c.height * 0.33, x - 6, c.height * 0.66, x + 2, c.height)
      ctx.stroke()
    }
  }
  grain(ctx, 18)
  return c
}

function drawTile(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas()
  fill(ctx, '#e9e6e0')
  const n = 4
  const s = c.width / n
  ctx.strokeStyle = '#b9b4ab'
  ctx.lineWidth = 6
  for (let i = 0; i <= n; i++) {
    ctx.beginPath()
    ctx.moveTo(i * s, 0)
    ctx.lineTo(i * s, c.height)
    ctx.moveTo(0, i * s)
    ctx.lineTo(c.width, i * s)
    ctx.stroke()
  }
  grain(ctx, 8)
  return c
}

function drawMarble(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas()
  fill(ctx, '#eceae7')
  ctx.strokeStyle = 'rgba(120,120,130,0.35)'
  ctx.lineWidth = 2
  for (let v = 0; v < 14; v++) {
    ctx.beginPath()
    let x = (v * 61) % c.width
    let y = 0
    ctx.moveTo(x, y)
    while (y < c.height) {
      x += ((v * 17 + y) % 40) - 20
      y += 24
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  grain(ctx, 10)
  return c
}

function drawCarpet(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas()
  fill(ctx, '#8a8378')
  grain(ctx, 40)
  return c
}

function drawConcrete(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas()
  fill(ctx, '#9a9a9d')
  grain(ctx, 26)
  return c
}

function drawFabric(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas()
  fill(ctx, '#c9c2b6')
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'
  ctx.lineWidth = 1
  for (let i = 0; i < c.width; i += 4) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, c.height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(c.width, i)
    ctx.stroke()
  }
  grain(ctx, 12)
  return c
}

function shadeColor(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) + amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt))
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt))
  return `rgb(${r},${g},${b})`
}

export function getTexture(id: TextureId): THREE.Texture | null {
  if (id === 'none') return null
  if (cache.has(id)) return cache.get(id)!
  let canvas: HTMLCanvasElement
  switch (id) {
    case 'wood':
      canvas = drawWood(false)
      break
    case 'wood-dark':
      canvas = drawWood(true)
      break
    case 'tile':
      canvas = drawTile()
      break
    case 'marble':
      canvas = drawMarble()
      break
    case 'carpet':
      canvas = drawCarpet()
      break
    case 'concrete':
      canvas = drawConcrete()
      break
    case 'fabric':
      canvas = drawFabric()
      break
    default:
      return null
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(id, tex)
  return tex
}
