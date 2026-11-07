// The aliens' catalogue: every alien a song can call is a variation, a base species (its art) plus its parameters:
// body (colour, size, life, points), movement, shot (size, glow, colour, trail, speed, a second note at an interval,
// an echo, the firing sound), rebate (whose transformations count, a scale of its own, a drum instead of a note),
// sounds (the physical and the musical death) and its undead (how long it lies, how fast it walks, the bird it
// becomes). The code brings one base per species and a first batch of variations; editing, duplicating and making
// new ones is saved in this browser, like the items.
import type { Species } from './temple'
import { SPECIES } from './temple'
import type { MoveMode, ShotType, FireSound } from './note-stage'
import { SCALES, type ScaleId } from './music'
import type { RebateRule } from './transforms'
import { isRebateRule } from './transforms'
import { DEATH_SOUNDS, UNDEAD_DEFAULTS, type DeathSounds } from './undead'
import { isBirdId, type BirdId } from './birds'
import { VOICE_LABELS, type Drum, type VoiceId } from './synth'

export type CatalogSpecies = Exclude<Species, 'dragonHead'>
export const CATALOG_SPECIES: CatalogSpecies[] = ['jelly', 'lantern', 'shell', 'twin', 'mini', 'drum', 'dragon']

export type AlienShot = ShotType & {
  trail: number // how long its trail is (0..1)
  harmony: number // a second note fired with each one, this many scale steps above (0: none; 2: a third)
  echo: number // each note fired again this many beats later (0: none)
}
export type AlienVariant = {
  id: string; name: string
  species: CatalogSpecies // the art
  color: string
  size: number // ×, of the species' size
  hp: number; points: number
  move: MoveMode
  zig: { amp: number; period: number } // zigue-zague: px to each side, beats per wave
  turn: number // espiral: degrees round her
  pass: number // passante: px of its closest pass
  after: number // beats after its last note until it touches her (the ones that come in)
  shot: AlienShot
  fire: FireSound
  rule: RebateRule | null // whose transformations count when its notes are rebated (null: the song's)
  scale: ScaleId | null // its rebated notes fit this scale (null: the song's)
  drum: Drum | null // percussion: a rebate plays this drum instead of a note
  death: DeathSounds
  undead: { riseMin: number; riseMax: number; walkSpeed: number; bird: BirdId | null }
  builtin?: boolean // one of the code's (Padrão brings it back; it can't be deleted)
}

export const DRUM_OPTIONS: { value: Drum; label: string }[] = [
  { value: 'taiko', label: 'Taiko' }, { value: 'wood', label: 'Woodblock' }, { value: 'clap', label: 'Palmas' }, { value: 'snare', label: 'Caixa' },
  { value: 'kick', label: 'Bumbo' }, { value: 'hat', label: 'Chimbal' }, { value: 'openHat', label: 'Chimbal aberto' }, { value: 'jingle', label: 'Platinela' },
  { value: 'shaker', label: 'Chocalho' }, { value: 'crash', label: 'Prato' },
]
const isDrum = (v: unknown): v is Drum => DRUM_OPTIONS.some(d => d.value === v)
const isVoice = (v: unknown): v is VoiceId => typeof v === 'string' && v in VOICE_LABELS
const isScale = (v: unknown): v is ScaleId => typeof v === 'string' && v in SCALES
const MOVES: MoveMode[] = ['straight', 'zigzag', 'pass', 'spiral', 'still']

// ---------- the code's ----------

// a species as it was before the catalogue (the test song's aliens)
export function baseVariant(sp: CatalogSpecies): AlienVariant {
  const d = SPECIES[sp]
  return {
    id: sp, name: d.name, species: sp, color: d.color, size: 1, hp: d.hp, points: d.points,
    move: 'straight', zig: { amp: 60, period: 2 }, turn: 90, pass: 220, after: 2,
    shot: { size: 11, glow: 0.7, color: 'degree', speed: 260, trail: 0.3, harmony: 0, echo: 0 },
    fire: { voice: 'bells', vel: 0.07 }, rule: null, scale: null, drum: null,
    death: structuredClone(DEATH_SOUNDS[sp] ?? DEATH_SOUNDS.horde),
    undead: { riseMin: UNDEAD_DEFAULTS.riseMin, riseMax: UNDEAD_DEFAULTS.riseMax, walkSpeed: UNDEAD_DEFAULTS.walkSpeed, bird: null },
    builtin: true,
  }
}
type Tweak = Omit<Partial<AlienVariant>, 'shot' | 'fire' | 'death' | 'undead'> & {
  shot?: Partial<AlienShot>; fire?: Partial<FireSound>; death?: Partial<DeathSounds>; undead?: Partial<AlienVariant['undead']>
}
function variant(sp: CatalogSpecies, id: string, name: string, t: Tweak): AlienVariant {
  const b = baseVariant(sp)
  return {
    ...b, ...t, id, name,
    shot: { ...b.shot, ...t.shot }, fire: { ...b.fire, ...t.fire }, death: { ...b.death, ...t.death }, undead: { ...b.undead, ...t.undead },
  }
}
const drumDeath = (drum: Drum, vel = 0.9) => ({ kind: 'drum' as const, drum, vel })

export const BUILTIN_VARIANTS: AlienVariant[] = [
  ...CATALOG_SPECIES.map(baseVariant),
  // Água-viva
  variant('jelly', 'jelly-sino', 'Sino', { color: '#7bdff2', shot: { color: '#7bdff2', glow: 1, size: 9 }, fire: { voice: 'bells', vel: 0.12 }, death: { physical: drumDeath('wood'), musical: { kind: 'notes', voice: 'bells', shape: 'arp', octave: 2, vel: 0.5 } } }),
  variant('jelly', 'jelly-baixo', 'Baixo', { color: '#5a4fcf', size: 1.25, hp: 45, shot: { size: 18, speed: 170, glow: 0.5 }, fire: { voice: 'bass', vel: 0.14 }, death: { physical: drumDeath('kick', 1), musical: { kind: 'notes', voice: 'bass', shape: 'note', octave: 0, vel: 0.7 } } }),
  variant('jelly', 'jelly-neon', 'Neon', { color: '#7bd88f', move: 'zigzag', zig: { amp: 80, period: 2 }, shot: { glow: 1, trail: 1 } }),
  // Lanterna
  variant('lantern', 'lantern-flauta', 'Flauta', { color: '#ffd166', after: 0.5, shot: { size: 7, speed: 330 }, fire: { voice: 'flute', vel: 0.1 }, death: { musical: { kind: 'notes', voice: 'flute', shape: 'arp', octave: 1, vel: 0.55 } } }),
  variant('lantern', 'lantern-brasa', 'Brasa', { color: '#ff4d2d', shot: { color: '#ff6b35', glow: 0.9, echo: 1, trail: 0.6 }, death: { physical: drumDeath('crash', 0.6) } }),
  variant('lantern', 'lantern-papel', 'Papel', { color: '#f4f1e8', move: 'pass', pass: 200, shot: { size: 9, glow: 0.4 }, fire: { voice: 'harp', vel: 0.08 }, death: { musical: { kind: 'notes', voice: 'harp', shape: 'note', octave: 1, vel: 0.5 } } }),
  // Casco
  variant('shell', 'shell-taiko', 'Taiko', { hp: 160, shot: { size: 16, speed: 200, glow: 0.6 }, death: { physical: drumDeath('taiko', 1) }, drum: null }),
  variant('shell', 'shell-bronze', 'Bronze', { color: '#cd7f32', rule: 'travada', shot: { color: '#e9c46a' }, fire: { voice: 'bells', vel: 0.1 }, death: { physical: drumDeath('crash', 0.9) } }),
  // Gêmeos
  variant('twin', 'twin-tercas', 'Terças', { color: '#4cc9f0', shot: { harmony: 2 } }),
  variant('twin', 'twin-eco', 'Eco', { color: '#b5179e', shot: { echo: 0.5, trail: 0.5 } }),
  // Mini
  variant('mini', 'mini-chocalho', 'Chocalho', { color: '#ffd166', shot: { size: 6, echo: 0.25 }, fire: { voice: 'none', vel: 0 }, drum: 'shaker', death: { physical: drumDeath('shaker', 0.9) } }),
  variant('mini', 'mini-faisca', 'Faísca', { color: '#f9f871', shot: { size: 5, speed: 480, glow: 1, color: '#fff3b0', trail: 0.8 } }),
  // Tambor: percussion only, a rebate is a beat
  variant('drum', 'drum-palmas', 'Palmas', { color: '#f4a261', drum: 'clap', fire: { voice: 'none', vel: 0 }, death: { physical: drumDeath('clap', 1) } }),
  variant('drum', 'drum-caixa', 'Caixa', { color: '#e5e5e5', drum: 'snare', fire: { voice: 'none', vel: 0 }, death: { physical: drumDeath('snare', 1) } }),
  variant('drum', 'drum-bumbo', 'Bumbo', { color: '#7a1c1c', size: 1.2, drum: 'kick', fire: { voice: 'none', vel: 0 }, shot: { size: 15, speed: 220 }, death: { physical: drumDeath('kick', 1) } }),
  // Dragão
  variant('dragon', 'dragon-fogo', 'Fogo', { color: '#ff6b35', scale: 'harmonicMinor', shot: { color: '#ff6b35', glow: 1, trail: 0.8 } }),
  variant('dragon', 'dragon-jade', 'Jade', { color: '#6ee7b7', scale: 'majorPenta', shot: { color: '#6ee7b7' }, fire: { voice: 'bells', vel: 0.1 }, death: { musical: { kind: 'notes', voice: 'bells', shape: 'arp', octave: 1, vel: 0.5 } } }),
]
export const BUILTIN_BY_ID: Record<string, AlienVariant> = Object.fromEntries(BUILTIN_VARIANTS.map(v => [v.id, v]))

// ---------- the numbers (for the panel and for cleaning what was saved) ----------

export type VariantNumber = { path: string; label: string; min: number; max: number; step: number; unit?: string; group: string; hint?: string }
export const VARIANT_NUMBERS: VariantNumber[] = [
  { path: 'size', label: 'Tamanho', min: 0.5, max: 2, step: 0.05, unit: '×', group: 'Corpo' },
  { path: 'hp', label: 'Vida', min: 1, max: 400, step: 1, group: 'Corpo' },
  { path: 'points', label: 'Pontos', min: 0, max: 2000, step: 10, group: 'Corpo' },
  { path: 'after', label: 'Tempos até encostar', min: 0, max: 8, step: 0.5, group: 'Movimento', hint: 'Depois da última nota, quanto falta para encostar nela (os que vêm até ela)' },
  { path: 'zig.amp', label: 'Zigue-zague: largura', min: 0, max: 200, step: 5, unit: 'px', group: 'Movimento' },
  { path: 'zig.period', label: 'Zigue-zague: período', min: 0.25, max: 8, step: 0.25, unit: 'tempos', group: 'Movimento' },
  { path: 'turn', label: 'Espiral: volta', min: -360, max: 360, step: 5, unit: '°', group: 'Movimento' },
  { path: 'pass', label: 'Passante: distância', min: 60, max: 500, step: 10, unit: 'px', group: 'Movimento' },
  { path: 'shot.size', label: 'Tamanho do tiro', min: 3, max: 24, step: 1, unit: 'px', group: 'Tiro' },
  { path: 'shot.glow', label: 'Brilho', min: 0, max: 1, step: 0.05, group: 'Tiro' },
  { path: 'shot.trail', label: 'Rastro', min: 0, max: 1, step: 0.05, group: 'Tiro' },
  { path: 'shot.speed', label: 'Velocidade', min: 80, max: 700, step: 10, unit: 'px/s', group: 'Tiro', hint: 'Quanto antes da hora ele atira' },
  { path: 'shot.harmony', label: 'Intervalo (nota dupla)', min: 0, max: 7, step: 1, unit: 'graus', group: 'Tiro', hint: 'Cada nota sai com outra este tanto de graus acima (2 = terça; 0 = só uma)' },
  { path: 'shot.echo', label: 'Eco', min: 0, max: 4, step: 0.25, unit: 'tempos', group: 'Tiro', hint: 'Cada nota sai de novo este tanto depois (0 = sem eco)' },
  { path: 'fire.vel', label: 'Volume do disparo', min: 0, max: 0.4, step: 0.01, group: 'Tiro' },
  { path: 'death.physical.vel', label: 'Morte física: volume', min: 0.1, max: 1, step: 0.05, group: 'Sons' },
  { path: 'death.musical.octave', label: 'Morte musical: oitava', min: -1, max: 3, step: 1, group: 'Sons' },
  { path: 'death.musical.vel', label: 'Morte musical: volume', min: 0.1, max: 1, step: 0.05, group: 'Sons' },
  { path: 'undead.riseMin', label: 'Levanta depois de (mín.)', min: 0, max: 120, step: 1, unit: 's', group: 'Morto-vivo' },
  { path: 'undead.riseMax', label: 'Levanta depois de (máx.)', min: 0, max: 120, step: 1, unit: 's', group: 'Morto-vivo' },
  { path: 'undead.walkSpeed', label: 'Velocidade andando', min: 0, max: 200, step: 5, unit: 'px/s', group: 'Morto-vivo' },
]
export const VARIANT_GROUPS = ['Corpo', 'Movimento', 'Tiro', 'Rebate', 'Sons', 'Morto-vivo']

export function getPath(o: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), o)
}
export function setPath(o: object, path: string, value: unknown) {
  const keys = path.split('.'), last = keys.pop() as string
  let cur = o as Record<string, unknown>
  for (const k of keys) { if (!cur[k] || typeof cur[k] !== 'object') return; cur = cur[k] as Record<string, unknown> }
  cur[last] = value
}

// a saved variation, cleaned: anything missing or wrong takes its species' base
export function normalizeVariant(v: unknown): AlienVariant | null {
  const s = v as Partial<AlienVariant> | null
  if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !s.id) return null
  const sp = CATALOG_SPECIES.includes(s.species as CatalogSpecies) ? (s.species as CatalogSpecies) : 'jelly'
  const out = structuredClone(BUILTIN_BY_ID[s.id]?.species === sp ? BUILTIN_BY_ID[s.id] : baseVariant(sp))
  out.id = s.id.slice(0, 60); out.species = sp
  out.builtin = !!BUILTIN_BY_ID[out.id]
  if (typeof s.name === 'string' && s.name.trim()) out.name = s.name.trim().slice(0, 40)
  if (typeof s.color === 'string' && /^#[0-9a-f]{6}$/i.test(s.color)) out.color = s.color
  for (const m of VARIANT_NUMBERS) {
    const n = getPath(s, m.path)
    if (typeof n === 'number' && Number.isFinite(n)) setPath(out, m.path, Math.min(m.max, Math.max(m.min, n)))
  }
  if (out.undead.riseMax < out.undead.riseMin) out.undead.riseMax = out.undead.riseMin
  if (MOVES.includes(s.move as MoveMode)) out.move = s.move as MoveMode
  const shotColor = s.shot?.color
  if (shotColor === 'degree' || (typeof shotColor === 'string' && /^#[0-9a-f]{6}$/i.test(shotColor))) out.shot.color = shotColor
  const fv = s.fire?.voice
  if (fv === 'none' || isVoice(fv)) out.fire.voice = fv
  if (s.rule === null || isRebateRule(s.rule)) out.rule = s.rule ?? null
  if (s.scale === null || isScale(s.scale)) out.scale = s.scale ?? null
  if (s.drum === null || isDrum(s.drum)) out.drum = s.drum ?? null
  const ph = s.death?.physical
  if (ph?.kind === 'drum' && isDrum(ph.drum)) out.death.physical = { kind: 'drum', drum: ph.drum, vel: out.death.physical.vel }
  const mu = s.death?.musical
  if (mu?.kind === 'notes' && isVoice(mu.voice) && ['note', 'chord', 'arp'].includes(mu.shape)) {
    const prev = out.death.musical.kind === 'notes' ? out.death.musical : { octave: 1, vel: 0.6 }
    out.death.musical = { kind: 'notes', voice: mu.voice, shape: mu.shape, octave: prev.octave, vel: prev.vel }
  }
  const bird = s.undead?.bird
  if (bird === null || isBirdId(bird)) out.undead.bird = bird ?? null
  return out
}

// ---------- the catalogue (saved in this browser) ----------

export type Catalog = AlienVariant[]
const STORE = 'pigchicken-aliens-v1'
const EVENT = 'pigchicken-aliens'

// the code's ones (edited ones in their place), then the ones made here
export function mergeCatalog(saved: unknown): Catalog {
  const list = Array.isArray(saved) ? saved.map(normalizeVariant).filter((v): v is AlienVariant => !!v) : []
  const byId = new Map(list.map(v => [v.id, v]))
  return [...BUILTIN_VARIANTS.map(b => byId.get(b.id) ?? structuredClone(b)), ...list.filter(v => !BUILTIN_BY_ID[v.id])]
}
export function loadCatalog(): Catalog {
  try { return mergeCatalog(JSON.parse(window.localStorage.getItem(STORE) || 'null')?.variants) } catch { return mergeCatalog(null) }
}
export function saveCatalog(c: Catalog) {
  // only what differs from the code is kept
  const keep = c.filter(v => !v.builtin || JSON.stringify(v) !== JSON.stringify(BUILTIN_BY_ID[v.id]))
  try { window.localStorage.setItem(STORE, JSON.stringify({ variants: keep, _v: 1 })) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}
export function subscribeCatalog(onChange: (c: Catalog) => void) {
  const handler = () => onChange(loadCatalog())
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

// a copy with a new id and name ("Sino 2")
export function duplicateVariant(c: Catalog, v: AlienVariant): AlienVariant {
  const ids = new Set(c.map(x => x.id)), names = new Set(c.map(x => x.name))
  let n = 2
  while (ids.has(`${v.id}-${n}`) || names.has(`${v.name} ${n}`)) n++
  return { ...structuredClone(v), id: `${v.id}-${n}`, name: `${v.name} ${n}`, builtin: false }
}

// the variation an alien of a song is: by its id, else its species' base
export function variantFor(c: Catalog, id: string | undefined, species: Species): AlienVariant {
  const sp: CatalogSpecies = species === 'dragonHead' ? 'dragon' : species
  return (id && c.find(v => v.id === id)) || c.find(v => v.id === sp) || baseVariant(sp)
}

// what an alien of this variation carries in its target's data (the combat reads its deaths and its undead from it)
export function variantData(v: AlienVariant) {
  return {
    kind: 'temple' as const, species: v.species, color: v.color, variant: v.id, size: v.size,
    death: v.death, undead: v.undead,
  }
}
export const variantSize = (v: AlienVariant) => ({ w: SPECIES[v.species].w * v.size, h: SPECIES[v.species].h * v.size })
