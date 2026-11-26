// Birds as a class: what an alien becomes when notes fill its harmony (and an undead alien, resurrected). Each type
// has its look (size, colours, wing beat), its voice and the phrase it sings, how it flies (away, circling, perching)
// and its whistle: every so often it sings a recording of its real bird and lets out a note she can rebate. The undead modifier greys any type, gives it
// eyes in the colour of the note that brought it back and sings its phrase in minor (or diminished).
import { msg } from '../i18n'
import type { RebateRule } from './transforms'
import { applyChain, newTransform, stepScale, type Harmony, type NoteOut } from './transforms'
import type { VoiceId } from './synth'
import type { BirdPerchParams } from './bird-perch'
import type { PoopParams } from './poop'

export type BirdId = 'pardal' | 'bemtevi' | 'sabia' | 'canario' | 'coruja'
export type BirdFlight = 'leave' | 'circle' | 'perch'
export type BirdType = {
  id: BirdId; name: string
  pixel: number // size of one pixel of its drawing (px)
  body: string; wing: string; belly: string; beak: string
  flap: number // wing beats a second
  voice: VoiceId // its phrase's voice (the resurrection's and, when its real bird has no recording, the whistle's)
  guide: string // its real bird of the Guia de pássaros (lib/pigchicken/bird-guide.ts): its whistle is one of that bird's recordings
  // its song: scale steps from the note it starts on, and how long each note lasts (beats)
  phrase: { steps: number[]; beats: number[] }
  flight: BirdFlight
  stay: number // s it circles or perches before leaving
  whistle: { min: number; max: number } // s between whistles (0: it never whistles)
  shot: { size: number; speed: number }
  rule?: RebateRule // whose transformations count when its notes are rebated
  // how it rests on the wires and runs from players (lib/pigchicken/bird-perch.ts; missing: the defaults)
  perch?: Partial<BirdPerchParams>
  // "cagar": every so many seconds it lets a dropping fall on whoever is under it, and what it takes from an enemy
  // (lib/pigchicken/poop.ts; missing: it has no such power)
  poop?: PoopParams
}

export const BIRDS: Record<BirdId, BirdType> = {
  pardal: { id: 'pardal', name: msg("Pardal"), pixel: 4, body: '#a47148', wing: '#6f4a2f', belly: '#e8d5b5', beak: '#ffb347', flap: 9, voice: 'pizz', guide: 'passer-domesticus', phrase: { steps: [0, 0, 2], beats: [0.25, 0.25, 0.5] }, flight: 'leave', stay: 0, whistle: { min: 3, max: 6 }, shot: { size: 8, speed: 300 }, perch: { perchChance: 0.7, perchTime: 12, alert: 150, flee: 0.45, platforms: 0.7, objects: 0.6 }, poop: { every: 10, damage: 1 } },
  bemtevi: { id: 'bemtevi', name: msg("Bem-te-vi"), pixel: 4, body: '#7a5c3a', wing: '#5a4128', belly: '#ffd23f', beak: '#2b2b2b', flap: 8, voice: 'bells', guide: 'pitangus-sulphuratus', phrase: { steps: [0, 2, 4], beats: [0.25, 0.25, 0.75] }, flight: 'circle', stay: 6, whistle: { min: 2.5, max: 5 }, shot: { size: 9, speed: 320 }, perch: { perchChance: 0.6, perchTime: 10, alert: 170, flee: 0.55, fleeSpeed: 0.65 }, poop: { every: 12, damage: 2 } },
  sabia: { id: 'sabia', name: msg("Sabiá"), pixel: 5, body: '#8b6b4a', wing: '#6d523a', belly: '#e07a3f', beak: '#e9c46a', flap: 7, voice: 'flute', guide: 'turdus-rufiventris', phrase: { steps: [4, 2, 0, 1, 0], beats: [0.5, 0.25, 0.25, 0.5, 1] }, flight: 'perch', stay: 8, whistle: { min: 4, max: 8 }, shot: { size: 10, speed: 260 }, perch: { perchChance: 0.8, perchTime: 16, alert: 120, flee: 0.3, fleeSpeed: 0.5, trees: 1, wires: 0.6 } },
  canario: { id: 'canario', name: msg("Canário"), pixel: 3, body: '#ffd23f', wing: '#f4a261', belly: '#fff3b0', beak: '#f77f00', flap: 12, voice: 'flute', guide: 'sicalis-flaveola', phrase: { steps: [0, 2, 4, 7, 4], beats: [0.125, 0.125, 0.125, 0.25, 0.5] }, flight: 'circle', stay: 5, whistle: { min: 2, max: 4 }, shot: { size: 7, speed: 360 }, perch: { perchChance: 0.5, perchTime: 9, alert: 220, flee: 0.85, fleeSpeed: 0.75, cooldown: 0.9 } },
  coruja: { id: 'coruja', name: msg("Coruja"), pixel: 5, body: '#6b5b4b', wing: '#4a3f35', belly: '#cbb89d', beak: '#e9c46a', flap: 5, voice: 'hum', guide: 'athene-cunicularia', phrase: { steps: [0, -3], beats: [0.75, 1] }, flight: 'perch', stay: 10, whistle: { min: 5, max: 9 }, shot: { size: 12, speed: 220 }, perch: { perchChance: 0.9, perchTime: 22, alert: 90, flee: 0.15, fleeSpeed: 0.4, cooldown: 3, trees: 1, wires: 0.4, platforms: 0.5, objects: 0.5 } },
}
export const BIRD_IDS = Object.keys(BIRDS) as BirdId[]
export const isBirdId = (v: unknown): v is BirdId => typeof v === 'string' && v in BIRDS

// the birds of each place: by the scene's zone (a Zona sonora or a song can give its own list)
export const ZONE_BIRDS: Record<string, BirdId[]> = {
  campo: ['pardal', 'bemtevi'], noite: ['coruja'], feira: ['canario', 'bemtevi'], ceu: ['sabia', 'canario'], blues: ['sabia', 'pardal'],
}
export const DEFAULT_BIRDS: BirdId[] = ['bemtevi', 'canario', 'sabia']
export function birdsFor(zoneId: string, list?: BirdId[] | null): BirdId[] {
  if (list?.length) return list
  return ZONE_BIRDS[zoneId] ?? (zoneId.startsWith('templo') ? ['canario', 'sabia'] : DEFAULT_BIRDS)
}
export const pickBird = (list: BirdId[], rand: () => number = Math.random): BirdId => list[Math.min(list.length - 1, Math.floor(rand() * list.length))] ?? 'pardal'

// the undead modifier: its colours and how its notes darken (the degree stays, the scale changes)
export type UndeadMode = 'parallel' | 'relative' | 'diminished'
export const UNDEAD_MODES: { value: UndeadMode; label: string }[] = [
  { value: 'parallel', label: msg("Menor paralela") }, { value: 'relative', label: msg("Menor relativa") }, { value: 'diminished', label: msg("Diminuta") },
]
export const UNDEAD_LOOK = { body: '#8d9096', wing: '#6b6e74', belly: '#b9bcc1', beak: '#55585d' }
export const UNDEAD_EYE = '#ff3b3b'

export function birdColors(type: BirdType, undead: boolean) {
  return undead ? UNDEAD_LOOK : { body: type.body, wing: type.wing, belly: type.belly, beak: type.beak }
}

// its song starting on `from` (inside the harmony), darkened when undead; times in seconds from now
export function birdPhrase(type: BirdType, from: number, h: Harmony, undead?: UndeadMode | null, vel = 0.5): NoteOut[] {
  let at = 0
  const notes: NoteOut[] = type.phrase.steps.map((s, i) => {
    const dur = (type.phrase.beats[i] ?? 0.25) * h.spb
    const o: NoteOut = { midi: stepScale(h, from, s), at, dur: dur * 0.9, vel, voice: type.voice }
    at += dur
    return o
  })
  if (!undead) return notes
  return applyChain(notes, [{ ...newTransform('parallel'), mode: undead }], { ...h, combo: 0, angle: 0, byAngle: () => from, rand: () => 0 })
}
