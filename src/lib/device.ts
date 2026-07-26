import { useEffect, useState } from 'react'

// Below this the two side panels (240px + 256px) leave nothing for the canvas, so
// the layout folds to a single column with the panels in a bottom sheet.
export const SMALL_SCREEN = '(max-width: 900px)'

// Touch and pen. Notably these devices never fire HTML5 drag-and-drop, so any
// drag-only affordance needs a tap equivalent.
export const COARSE_POINTER = '(pointer: coarse)'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange() // the query may have changed between render and effect
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export function useIsSmallScreen(): boolean {
  return useMediaQuery(SMALL_SCREEN)
}

export function useIsCoarsePointer(): boolean {
  return useMediaQuery(COARSE_POINTER)
}

/** One-off read for non-reactive defaults, e.g. initial render quality. */
export function isSmallScreen(): boolean {
  return window.matchMedia(SMALL_SCREEN).matches
}
