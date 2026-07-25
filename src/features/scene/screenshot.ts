// Bridges so the HTML layer (toolbar, spec sheet) can drive the R3F canvas.
// The DesignView/SceneRoot registers the implementations once mounted.

type Capturer = () => string | null
type HomeExporter = () => void

let capturer: Capturer | null = null
let homeExporter: HomeExporter | null = null

export function registerCapturer(fn: Capturer | null) {
  capturer = fn
}
export function registerHomeExporter(fn: HomeExporter | null) {
  homeExporter = fn
}

/** Capture the current 3D frame as a PNG data URL (null if not in 3D view). */
export function captureScene(): string | null {
  return capturer ? capturer() : null
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

export function exportHomeGltf() {
  if (!homeExporter) {
    alert('Switch to the Design 3D view to export the model.')
    return
  }
  homeExporter()
}
