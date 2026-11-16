// What the Escalas panel's preview (components/pigchicken/scale-preview.tsx) is drawn with: the Pátio's own
// conductor, so the preview is in the key and on the bar's chord the player hears (a conductor of its own while no
// Pátio runs), and the instrument whose numbers (register, span, Hangdrum rows…) the drawing takes.
import { createConductor, type Conductor } from './music'
import { ITEM_IDS, type ItemDef, type ItemId } from './items'
import type { InstrumentScaleId } from './instrument-scales'

let stage: Conductor | null = null
let own: Conductor | null = null
/** The Pátio says which conductor it plays with. */
export const setScaleStage = (music: Conductor) => { stage = music }
/** The Pátio that closes takes its conductor away (unless another one already took its place). */
export const dropScaleStage = (music: Conductor) => { if (stage === music) stage = null }
export const scaleStage = (): Conductor => stage ?? (own ??= createConductor())

/**
 * The instrument a scale's preview takes its numbers from: the one the main player holds, when it can play that
 * scale; otherwise the first instrument that lists it (null: no instrument plays it).
 */
export function previewInstrument(items: Record<ItemId, ItemDef>, scale: InstrumentScaleId, held: ItemId | null): ItemDef | null {
  const plays = (id: ItemId) => items[id].instrument && items[id].scales.includes(scale)
  const id = held && plays(held) ? held : ITEM_IDS.find(plays)
  return id ? items[id] : null
}
