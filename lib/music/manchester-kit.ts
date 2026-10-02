import * as manchesterPreset from '../../public/presets/manchester-1999.json'
import { creativeSchema, type CreativeSession } from './creative'

export const MANCHESTER_JAZZ_CITY = 'manchester-1999'
export const MANCHESTER_JAZZ_REVISION = 'manchester-2026-10-02-midi-v6'

export function createManchesterJazzKit(): CreativeSession {
  // Parsing clones the migrated rolls, global arrangement and baked articulations.
  const kit = creativeSchema.parse(manchesterPreset)
  kit.cityId = MANCHESTER_JAZZ_CITY
  kit.catalogRevision = MANCHESTER_JAZZ_REVISION
  for (const piece of kit.pieces) {
    piece.square = piece.origin
    piece.active = piece.color === 'w'
  }
  return kit
}
