// Where the on-screen (touch) controls sit. Each control has an offset from its anchor (the place its component
// puts it), saved in this browser; a control the player never moved uses its default offset (DEFAULT_TOUCH_OFFSETS). Edit mode is a flag on the same store: while it is on, the controls show and can be dragged, and
// "Ok" saves the layout and ends it.

export type TouchControlId = 'move' | 'run' | 'down' | 'jump' | 'aim' | 'melee' | 'throw' | 'itemWheel' | 'grab' | 'inventory' | 'inventoryBar'
export type TouchOffset = { x: number; y: number }
export type TouchLayout = { offsets: Partial<Record<TouchControlId, TouchOffset>>; editing: boolean }

const STORE = 'chickenchess-chicken-touch-layout-v1'
const IDS: TouchControlId[] = ['move', 'run', 'down', 'jump', 'aim', 'melee', 'throw', 'itemWheel', 'grab', 'inventory', 'inventoryBar']

// The game's layout (20/11): the movement stick a little in and up; Pular, Chocar and Correr in a low arc under the
// item buttons; Punch, Throw and Roda in an arc above them, Pegar over Roda and the aim stick (when shown) above Punch.
// Px from each control's anchor, measured on a phone held upright; the inventory keeps its own corner.
export const DEFAULT_TOUCH_OFFSETS: Partial<Record<TouchControlId, TouchOffset>> = {
  move: { x: 24, y: -67 },
  run: { x: 2, y: 14 },
  down: { x: 1, y: -6 },
  jump: { x: 0, y: -22 },
  aim: { x: -15, y: -69 },
  melee: { x: 96, y: 82 },
  throw: { x: 33, y: 37 },
  itemWheel: { x: -31, y: -2 },
  grab: { x: 40, y: -6 },
}
/** Where a control sits now: the player's own offset, else the game's default. */
export const touchOffset = (offsets: TouchLayout['offsets'], id: TouchControlId): TouchOffset | undefined => offsets[id] ?? DEFAULT_TOUCH_OFFSETS[id]

const EMPTY: TouchLayout = { offsets: {}, editing: false }
let state: TouchLayout | null = null
const listeners = new Set<() => void>()

function read(): TouchLayout['offsets'] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) ?? 'null')
    const out: TouchLayout['offsets'] = {}
    for (const id of IDS) {
      // Split legacy groups without moving any of their buttons. Individual positions win.
      const group = ['run', 'down', 'jump'].includes(id) ? 'actions' : ['melee', 'throw', 'itemWheel'].includes(id) ? 'items' : null
      const v = saved?.[id] ?? (group ? saved?.[group] : null)
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
/** "Padrão": every control back to the game's layout. */
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
