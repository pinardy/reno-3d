import { useEffect } from 'react'
import { nanoid } from 'nanoid'
import type { Project } from '../../types/project'
import { useStore } from '../../store/store'
import { migrateProject } from './io'

// Share a design via a URL fragment (#s=...). The design is JSON -> gzip ->
// base64url. The background floor-plan image and any imported .glb models are
// stripped (too large for a link); the .json export keeps full fidelity.

function stripHeavy(p: Project): Project {
  return {
    ...p,
    floorPlan: { ...p.floorPlan, imageDataUrl: null },
    items: p.items.map((it) => (it.kind === 'glb' ? { ...it, modelUrl: undefined } : it)),
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function gzip(str: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(new TextEncoder().encode(str) as unknown as BufferSource)
  writer.close()
  const ab = await new Response(cs.readable).arrayBuffer()
  return new Uint8Array(ab)
}
async function gunzip(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(bytes as unknown as BufferSource)
  writer.close()
  const ab = await new Response(ds.readable).arrayBuffer()
  return new TextDecoder().decode(ab)
}

export async function encodeShareLink(project: Project): Promise<string> {
  const json = JSON.stringify(stripHeavy(project))
  const payload =
    typeof CompressionStream !== 'undefined'
      ? 'g' + toBase64Url(await gzip(json))
      : 'j' + toBase64Url(new TextEncoder().encode(json))
  return `${location.origin}${location.pathname}#s=${payload}`
}

async function decodeShare(payload: string): Promise<Project | null> {
  try {
    const kind = payload[0]
    const bytes = fromBase64Url(payload.slice(1))
    const json = kind === 'g' ? await gunzip(bytes) : new TextDecoder().decode(bytes)
    const p = migrateProject(JSON.parse(json))
    p.id = nanoid() // fresh id so it doesn't clobber a local project
    return p
  } catch (e) {
    console.warn('bad share link', e)
    return null
  }
}

/** Build a share link for the current project and copy it to the clipboard. */
export async function copyShareLink(project: Project) {
  const url = await encodeShareLink(project)
  try {
    await navigator.clipboard.writeText(url)
    alert(
      'Share link copied to clipboard.\n\nNote: the design is included, but the background floor-plan image is not (too large for a link). Use "Export project (.json)" for a full copy.',
    )
  } catch {
    prompt('Copy this share link:', url)
  }
}

/** On first mount, if the URL has a #s=... share payload, load that design. */
export function useShareImport() {
  useEffect(() => {
    const hash = location.hash
    if (!hash.startsWith('#s=')) return
    const payload = hash.slice(3)
    ;(async () => {
      const p = await decodeShare(payload)
      if (p) useStore.getState().loadProject(p)
      // clear the hash so a refresh doesn't re-import
      history.replaceState(null, '', location.pathname + location.search)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
