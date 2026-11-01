// Where the on-screen (touch) controls sit. Each control has an offset from its default place, saved in this
// browser. Edit mode is a flag on the same store: while it is on, the controls show and can be dragged, and
// "Ok" saves the layout and ends it.

export type TouchControlId = 'move' | 'actions' | 'aim' | 'items' | 'grab' | 'inventory'
export type TouchOffset = { x: number; y: number }
export type TouchLayout = { offsets: Partial<Record<TouchControlId, TouchOffset>>; editing: boolean }

const STORE = 'chickenchess-chicken-touch-layout-v1'
const IDS: TouchControlId[] = ['move', 'actions', 'aim', 'items', 'grab', 'inventory']

const EMPTY: TouchLayout = { offsets: {}, editing: false }
let state: TouchLayout | null = null
const listeners = new Set<() => void>()

function read(): TouchLayout['offsets'] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) ?? 'null')
    const out: TouchLayout['offsets'] = {}
    for (const id of IDS) {
      const v = saved?.[id]
      if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) out[id] = { x: v.x, y: v.y }
    }
    return out
  } catch { return {} }
}
function write(offsets: TouchLayout['offsets']) {
  try { window.localStorage.setItem(STORE, JSON.stringify(offsets)) } catch { /* storage unavailable */ }
}
const emit = (next: TouchLayout) => { state = next; listeners.forEach(l => l()) }

export function getTouchLayout(): TouchLayout {
  if (typeof window === 'undefined') return EMPTY
  return state ??= { offsets: read(), editing: false }
}
export const getServerTouchLayout = () => EMPTY
export function subscribeTouchLayout(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export const startTouchLayoutEdit = () => emit({ ...getTouchLayout(), editing: true })
export function setTouchOffset(id: TouchControlId, offset: TouchOffset) {
  const cur = getTouchLayout()
  emit({ ...cur, offsets: { ...cur.offsets, [id]: offset } })
}
export function resetTouchLayout() { emit({ ...getTouchLayout(), offsets: {} }) }
/** "Ok": keeps what is on screen and leaves edit mode. */
export function finishTouchLayoutEdit() {
  const cur = getTouchLayout()
  write(cur.offsets)
  emit({ ...cur, editing: false })
}

/** Drag limit: keeps a box of `rect` size inside the window with a small margin. */
export function clampDelta(rect: { left: number; right: number; top: number; bottom: number }, dx: number, dy: number, vw: number, vh: number, margin = 4) {
  return {
    x: Math.min(vw - margin - rect.right, Math.max(margin - rect.left, dx)),
    y: Math.min(vh - margin - rect.bottom, Math.max(margin - rect.top, dy)),
  }
}
