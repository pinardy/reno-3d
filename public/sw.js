// Offline cache. The strategy differs by request kind, because treating them all
// alike is what made every deploy need a hard refresh: serving index.html from
// cache first handed back the *previous* build's asset hashes, so the app stayed
// a version behind until its second load.
//
//   navigations (HTML) -> network first, cache kept as the offline fallback
//   /assets/* hashed   -> cache first, immutable by construction
//   everything else    -> stale-while-revalidate, as before
const CACHE = 'reno-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) =>
  e.waitUntil(
    (async () => {
      // drop older caches, including the v1 one still holding stale HTML
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  ),
)

const isHtml = (req) =>
  req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')

// Vite emits content-hashed filenames under assets/, so a given URL's bytes never
// change and there is nothing to revalidate.
const isHashedAsset = (url) => url.pathname.includes('/assets/')

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return // don't touch cross-origin

  if (isHtml(req)) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        try {
          const res = await fetch(req)
          if (res && res.status === 200) cache.put(req, res.clone())
          return res
        } catch {
          // offline: this exact page, else the app shell at the scope root (which
          // is the URL a bare navigation is cached under)
          const cached = await cache.match(req)
          return cached || (await cache.match(self.registration.scope)) || Response.error()
        }
      })(),
    )
    return
  }

  if (isHashedAsset(url)) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(req)
        if (cached) return cached
        const res = await fetch(req)
        if (res && res.status === 200) cache.put(req, res.clone())
        return res
      })(),
    )
    return
  }

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })(),
  )
})
