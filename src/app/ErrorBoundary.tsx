import { Component, type ReactNode } from 'react'

// A chunk that loaded fine at build time can 404 at runtime: a new deploy
// replaces the hashed /assets/* files, so a tab that has been open across the
// deploy still remembers the previous build's chunk names. React unwinds the
// whole tree on that throw, which blanks the app. This catches it and offers a
// reload (a fresh navigation pulls the current index.html and its chunk names)
// instead of crashing everything above the 3D view.
export class ErrorBoundary extends Component<
  { children: ReactNode; fallbackLabel?: string },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(err: unknown) {
    console.error('view failed to load', err)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="mx-4 rounded-xl bg-panel/90 px-6 py-5 text-center backdrop-blur">
          <p className="text-sm font-medium text-neutral-200">
            {this.props.fallbackLabel ?? "Couldn't load this view"}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            The app was updated. Reload to get the latest version.
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
