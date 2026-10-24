import { pieceSection } from './arrangement'
import { creativeSchema, type CreativeSession } from './creative'

function teamKit(color: 'w' | 'b', whiteKit: CreativeSession, blackKit: CreativeSession) {
  return color === 'w' ? whiteKit : blackKit
}

/**
 * Compose the two players' voices over the host's shared musical context.
 * Piece identities stay stable; only each color's voice-owned data is selected.
 */
export function combineOnlineKits(
  whiteKit: CreativeSession,
  blackKit: CreativeSession,
  contextKit: CreativeSession,
): CreativeSession {
  const combined = globalThis.structuredClone(contextKit)

  for (const piece of combined.pieces) {
    const source = teamKit(piece.color, whiteKit, blackKit)
    const instrument = globalThis.structuredClone(source.instruments[piece.id])
    const sourceSections = source.arrangement.sections

    instrument.arrangement = {
      restart: instrument.arrangement?.restart ?? false,
      sections: Object.fromEntries(combined.arrangement.sections.map((section, index) => {
        const sourceIndex = index % sourceSections.length
        const assignment = pieceSection(instrument, source.arrangement, sourceIndex)
        return [section.id, {
          ...assignment,
          variation: assignment.variation === null ? null : assignment.variation % instrument.pianoRolls.length,
        }]
      })),
    }

    combined.instruments[piece.id] = instrument
    combined.effects[piece.id] = globalThis.structuredClone(source.effects[piece.id])
    combined.mappings[piece.id] = globalThis.structuredClone(source.mappings[piece.id])
  }

  return creativeSchema.parse(combined)
}
