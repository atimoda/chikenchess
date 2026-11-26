// The styles a Zona sonora can start from: each one a whole zone (key, scale, chords, progression, tempo, feel, beat
// and bass) around one of the rhythms of beats.ts. The Editar of a zone lists them under the scenes' zones (music.ts
// ZONES) in its first dropdown; picking one fills the chosen block. Pure data.
// To add a style: one entry in ZONE_STYLES (its beat and bass are ids of zone-ambience.ts).
import { msg } from '../i18n'
import { ZONES, type Zone } from './music'
import type { BeatGroup } from './beats'
import { legacyAmbience, type ZoneAmbience } from './zone-ambience'

export type ZoneStyle = Omit<Zone, 'ambience' | 'blocks' | 'inKey'> & { group: BeatGroup; ambience: ZoneAmbience }

const style = (group: BeatGroup, s: Omit<ZoneStyle, 'group'>): ZoneStyle => ({ group, ...s })

export const ZONE_STYLES: ZoneStyle[] = [
  // ---------- Pop e rock ----------
  style(msg('Pop e rock'), { id: 'pop', name: msg('Pop'), root: 60, scale: 'majorPenta', chordScale: 'major', bpm: 112, feel: 'straight', progression: [0, 4, 5, 3], color: '#ff8fab', ambience: { beat: 'straight', bass: 'eighths' } }),
  style(msg('Pop e rock'), { id: 'ballad', name: msg('Balada'), root: 65, scale: 'major', chordScale: 'major', bpm: 72, feel: 'half', progression: [5, 3, 0, 4], color: '#a0c4ff', ambience: { beat: 'half', bass: 'pad' } }),
  // Em D A Em: the dorian IV is major
  style(msg('Pop e rock'), { id: 'rock', name: msg('Rock'), root: 64, scale: 'minorPenta', chordScale: 'dorian', bpm: 124, feel: 'straight', progression: [0, 6, 3, 0], color: '#ff6b5b', ambience: { beat: 'rock', bass: 'eighths' } }),
  style(msg('Pop e rock'), { id: 'disco', name: msg('Disco'), root: 57, scale: 'dorian', chordScale: 'dorian', bpm: 120, feel: 'straight', progression: [0, 1, 0, 1], color: '#ff4fd8', ambience: { beat: 'disco', bass: 'octaves' } }),
  style(msg('Pop e rock'), { id: 'funk', name: msg('Funk'), root: 64, scale: 'minorPenta', chordScale: 'dorian', bpm: 104, feel: 'straight', progression: [0], color: '#ffb347', ambience: { beat: 'funk', bass: 'funk' } }),
  style(msg('Pop e rock'), { id: 'jazz', name: msg('Jazz'), root: 65, scale: 'major', chordScale: 'major', bpm: 132, feel: 'swing', progression: [1, 4, 0, 0], color: '#4cc9f0', ambience: { beat: 'swing', bass: 'walking' } }),
  // ---------- Eletrônica ----------
  style(msg('Eletrônica'), { id: 'house', name: msg('House'), root: 60, scale: 'dorian', chordScale: 'dorian', bpm: 124, feel: 'straight', progression: [0, 3, 0, 3], color: '#7b8cff', ambience: { beat: 'house', bass: 'offbeat' } }),
  style(msg('Eletrônica'), { id: 'techno', name: msg('Techno'), root: 55, scale: 'minorPenta', chordScale: 'minor', bpm: 130, feel: 'straight', progression: [0], color: '#c77dff', ambience: { beat: 'techno', bass: 'acid' } }),
  style(msg('Eletrônica'), { id: 'trap', name: msg('Trap'), root: 59, scale: 'harmonicMinor', chordScale: 'harmonicMinor', bpm: 140, feel: 'half', progression: [0, 5, 0, 4], color: '#ff4d6d', ambience: { beat: 'trap', bass: 'pulse' } }),
  style(msg('Eletrônica'), { id: 'boombap', name: msg('Boom bap'), root: 62, scale: 'minor', chordScale: 'minor', bpm: 90, feel: 'straight', progression: [0, 5, 3, 4], color: '#d4a373', ambience: { beat: 'boombap', bass: 'pulse' } }),
  // ---------- Brasil ----------
  style(msg('Brasil'), { id: 'bossa', name: msg('Bossa nova'), root: 60, scale: 'major', chordScale: 'major', bpm: 120, feel: 'straight', progression: [1, 4, 0, 0], color: '#4cc9a0', ambience: { beat: 'bossa', bass: 'bossa' } }),
  // I vi ii V
  style(msg('Brasil'), { id: 'samba', name: msg('Samba'), root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 104, feel: 'straight', progression: [0, 5, 1, 4], color: '#2ec27e', ambience: { beat: 'samba', bass: 'octaves' } }),
  // A G D A: the mixolydian of the Northeast
  style(msg('Brasil'), { id: 'baiao', name: msg('Baião'), root: 57, scale: 'mixolydian', chordScale: 'mixolydian', bpm: 112, feel: 'straight', progression: [0, 6, 3, 0], color: '#ffd166', ambience: { beat: 'baiao', bass: 'baiao' } }),
  // ---------- Mundo ----------
  style(msg('Mundo'), { id: 'reggae', name: msg('Reggae'), root: 55, scale: 'majorPenta', chordScale: 'major', bpm: 76, feel: 'straight', progression: [0, 3, 4, 3], color: '#34a853', ambience: { beat: 'reggae', bass: 'reggae' } }),
  style(msg('Mundo'), { id: 'reggaeton', name: msg('Reggaeton'), root: 61, scale: 'minor', chordScale: 'minor', bpm: 95, feel: 'straight', progression: [0, 5, 2, 6], color: '#f77f00', ambience: { beat: 'dembow', bass: 'pulse' } }),
  style(msg('Mundo'), { id: 'afrobeat', name: msg('Afrobeat'), root: 62, scale: 'dorian', chordScale: 'dorian', bpm: 110, feel: 'straight', progression: [0, 3, 0, 3], color: '#e76f51', ambience: { beat: 'afro', bass: 'funk' } }),
  // ---------- Lo-fi ----------
  // the game's own lo-fi tracks: seventh chords on a worn electric piano over a sleepy, dusty kit
  // Eb: ii7 V7 Imaj7 vi7, the soft turnaround
  style(msg('Lo-fi'), { id: 'lofi', name: msg('Lo-fi'), root: 63, scale: 'majorPenta', chordScale: 'major', bpm: 78, feel: 'straight', progression: [1, 4, 0, 5], color: '#b8a1d9', ambience: { beat: 'lofi', bass: 'keys' } }),
  // F: IVmaj7 iii7 ii7 Imaj7, walking down to home
  style(msg('Lo-fi'), { id: 'cafe', name: msg('Café'), root: 65, scale: 'major', chordScale: 'major', bpm: 86, feel: 'straight', progression: [3, 2, 1, 0], color: '#d4a59a', ambience: { beat: 'cafe', bass: 'keysWalk' } }),
  // A dorian: i7 and the bright IV7, swaying slowly
  style(msg('Lo-fi'), { id: 'chuva', name: msg('Chuva'), root: 57, scale: 'dorian', chordScale: 'dorian', bpm: 70, feel: 'straight', progression: [0, 3], color: '#8fb3c9', ambience: { beat: 'chuva', bass: 'keysHeld' } }),
  // C minor: VImaj7 iv7 i7 i7, late at night
  style(msg('Lo-fi'), { id: 'madrugada', name: msg('Madrugada'), root: 60, scale: 'minorPenta', chordScale: 'minor', bpm: 72, feel: 'straight', progression: [5, 3, 0, 0], color: '#6d6a9c', ambience: { beat: 'lofi', bass: 'lofiBass' } }),
  // ---------- Suave ----------
  style(msg('Suave'), { id: 'pulse', name: msg('Pulso'), root: 65, scale: 'lydian', chordScale: 'lydian', bpm: 72, feel: 'straight', progression: [0, 1, 0, 1], color: '#bde0fe', ambience: { beat: 'pulse', bass: 'pad' } }),
]
export const ZONE_STYLE_GROUPS: BeatGroup[] = [...new Set(ZONE_STYLES.map(s => s.group))]

// every preset of the first dropdown: the scenes' zones, then the styles
export type ZonePreset = Pick<ZoneStyle, 'id' | 'name' | 'root' | 'scale' | 'chordScale' | 'bpm' | 'feel' | 'progression' | 'color' | 'ambience'>
const SCENE_PRESETS: ZonePreset[] = ZONES.map(z => ({ ...z, ambience: z.ambience ?? legacyAmbience(z.feel) }))
export const ZONE_PRESETS: ZonePreset[] = [...SCENE_PRESETS, ...ZONE_STYLES]
export const zonePreset = (id: string) => ZONE_PRESETS.find(p => p.id === id)

// what a block takes from a preset (its name and colour go to the zone)
export const presetSequence = (p: ZonePreset) => ({
  root: p.root, scale: p.scale, chordScale: p.chordScale, bpm: p.bpm, feel: p.feel, progression: p.progression.slice(),
  ambience: { beat: p.ambience.beat, bass: p.ambience.bass },
})

type Sequence = { root: number; scale: string; chordScale: string; bpm: number; feel: string; progression: number[]; ambience: ZoneAmbience }
const sameList = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])
// the preset a block still sounds like ('silence' for a block with no beat and no bass; '' once it was changed), so the
// dropdown shows where the block stands
export function presetOf(s: Sequence): string {
  const a = s.ambience
  if (a.drums) return ''
  if (a.beat === 'none' && a.bass === 'none') return 'silence'
  const p = ZONE_PRESETS.find(p => p.root === s.root && p.scale === s.scale && p.chordScale === s.chordScale && p.bpm === s.bpm && p.feel === s.feel
    && sameList(p.progression, s.progression) && p.ambience.beat === a.beat && p.ambience.bass === a.bass)
  return p?.id ?? ''
}
