import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)

// A new deploy replaces the hashed /assets/* chunks, so a tab open across the
// deploy fails to import a chunk it still remembers (e.g. the on-demand 3D
// view). A fresh navigation pulls the current index.html and its chunk names,
// so reload once — guarded so a genuinely broken build can't loop forever.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  if (sessionStorage.getItem('reno:chunk-reloaded')) return
  sessionStorage.setItem('reno:chunk-reloaded', '1')
  window.location.reload()
})

// Once the app has run cleanly for a bit, this reload was a one-off deploy
// transition, not a crash loop — release the guard so a *later* deploy in the
// same long-lived tab can self-heal too. A build that's actually broken throws
// again within this window, while the guard is still set, so it can't loop.
window.setTimeout(() => sessionStorage.removeItem('reno:chunk-reloaded'), 10_000)

// register the service worker for offline / installable PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
