// How a zone's ambience breathes as it plays (pure): the background sits behind the players' notes, every hit has
// its own weight (where it falls in the bar, a touch of chance, the swell of the phrase), the layers come in one by
// one when the ambience starts, phrases of 4 and 8 bars thin out and end in a light pickup, and the base pattern of
// a beat hands over to one of its variations for a phrase in every 16 bars. zone-ambience.ts says what the beat
// writes on each sixteenth; this says how it is played. Everything is decided by the bar and the step (no
// Math.random), so it costs a few multiplications per hit and two plays of the same bar are the same.
// A zone's own grid (drawn in the panel) keeps every note: it only gets the weights and the entry.
import type { DrumRow, Kit } from './beat-kits'
import { STEPS } from './beats'
import type { Feel } from './music'
import { ambienceBeatPattern, ambienceGrid, beatHits, beatOf, drumRow, microAt, type ZoneAmbience } from './zone-ambience'

// the whole background under the players' notes, as a share of the Ambiente volume (the panel's knobs still go
// from 0 to 100% of it)
export const ZONE_MIX = { beat: 0.7, bass: 0.66, drone: 0.75 }

// the rows in three layers: the low drums first, then what keeps time, then the backbeat and the colours
const LAYER: Record<DrumRow, 0 | 1 | 2> = { kick: 0, tom: 0, hat: 1, shaker: 1, snare: 2, clap: 2, perc: 2, openHat: 2 }
// each row's place in the mix: the cymbals and shakers further back
const ROW_MIX: Record<DrumRow, number> = { kick: 1, tom: 0.85, snare: 0.9, clap: 0.85, perc: 0.75, hat: 0.68, openHat: 0.6, shaker: 0.62 }
// the rows that sound in the first bars of a phrase when a pattern has more (by importance); the rest join on the
// third bar
const ORDER: DrumRow[] = ['kick', 'snare', 'clap', 'hat', 'shaker', 'tom', 'openHat', 'perc']
const CAP = 4
// the swell of an 8-bar phrase and the level of the first bars after the ambience starts
const SWELL = [0.9, 0.93, 0.96, 1, 0.91, 0.94, 0.97, 1]
const WARM = [0.72, 0.84, 0.94, 1]
// the kits of drum machines: no ghost notes
const MACHINES = new Set(['house', 'techno', 'trap', 'dembow'])

// a number in [0, 1) for a bar, a step and a salt: the same every time
export function chance(bar: number, step: number, salt: number) {
  let h = Math.imul((bar | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((step | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(salt | 0, 0x27d4eb2f)
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15
  return (h >>> 0) / 4294967296
}
const salt = (row: DrumRow) => ORDER.indexOf(row) + 1

// the ambience a bar plays: the base pattern of a beat hands over to its `rotate` variation in bars 8 to 11 of
// every 16 (not a zone's own grid, a variation chosen in the panel, or a block of a cycle)
export function rotatedAmbience(a: ZoneAmbience, bar: number, arranged = false): ZoneAmbience {
  const beat = beatOf(a.beat), b = ((bar % 16) + 16) % 16
  if (arranged || a.drums || a.variant || !beat?.rotate || b < 8 || b > 11) return a
  return { ...a, variant: beat.rotate }
}

export type ZoneHit = { drum: DrumRow; vel: number; tone: number; shift: number }
// what plays on a sixteenth of a bar, with the weight of each hit. vel: the level (the zone's Volume, the mix and
// the dynamics); tone: how hard it is struck, for its brightness (0..1, without the volume). warm: whole bars the
// ambience has played since it started (zone-dynamics createAmbienceEntry)
export function zoneHits(a: ZoneAmbience, step: number, bar: number, opts: { feel?: Feel; warm?: number; arranged?: boolean; kit?: Kit } = {}): ZoneHit[] {
  const { feel = 'straight', warm = 99, arranged = false, kit } = opts
  const play = rotatedAmbience(a, bar, arranged), beat = beatOf(play.beat), pattern = ambienceBeatPattern(play)
  const own = !!play.drums, vol = (play.beatVol ?? 100) / 100, grid = ambienceGrid(play)
  const b8 = ((bar % 8) + 8) % 8, b4 = b8 % 4
  const calm = beat?.group === 'Suave', fill = !own && !calm && !pattern?.beats
  // the rows that may sound in this bar: by layer while the ambience comes in, by importance early in a phrase
  const rows = new Set<DrumRow>(ORDER.filter(r => drumRow(grid, r) !== '.'.repeat(STEPS)))
  const capped = !own && b4 < 2 && rows.size > CAP ? new Set(ORDER.filter(r => rows.has(r)).slice(0, CAP)) : null
  const level = (row: DrumRow, tone: number, st: number) => {
    const metric = LAYER[row] === 0 ? 1 : st % 4 === 0 ? 1 : st % 2 === 0 ? 0.93 : 0.86
    const human = 1 + (chance(bar, st, salt(row)) - 0.5) * 0.12
    return { vel: tone * 0.9 * metric * human * SWELL[b8] * WARM[Math.min(warm, WARM.length - 1)] * ROW_MIX[row] * ZONE_MIX.beat, tone: Math.min(1, tone * human * metric) }
  }
  const out: ZoneHit[] = []
  for (const hit of beatHits(play, step, feel)) {
    const row = hit.drum, tone = hit.vel / vol
    if (LAYER[row] > warm) continue
    if (capped && !capped.has(row)) continue
    if (!own && LAYER[row] === 1) {
      // the cymbals and shakers breathe: some soft off-beat notes rest, the first half of a phrase is lighter
      // between the beats (it fills up towards the end), the 6th bar of 8 keeps only the eighths, and they make
      // room for the pickup at the end of a phrase
      if (step % 2 === 1 && tone <= 0.5 && chance(bar, step, 40 + salt(row)) < 0.3) continue
      if (b4 < 2 && step % 4 !== 0 && chance(bar, step, 50 + salt(row)) < 0.35) continue
      if (b8 === 5 && step % 2 === 1) continue
      if (fill && b4 === 3 && step >= 13) continue
    }
    const l = level(row, tone, step)
    out.push({ drum: row, vel: l.vel * vol, tone: l.tone, shift: hit.shift })
  }
  if (!fill || !beat) return out
  // a light pickup closing each 4 bars (a bit more at 8, the tom at 16), and a ghost note now and then in the
  // middle of a phrase. Only where the row is in the kit and the pattern leaves the step free
  const free = (row: DrumRow) => (!kit || !!kit[row]) && drumRow(grid, row)[step] === '.' && !out.some(h => h.drum === row)
  const add = (row: DrumRow, tone: number) => {
    if (!free(row) || LAYER[row] > warm) return
    const l = level(row, tone, step)
    out.push({ drum: row, vel: l.vel * vol, tone: l.tone, shift: (microAt(beat, step) + (beat.lag?.[row] ?? 0)) / 100 })
  }
  const roll: DrumRow = rows.has('snare') || !rows.has('perc') ? 'snare' : 'perc'
  if (b4 === 3) {
    if (((bar % 16) + 16) % 16 === 15 && step === 15) add(kit && !kit.tom ? roll : 'tom', 0.55)
    else if (b8 === 7 && step >= 13) add(roll, [0.3, 0.4, 0.5][step - 13])
    else if (b8 === 3 && step === 15 && chance(bar, step, 78) < 0.5) add(roll, 0.35)
  } else if ((b4 === 1 || b4 === 2) && step % 2 === 1 && rows.has('snare') && !MACHINES.has(beat.kit) && chance(bar, step, 77) < 0.06) add('snare', 0.26)
  return out
}

// the bass notes of a sixteenth, with the same weights: further back, the phrase's swell, the entry, and in the
// 6th bar of 8 the notes between the beats rest now and then
export function zoneBassLevel(step: number, bar: number, warm = 99): number {
  const b8 = ((bar % 8) + 8) % 8
  if (b8 === 5 && step % 4 !== 0 && chance(bar, step, 91) < 0.5) return 0
  return ZONE_MIX.bass * SWELL[b8] * WARM[Math.min(warm, WARM.length - 1)] * (1 + (chance(bar, step, 92) - 0.5) * 0.08)
}

// how many whole bars the ambience has been playing: after a bar or more of silence (no zone with music, the music
// toggle off, the Templo) it comes in again from 0, layer by layer. at(): every sixteenth, whether it sounds
export function createAmbienceEntry() {
  let silent = Infinity, bars = 0
  return {
    at(audible: boolean, step: number): number {
      if (!audible) { silent++; return 0 }
      if (silent >= STEPS) bars = 0
      else if (step === 0) bars++
      silent = 0
      return bars
    },
  }
}

// ---------- the music switch: a record stopping ----------

// how long the background takes to stop when the zone's music is switched off (s)
export const RECORD_STOP = 0.4
// the fall of the pitch while it stops, in cents: the turntable's speed drops evenly to almost nothing, so the
// pitch slides slowly at first and plunges at the end (the last point: 1/20 of the speed, more than 5 octaves down)
export function recordStopCurve(n = 24): Float32Array {
  return Float32Array.from({ length: n }, (_, i) => 1200 * Math.log2(0.05 + 0.95 * (1 - i / (n - 1))))
}

// watches the zone she is in, frame by frame: true once, when the same zone's music was just switched off (walking
// into a quiet zone is not a switch: it fades over the bar like any change of zone)
export function createZoneSwitchWatch() {
  let last: { id: string; on: boolean } | null = null
  return {
    off(id: string | null, on: boolean): boolean {
      const was = last
      last = id === null ? null : { id, on }
      return !!was && was.id === id && was.on && !on
    },
  }
}
