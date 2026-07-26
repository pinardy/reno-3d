// A WebGL context can be refused before a single frame renders: hardware
// acceleration turned off, a GPU driver on the browser's blocklist, a crashed
// GPU process, or too many live contexts. THREE surfaces that as an uncaught
// "Error creating WebGL context" async rejection, which leaves the 3D view blank
// with no way for a render-time error boundary to catch it. Probe first so we
// can show a real message instead of mounting a Canvas that will throw.
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    // Free the probe's own context right away so it doesn't count against the
    // browser's live-context limit (and trigger the very failure we test for).
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
