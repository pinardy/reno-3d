// Simple bridge so the toolbar can trigger a screenshot of the R3F canvas.
// The DesignView registers a capture function once its canvas is mounted.

type Capturer = () => string | null

let capturer: Capturer | null = null

export function registerCapturer(fn: Capturer | null) {
  capturer = fn
}

export function requestScreenshot() {
  if (!capturer) {
    alert('Switch to the Design 3D view to capture a screenshot.')
    return
  }
  const dataUrl = capturer()
  if (!dataUrl) return
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `reno-render-${Date.now()}.png`
  a.click()
}
