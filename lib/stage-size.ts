// The part of the window the game stage has on screen. Usually the whole window; when a panel is docked at one of its
// sides (the Pátio's Modo editor: at the right, at the top under the header's strip, or at the bottom), the stage
// behaves as if the screen were only what is left: code that lays out or draws the stage reads stageWidth() and
// stageHeight() instead of window.innerWidth / innerHeight. The stage's own coordinates start at its top left corner,
// stageTop() px below the window's: a pointer's clientY is clientY - stageTop() on the stage (stageY). Changing the
// dock sends a "resize" so everything that already follows the window's size follows it too.
let inset = 0 // the right side's panel
let top = 0 // from the window's top to the stage's (the header's strip and the top panel)
let bottom = 0 // the bottom side's panel
let frame = 0
const listeners = new Set<() => void>()

export type StageDock = { right: number; top: number; bottom: number }

export const stageInset = () => inset
export const stageTop = () => top
export const stageBottom = () => bottom
export const stageDock = (): StageDock => ({ right: inset, top, bottom })
export const stageDocked = () => inset > 0 || top > 0 || bottom > 0
export const stageWidth = () => (typeof window === "undefined" ? 0 : Math.max(0, window.innerWidth - inset))
export const stageHeight = () => (typeof window === "undefined" ? 0 : Math.max(0, window.innerHeight - top - bottom))
/** A pointer's clientY on the stage. */
export const stageY = (clientY: number) => clientY - top

export function setStageDock(next: Partial<StageDock>) {
  const r = Math.max(0, Math.round(next.right ?? 0)), t = Math.max(0, Math.round(next.top ?? 0)), b = Math.max(0, Math.round(next.bottom ?? 0))
  if (r === inset && t === top && b === bottom) return
  inset = r; top = t; bottom = b
  snapshot = { right: inset, top, bottom }
  listeners.forEach(l => l())
  if (typeof window === "undefined" || frame) return
  // one resize per frame while the divider is being dragged
  frame = window.requestAnimationFrame(() => { frame = 0; window.dispatchEvent(new Event("resize")) })
}
export const setStageInset = (px: number) => setStageDock({ right: px })

let snapshot: StageDock = { right: 0, top: 0, bottom: 0 }
/** For useSyncExternalStore: the same object until the dock changes. */
export const stageDockSnapshot = () => snapshot
export const subscribeStageInset = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
