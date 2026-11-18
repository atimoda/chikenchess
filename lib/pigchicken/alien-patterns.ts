// The horde's patterns (the Padrão dos aliens button): the Parquinho's own Fileira and the formation of each stage of
// the Templo do Gongo (its species row by row, its columns and spacing). In the horde they all move the same way
// (sideways, a step down at the scene's sides); the temple's own tricks (dives, bombs, the drum's beat) stay there.
import { HORDE_ROW, type AlienPatternDef } from './enemies'
import { JELLY_COLORS, SPECIES, STAGES } from './temple'

// the temple spaces its formations this far apart (temple.ts startStage)
const TEMPLE_GAP = 84

export const ALIEN_PATTERNS: AlienPatternDef[] = [
  HORDE_ROW,
  ...STAGES.flatMap((st, i): AlienPatternDef[] => st.dragon || !st.rows.length ? [] : [{
    id: `stage-${i}`, label: st.name, cols: st.cols, gap: TEMPLE_GAP,
    rows: st.rows.map((sp, r) => {
      const d = SPECIES[sp]
      return { species: sp, hp: d.hp, w: d.w, h: d.h, color: sp === 'jelly' ? JELLY_COLORS[(r + i) % JELLY_COLORS.length] : d.color }
    }),
  }]),
]

/** the pattern at a place of the list (the button's, or one asked online), the Fileira when out of it */
export const alienPattern = (i: number | undefined) => ALIEN_PATTERNS[i ?? 0] ?? HORDE_ROW
