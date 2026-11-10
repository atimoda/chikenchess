// The width the game stage has on screen. Usually the whole window; when a panel is docked at its right side (the
// Pátio's Modo editor), the stage behaves as if the screen ended where that panel starts. Code that lays out or draws
// the stage reads stageWidth() instead of window.innerWidth; changing the inset sends a "resize" so everything that
// already follows the window's size follows it too.
let inset = 0
let frame = 0
const listeners = new Set<() => void>()

export const stageInset = () => inset
export const stageWidth = () => (typeof window === "undefined" ? 0 : Math.max(0, window.innerWidth - inset))

export function setStageInset(px: number) {
  const next = Math.max(0, Math.round(px))
  if (next === inset) return
  inset = next
  listeners.forEach(l => l())
  if (typeof window === "undefined" || frame) return
  // one resize per frame while the divider is being dragged
  frame = window.requestAnimationFrame(() => { frame = 0; window.dispatchEvent(new Event("resize")) })
}

export const subscribeStageInset = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
