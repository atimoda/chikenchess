// The Ativadores de grid de campo minado of the Pátio open in this browser (lib/pigchicken/mine-activator.ts has
// their rules): where they stand, their bars and whether one of them turned the Grade de blocos on, and how. Runtime
// only, like the grid's round: the Pátio saves each one's params, never its bars nor the grid it turned on. An
// activation shows the grid only after a count of 3 s (the same in every browser of the online Pátio). The
// Parquinho says where they are and brings the notes, the shots and the blows (components/pigchicken/mine-grid-
// play.ts), the Pátio's screen turns the grid on from here (components/chicken/chicken-patio.tsx), and in the online
// Pátio the lobby's owner decides (lib/pigchicken/net-mine-sync.ts).
import { mineStore } from './mine-grid-store'
import {
  MINE_ACTIVATOR_COUNT_MS, fillMineActivator, mineActivatorArmed, mineActivatorBlast, mineActivatorBlow, mineActivatorBlowNotes, mineActivatorNoteHit, mineActivatorShotHit, viaIn, viaOut,
  mineActivatorSlamOption, onMineActivatorTop,
  type MineActivatorBars, type MineActivatorBox, type MineActivatorOption, type MineActivatorParams, type MineActivatorVia, type NetMineActivator,
} from './mine-activator'

let boxes: MineActivatorBox[] = []
const bars = new Map<string, MineActivatorBars>()
// how one of them turned the grid on (null: none did, or the grid was hidden since)
let via: MineActivatorVia | null = null
// the Pátio's own "Grade ligada"
let savedOn = false
// the activations so far: each new one starts a new round of a grid already shown
let activations = 0
// the one whose bar filled last
let lastId = ''
// the ones just activated here, for their burst and sound
const flashes: string[] = []
// the count before the grid appears: when it started (performance.now ms; null: none on), the grid shown after it
// (via and how many activations were shown so far) and the params of the one that turned it on
let countStart: number | null = null
let countTimer: ReturnType<typeof setTimeout> | null = null
let shownVia: MineActivatorVia | null = null
let shown = 0
let shownParams: MineActivatorParams | null = null
// when an activator's grid options last changed (by a slam), for the grid's flash: its id and when
let optionsChanged: { id: string; at: number; option: MineActivatorOption } | null = null
// the online Pátio, in a browser that does not own the lobby: what its players pour in and a hide go to the owner
export type MineActivatorAsk = { hit: [string, number, number] } | { hide: true } | { key: string }
let mirror: ((a: MineActivatorAsk) => void) | null = null
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version++; listeners.forEach(f => f()) }
const NO_BARS: MineActivatorBars = { notes: 0, damage: 0 }

export const mineActivatorStore = {
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } },
  version: () => version,
  get via() { return via },
  get activations() { return activations },
  // the grid the players see: after the count (how, how many times and with which activator's options)
  get shownVia() { return shownVia },
  get shown() { return shown },
  get shownParams() { return shownParams },
  // the count on (when it started) and the activator whose grid comes after it
  get countStart() { return countStart },
  get pendingParams() { return boxes.find(b => b.id === lastId)?.params ?? null },
  get optionsChanged() { return optionsChanged },
  get boxes() { return boxes as readonly MineActivatorBox[] },
  // whether they can be filled now (big and blue) or wait small and untouchable
  armed: () => mineActivatorArmed({ savedOn, via, over: !!mineStore.round?.over }),
  bars: (id: string): MineActivatorBars => bars.get(id) ?? NO_BARS,
}

// the Parquinho: the ones in the world now (a removed one takes its bars along)
export function setMineActivators(list: MineActivatorBox[]) {
  // an activator whose grid options changed (a slam, or the layout from another browser): the grid flashes
  for (const b of list) {
    const was = boxes.find(o => o.id === b.id)?.params
    const option = !was ? undefined : (['cell', 'gap', 'corner'] as const).find(k => was[k] !== b.params[k])
    if (option) { optionsChanged = { id: b.id, at: performance.now(), option }; emit() }
  }
  boxes = list
  for (const id of [...bars.keys()]) if (!list.some(b => b.id === id)) bars.delete(id)
}
// the Pátio's own "Grade ligada"
export function setMineActivatorSaved(on: boolean) {
  if (on === savedOn) return
  savedOn = on
  emit()
}
// another Pátio opened: nothing of the last one stays
export function resetMineActivators() {
  via = null; bars.clear(); flashes.length = 0
  stopCount(); shownVia = null; shownParams = null; optionsChanged = null
  emit()
}

const stopCount = () => { if (countTimer) clearTimeout(countTimer); countTimer = null; countStart = null }
// the count before the grid appears, then the grid
function startCount() {
  stopCount()
  countStart = performance.now()
  countTimer = setTimeout(() => {
    countTimer = null; countStart = null
    shownVia = via; shownParams = mineActivatorStore.pendingParams; shown++
    emit()
  }, MINE_ACTIVATOR_COUNT_MS)
}
function activate(next: MineActivatorVia, id: string | null) {
  via = next; bars.clear(); activations++
  lastId = id ?? ''
  if (id) flashes.push(id)
  startCount()
  emit()
}
// a Chave de ouro used on a locked one: it turns the grid on (by music, with the blocks as Zonas sonoras), or the
// owner of the online Pátio is asked to
export function openMineActivator(id: string) {
  if (!mineActivatorStore.armed() || !boxes.some(b => b.id === id)) return false
  if (mirror) { mirror({ key: id }); return true }
  activate('music', id)
  return true
}
// notes and damage that reached one: poured in here (where its bar filling turns the grid on), or sent to the owner
function pour(id: string, notes: number, damage: number) {
  if (!mineActivatorStore.armed()) return
  if (mirror) { mirror({ hit: [id, notes, damage] }); return }
  const b = boxes.find(o => o.id === id)
  if (!b) return
  const now = bars.get(id) ?? { notes: 0, damage: 0 }
  bars.set(id, now)
  const filled = fillMineActivator(now, b.params, notes, damage)
  if (filled) activate(filled, id); else emit()
}
// "Grade ligada" turned off in the grid's panel: the grid an activator turned on hides too, and they come back
export function hideActivatedMineGrid() {
  if (mirror) { mirror({ hide: true }); return }
  if (!via) return
  via = null; bars.clear()
  stopCount(); shownVia = null; shownParams = null
  emit()
}
// the bursts of the ones just activated here
export function takeMineActivatorFlashes() { return flashes.splice(0) }

// ---------- what the combat brings (by: the local player it counts for; null: a preview or another browser's) ----------

// a note going from (px, py) to (x, y): it counts once, on its way out of an activator, and goes on (a violin's beam
// stops there)
export function mineActivatorNote(px: number, py: number, x: number, y: number, by: string | null, color: string) {
  if (!boxes.length || !mineActivatorStore.armed()) return null
  const hit = mineActivatorNoteHit(boxes, px, py, x, y)
  if (!hit) return null
  if (by) pour(hit.id, 1, 0)
  return { flipX: false, bounce: false, color }
}
// a shot: it stops on the activator and leaves its damage there
export function mineActivatorShot(px: number, py: number, x: number, y: number, damage: number, by: string | null) {
  if (!boxes.length || !mineActivatorStore.armed()) return null
  const hit = mineActivatorShotHit(boxes, px, py, x, y)
  if (!hit) return null
  if (by && damage > 0) pour(hit.box.id, 0, damage)
  return { flipX: hit.flipX }
}
export function mineActivatorBlastHit(x: number, y: number, r: number, damage: number) {
  if (!boxes.length || !mineActivatorStore.armed() || damage <= 0) return
  for (const k of mineActivatorBlast(boxes, x, y, r)) pour(k.box.id, 0, damage * k.part)
}
// a Golpe: an instrument's counts as notes, any other as damage
export function mineActivatorBlowHit(x: number, y: number, angle: number, arc: number, reach: number, damage: number, music: boolean) {
  if (!boxes.length || !mineActivatorStore.armed() || damage <= 0) return
  for (const b of mineActivatorBlow(boxes, x, y, angle, arc, reach)) pour(b.id, music ? mineActivatorBlowNotes(b.params, damage) : 0, music ? 0 : damage)
}

// ---------- online ----------

// mirroring starts (with where what is done here goes) or ends: from then on this browser decides again
export function setMineActivatorMirror(send: ((a: MineActivatorAsk) => void) | null) { mirror = send }
// the owner: another browser's players poured into one, or its admin hid the grid
export function mineActivatorRemote(a: MineActivatorAsk) {
  if ('hide' in a) { const was = mirror; mirror = null; hideActivatedMineGrid(); mirror = was; return }
  const was = mirror
  mirror = null
  if ('key' in a) openMineActivator(a.key)
  else pour(...a.hit)
  mirror = was
}
// the owner's word, for the others
export function mineActivatorOut(): NetMineActivator {
  return { v: viaOut(via), a: activations, i: lastId, b: boxes.map(b => { const k = mineActivatorStore.bars(b.id); return [b.id, k.notes / b.params.notes, k.damage / b.params.damage] }) }
}
// a browser mirroring the owner: its word, as it arrives (a new activation bursts here too)
export function mineActivatorIn(m: NetMineActivator) {
  const next = viaIn(m.v), fresh = m.a !== activations && !!next
  let changed = next !== via || m.a !== activations
  via = next; activations = m.a
  lastId = m.i
  // a new activation counts here too; a hidden grid stops the count
  if (fresh) startCount()
  else if (!next && (countStart !== null || shownVia)) { stopCount(); shownVia = null; shownParams = null }
  for (const [id, n, d] of m.b) {
    const b = boxes.find(o => o.id === id)
    if (!b) continue
    const was = bars.get(id), now = { notes: n * b.params.notes, damage: d * b.params.damage }
    if (!was || was.notes !== now.notes || was.damage !== now.damage) { bars.set(id, now); changed = true }
  }
  for (const id of [...bars.keys()]) if (!m.b.some(x => x[0] === id)) { bars.delete(id); changed = true }
  if (fresh && m.i && boxes.some(b => b.id === m.i)) flashes.push(m.i)
  if (changed) emit()
}

// ---------- slams on their tops ----------

// a player landed holding Chocar at (x, y) (world): on an activator's top (while it can be filled), its option there
// goes to its next value. Whoever may edit the Pátio listens (components/chicken/chicken-patio.tsx saves it in the
// layout, so every browser of the online Pátio has the same grid); for the others it is only a landing.
type SlamFn = (id: string, option: MineActivatorOption) => void
const slamListeners = new Set<SlamFn>()
export function onMineActivatorSlam(fn: SlamFn) { slamListeners.add(fn); return () => { slamListeners.delete(fn) } }
export function mineActivatorSlam(x: number, y: number) {
  if (!boxes.length || !mineActivatorStore.armed()) return
  for (const b of boxes) {
    if (!onMineActivatorTop(b, x, y)) continue
    const option = mineActivatorSlamOption(b, x)
    if (option) slamListeners.forEach(fn => fn(b.id, option))
    return
  }
}
