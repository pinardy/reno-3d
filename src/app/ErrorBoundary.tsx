import { Component, type ReactNode } from 'react'

// A chunk that loaded fine at build time can 404 at runtime: a new deploy
// replaces the hashed /assets/* files, so a tab that has been open across the
// deploy still remembers the previous build's chunk names. That throw is
// recoverable — a fresh navigation pulls the current chunk names — so we tell
// the user to reload. A genuine render error is NOT recoverable that way;
// reloading just crashes again, so it needs different, honest copy.
function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err)
  return /ChunkLoadError|dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
    msg,
  )
}

export class ErrorBoundary extends Component<
  { children: ReactNode; fallbackLabel?: string },
  { error: unknown }
> {
  state = { error: null as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(err: unknown) {
    console.error('view error', err)
  }

  render() {
    if (this.state.error == null) return this.props.children
    const chunk = isChunkLoadError(this.state.error)
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="mx-4 max-w-sm rounded-xl bg-panel/90 px-6 py-5 text-center backdrop-blur">
          <p className="text-sm font-medium text-neutral-200">
            {chunk ? (this.props.fallbackLabel ?? "Couldn't load this view") : 'Something went wrong'}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {chunk
              ? 'The app was updated. Reload to get the latest version.'
              : 'This view hit an unexpected error. A reload may clear it; if it keeps happening, it needs a fix.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/25"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
