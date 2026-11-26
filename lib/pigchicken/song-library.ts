// The songs (the guitar hero mode): a song is a stage, its whole sequence of aliens from the first bar to the last.
// The jukebox in the temple lists the code's songs, the old campaign as its own disc ("Campanha do Gongo") and the
// ones saved here ("Salvar como"); the one picked is the one the gong starts. Saved in this browser for now, with
// each song's record. Signed in with an account, the saved ones also go to the account (lib/pigchicken/song-online.ts):
// every change here is marked to be sent, and the sync brings back what was saved on other browsers.
import { LINE_PLACES, SPEAKERS, TEST_SONG, songEnd, type LinePlace, type NoteMode, type Song, type SongAlien, type SongLine, type SongNote, type SongPause, type MoveMode } from './note-stage'
import { songFan } from './fan'
import { normalizeLanes, normalizeSoundZone } from './sound-zones'
import type { Fan } from './fan'
import { msg, t } from '../i18n'
import type { Layer } from './temple-music'
import { isRebateRule } from './transforms'
import { SPECIES, type Species } from './temple'

export const CAMPAIGN_ID = 'campanha'
export const CAMPAIGN = { id: CAMPAIGN_ID, name: msg('Campanha do Gongo'), color: '#ffd166' }

// how a song's cover is drawn: Sulco (a record seen from above, time spiralling out) or Grade (the timeline folded
// into rows of 4 bars, like a piano roll)
export type CoverStyle = 'sulco' | 'grade'
export type CoverPalette = 'grau' | 'zona' | 'mono'
export type SongCover = { style: CoverStyle; palette: CoverPalette; bg: string }
export const COVER_STYLES: { value: CoverStyle; label: string }[] = [{ value: 'sulco', label: msg('Sulco') }, { value: 'grade', label: msg('Grade') }]
export const COVER_PALETTES: { value: CoverPalette; label: string }[] = [{ value: 'grau', label: msg('Grau') }, { value: 'zona', label: msg('Zona') }, { value: 'mono', label: msg('Mono') }]
export const DEFAULT_COVER: SongCover = { style: 'sulco', palette: 'grau', bg: '#14141c' }

// a song of the library: the stage's song plus its cover (and who made it, when it is one of the saved ones)
export type LibrarySong = Song & { cover: SongCover; builtin?: boolean }
export const BUILTIN_SONGS: LibrarySong[] = [{ ...TEST_SONG, cover: DEFAULT_COVER, builtin: true }]

// ---------- the numbers a jukebox shows ----------

const NOTE_NAMES = ['Dó', 'Dó♯', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si']
export const keyName = (root: number) => NOTE_NAMES[((root % 12) + 12) % 12]
// beats from the first note of the intro to the last alien's last note
export const songBeats = (s: Song) => s.introBars * 4 + Math.max(0, songEnd(s)) + 2
export const songSeconds = (s: Song) => songBeats(s) * 60 / s.music.zone.bpm
export function clock(secs: number) { const m = Math.floor(secs / 60), s = Math.round(secs % 60); return `${m}:${String(s).padStart(2, '0')}` }

// ---------- cleaning what was saved ----------

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const COLOR = /^#[0-9a-f]{6}$/i
const MOVES: MoveMode[] = ['straight', 'zigzag', 'pass', 'spiral', 'still']
const LAYERS: Layer[] = ['gong', 'taiko', 'wood', 'hat', 'bass', 'snare', 'pluck', 'flute', 'bells', 'double', 'crash']
export const SONG_ALIENS_MAX = 400, SONG_NOTES_MAX = 64, SONG_PAUSES_MAX = 64, SONG_LINES_MAX = 200, LINE_TEXT_MAX = 200

const WHO = /^alien:[\w-]{1,60}$/
function cleanPauses(raw: unknown): SongPause[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, SONG_PAUSES_MAX).flatMap(p => {
    const o = p as Partial<SongPause> | null
    if (!o || typeof o.beat !== 'number' || !Number.isFinite(o.beat)) return []
    return [{ beat: clamp(o.beat, -64, 100000), bars: clamp(Math.round(num(o.bars, 1)), 1, 16), silent: o.silent === true }]
  }).sort((a, b) => a.beat - b.beat)
}
function cleanLines(raw: unknown): SongLine[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, SONG_LINES_MAX).flatMap(l => {
    const o = l as Partial<SongLine> | null
    if (!o || typeof o.beat !== 'number' || !Number.isFinite(o.beat) || typeof o.text !== 'string') return []
    const who = typeof o.who === 'string' && (SPEAKERS.some(x => x.value === o.who) || WHO.test(o.who)) ? o.who : 'narrador'
    const place: LinePlace = LINE_PLACES.some(x => x.value === o.place) ? (o.place as LinePlace) : 'banner'
    return [{ beat: clamp(o.beat, -64, 100000), who, text: o.text.slice(0, LINE_TEXT_MAX), secs: clamp(num(o.secs, 3), 0.5, 20), place, blip: o.blip !== false }]
  }).sort((a, b) => a.beat - b.beat)
}

function cleanNotes(raw: unknown): SongNote[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, SONG_NOTES_MAX).flatMap(n => {
    const o = n as Partial<SongNote> | null
    if (!o || typeof o.beat !== 'number' || typeof o.midi !== 'number' || !Number.isFinite(o.beat) || !Number.isFinite(o.midi)) return []
    return [{ beat: clamp(o.beat, -64, 100000), midi: Math.round(clamp(o.midi, 0, 127)) }]
  }).sort((a, b) => a.beat - b.beat)
}
function cleanAlien(raw: unknown): SongAlien | null {
  const a = raw as Record<string, unknown> | null
  if (!a || typeof a !== 'object') return null
  const notes = cleanNotes(a.notes)
  if (!notes.length) return null
  const species: Species = typeof a.species === 'string' && a.species in SPECIES ? (a.species as Species) : 'jelly'
  const out: SongAlien = { species, notes }
  if (typeof a.variant === 'string' && a.variant) out.variant = a.variant.slice(0, 60)
  if (typeof a.color === 'string' && COLOR.test(a.color)) out.color = a.color
  if (MOVES.includes(a.move as MoveMode)) out.move = a.move as MoveMode
  if (typeof a.at === 'number' && Number.isFinite(a.at)) out.at = a.at
  if (typeof a.angle === 'number' && Number.isFinite(a.angle)) out.angle = ((a.angle % 360) + 360) % 360
  if (typeof a.dist === 'number' && Number.isFinite(a.dist)) out.dist = clamp(a.dist, 80, 1200)
  if (typeof a.turn === 'number' && Number.isFinite(a.turn)) out.turn = clamp(a.turn, -720, 720)
  if (typeof a.pass === 'number' && Number.isFinite(a.pass)) out.pass = clamp(a.pass, 0, 800)
  const z = a.zig as { amp?: unknown; period?: unknown } | undefined
  if (z && typeof z === 'object') out.zig = { amp: clamp(num(z.amp, 60), 0, 300), period: clamp(num(z.period, 2), 0.25, 16) }
  if (isRebateRule(a.rule)) out.rule = a.rule
  const shot = a.shot as Record<string, unknown> | undefined
  if (shot && typeof shot === 'object') {
    const s: NonNullable<SongAlien['shot']> = {}
    if (typeof shot.size === 'number') s.size = clamp(shot.size, 3, 24)
    if (typeof shot.glow === 'number') s.glow = clamp(shot.glow, 0, 1)
    if (typeof shot.speed === 'number') s.speed = clamp(shot.speed, 60, 900)
    if (shot.color === 'degree' || (typeof shot.color === 'string' && COLOR.test(shot.color))) s.color = shot.color
    if (Object.keys(s).length) out.shot = s
  }
  return out
}
export function normalizeSong(raw: unknown): LibrarySong | null {
  const s = raw as Record<string, unknown> | null
  if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !s.id) return null
  const aliens = Array.isArray(s.aliens) ? s.aliens.slice(0, SONG_ALIENS_MAX).map(cleanAlien).filter((a): a is SongAlien => !!a) : []
  if (!aliens.length) return null
  const m = (s.music ?? {}) as Record<string, unknown>
  const zp = normalizeSoundZone(m.zone)
  const zid = typeof (m.zone as { id?: unknown } | undefined)?.id === 'string' ? String((m.zone as { id: string }).id).slice(0, 60) : `musica-${s.id}`
  const zone = { id: zid.startsWith('templo') ? zid : `templo-${zid}`, name: zp.name, root: zp.root, scale: zp.scale, chordScale: zp.chordScale, bpm: zp.bpm, feel: zp.feel, progression: zp.progression, color: zp.color }
  const layers = Array.isArray(m.layers) ? m.layers.filter((l): l is Layer => LAYERS.includes(l as Layer)) : []
  const melody = Array.isArray(m.melody) ? m.melody.filter(n => typeof n === 'number' && Number.isFinite(n)).map(n => clamp(Math.round(n as number), 0, 14)).slice(0, 32) : []
  const lanes = normalizeLanes({ ...(s.fan as object ?? {}), layout: 'fan' })
  const fan: Fan = { open: lanes.open, start: lanes.start, dir: lanes.dir, mirrored: lanes.mirrored, centerY: clamp(num((s.fan as { centerY?: unknown } | undefined)?.centerY, 70), 0, 400), content: lanes.content, ...(lanes.widths ? { widths: lanes.widths } : {}) }
  const cv = (s.cover ?? {}) as Partial<SongCover>
  const noteMode: NoteMode = s.noteMode === 'angle' || s.noteMode === 'sequenced' ? s.noteMode : 'fan'
  const pauses = cleanPauses(s.pauses), lines = cleanLines(s.lines)
  return {
    id: s.id.slice(0, 80), name: (typeof s.name === 'string' && s.name.trim() ? s.name.trim() : 'Música').slice(0, 60),
    intro: typeof s.intro === 'string' ? s.intro.slice(0, 400) : '',
    music: { zone, layers: layers.length ? layers : ['gong', 'taiko'], melody: melody.length ? melody : [0, 1, 2, 3], groove: clamp(Math.round(num(m.groove, 0)), 0, 5) },
    fan, noteMode, ...(isRebateRule(s.rule) ? { rule: s.rule } : {}), introBars: clamp(Math.round(num(s.introBars, 2)), 1, 8), aliens,
    ...(pauses.length ? { pauses } : {}), ...(lines.length ? { lines } : {}),
    cover: {
      style: cv.style === 'grade' ? 'grade' : 'sulco',
      palette: cv.palette === 'zona' || cv.palette === 'mono' ? cv.palette : 'grau',
      bg: typeof cv.bg === 'string' && COLOR.test(cv.bg) ? cv.bg : DEFAULT_COVER.bg,
    },
    builtin: false,
  }
}

// ---------- the library in this browser ----------

const STORE = 'pigchicken-songs-v1', PICK = 'pigchicken-song-pick-v1', PICKS = 'pigchicken-song-picks-v1', RECORDS = 'pigchicken-song-records-v1'
export const LIBRARY_EVENT = 'pigchicken-songs'
const EVENT = LIBRARY_EVENT
export type SongRecord = { score: number; accuracy: number }
// picked: the one picked last (what a Jukebox or a Vitrola never picked from plays); picks: each one's own (by its
// button's label)
export type Library = { songs: LibrarySong[]; picked: string; picks: Record<string, string>; records: Record<string, SongRecord> }

const read = (k: string) => { try { return JSON.parse(window.localStorage.getItem(k) || 'null') } catch { return null } }
const write = (k: string, v: unknown) => { try { window.localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

export function mergeLibrary(saved: unknown, picked: unknown, records: unknown, picks: unknown = null): Library {
  const mine = Array.isArray(saved) ? saved.map(normalizeSong).filter((s): s is LibrarySong => !!s && !BUILTIN_SONGS.some(b => b.id === s.id)) : []
  const songs = [...BUILTIN_SONGS, ...mine]
  const ids = new Set([CAMPAIGN_ID, ...songs.map(s => s.id)])
  const rec: Record<string, SongRecord> = {}
  if (records && typeof records === 'object') for (const [k, v] of Object.entries(records as Record<string, Partial<SongRecord>>)) {
    if (ids.has(k) && v && typeof v.score === 'number') rec[k] = { score: Math.max(0, Math.round(v.score)), accuracy: clamp(num(v.accuracy, 0), 0, 1) }
  }
  const own: Record<string, string> = {}
  if (picks && typeof picks === 'object') for (const [k, v] of Object.entries(picks as Record<string, unknown>)) if (typeof v === 'string' && ids.has(v)) own[k] = v
  return { songs, picked: typeof picked === 'string' && ids.has(picked) ? picked : CAMPAIGN_ID, picks: own, records: rec }
}
export function loadLibrary(): Library { return mergeLibrary(read(STORE), read(PICK), read(RECORDS), read(PICKS)) }
// what a sequencer (by its button's label) plays: its own pick, else the one picked last
export const pickOf = (lib: Pick<Library, 'picked' | 'picks'>, device?: string | null) => (device && lib.picks[device]) || lib.picked
function changed() { window.dispatchEvent(new CustomEvent(EVENT)) }
export function subscribeLibrary(onChange: (l: Library) => void) {
  const handler = () => onChange(loadLibrary())
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
// a pick: the one picked last, and the sequencer's own (the one whose panel is open, if none is named)
export function pickSong(id: string, device: string | null = jukeboxDevice) {
  write(PICK, id)
  if (device) write(PICKS, { ...((read(PICKS) ?? {}) as Record<string, string>), [device]: id })
  changed()
}
// the songs saved here, as they are (the sync writes through this, so what it brings is not sent back)
export function writeMine(songs: LibrarySong[]) { write(STORE, songs.filter(s => !s.builtin).map(s => ({ ...s, builtin: undefined }))); changed() }
const saveMine = (songs: LibrarySong[], touched: string | null) => {
  if (touched) markPending(touched, false)
  writeMine(songs)
}

// what changed here since the last sync with the account: songs saved and songs deleted
const PENDING = 'pigchicken-songs-pending-v1'
export type SongPending = { saved: string[]; deleted: string[] }
export function loadPending(): SongPending {
  const p = read(PENDING) as Partial<SongPending> | null
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return { saved: ids(p?.saved), deleted: ids(p?.deleted) }
}
export function writePending(p: SongPending) { write(PENDING, { saved: [...new Set(p.saved)], deleted: [...new Set(p.deleted)] }) }
function markPending(id: string, deleted: boolean) {
  const p = loadPending()
  writePending(deleted ? { saved: p.saved.filter(x => x !== id), deleted: [...p.deleted, id] } : { saved: [...p.saved, id], deleted: p.deleted.filter(x => x !== id) })
}

// a new id for a copy (by its name, unique)
export function songId(name: string, taken: Iterable<string>) {
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'musica'
  const used = new Set(taken)
  let id = base, n = 2
  while (used.has(id) || id === CAMPAIGN_ID) id = `${base}-${n++}`
  return id
}
// "Salvar como": the song under another name, saved here and picked
export function saveSongAs(lib: Library, song: LibrarySong, name: string): LibrarySong {
  const id = songId(name, lib.songs.map(s => s.id))
  const copy: LibrarySong = { ...structuredClone(song), id, name: name.trim().slice(0, 60) || song.name, builtin: false }
  copy.music.zone = { ...copy.music.zone, id: `templo-${id}`, name: copy.name }
  saveMine([...lib.songs, copy], id); pickSong(id)
  return copy
}
// "Nova música": a short song to start from (one alien, four notes), saved here and picked
export function newSong(lib: Library, name = t('Nova música')): LibrarySong {
  const id = songId(name, lib.songs.map(s => s.id))
  const fan = songFan(62, 'majorPenta')
  const song: LibrarySong = {
    id, name, intro: '', noteMode: 'fan', introBars: 2, fan, cover: { ...DEFAULT_COVER },
    music: { zone: { id: `templo-${id}`, name, root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 100, feel: 'straight', progression: [0, 5, 3, 4], color: '#7bd88f' }, layers: ['gong', 'taiko', 'wood', 'hat', 'bass'], melody: [0, 1, 2, 4, 3, 2, 1, 0], groove: 1 },
    aliens: [{ species: 'jelly', notes: [0, 1, 2, 3].map(beat => ({ beat, midi: 62 + [0, 2, 4, 7][beat] })) }],
    builtin: false,
  }
  saveMine([...lib.songs, song], id); pickSong(id)
  return song
}
export function updateSong(lib: Library, song: LibrarySong) {
  if (song.builtin) return
  saveMine(lib.songs.map(s => (s.id === song.id ? song : s)), song.id)
}
export function deleteSong(lib: Library, id: string) {
  const s = lib.songs.find(x => x.id === id)
  if (!s || s.builtin) return
  markPending(id, true)
  saveMine(lib.songs.filter(x => x.id !== id), null)
  if (lib.picked === id) pickSong(CAMPAIGN_ID, null)
}
// a better score is kept as the song's record (true: a new record)
export function recordScore(id: string, score: number, accuracy: number): boolean {
  const all = (read(RECORDS) ?? {}) as Record<string, SongRecord>
  if ((all[id]?.score ?? -1) >= score) return false
  all[id] = { score, accuracy }
  write(RECORDS, all); changed()
  return true
}

// ---------- asking the game ----------

// a Jukebox or a Vitrola was struck: open the songs' panel for it (by its button's label); the panel asks the game to
// play a song now on it
const OPEN = 'pigchicken-jukebox', PLAY = 'pigchicken-song-play'
let jukeboxDevice: string | null = null
export const currentJukebox = () => jukeboxDevice
export const openJukebox = (device: string | null = null) => { jukeboxDevice = device; window.dispatchEvent(new CustomEvent(OPEN)) }
export const onOpenJukebox = (fn: () => void) => { window.addEventListener(OPEN, fn); return () => window.removeEventListener(OPEN, fn) }
export const playSongNow = (id: string, device: string | null = jukeboxDevice) => window.dispatchEvent(new CustomEvent(PLAY, { detail: { id, device } }))
// "Gerar de MIDI": the generator's panel
const MIDI = 'pigchicken-song-midi'
export const openMidiGenerator = () => window.dispatchEvent(new CustomEvent(MIDI))
export const onOpenMidiGenerator = (fn: () => void) => { window.addEventListener(MIDI, fn); return () => window.removeEventListener(MIDI, fn) }
// the editor: open it on a song; play its draft from a beat; stop
const EDIT = 'pigchicken-song-edit', DRAFT = 'pigchicken-song-draft'
export const openSongEditor = (id: string) => window.dispatchEvent(new CustomEvent(EDIT, { detail: id }))
export const onOpenSongEditor = (fn: (id: string) => void) => {
  const h = (e: Event) => fn(String((e as CustomEvent).detail))
  window.addEventListener(EDIT, h)
  return () => window.removeEventListener(EDIT, h)
}
export type DraftRequest = { song: Song; from: number } | 'stop'
export const playDraft = (song: Song, from: number) => window.dispatchEvent(new CustomEvent(DRAFT, { detail: { song, from } }))
export const stopDraft = () => window.dispatchEvent(new CustomEvent(DRAFT, { detail: 'stop' }))
export const onPlayDraft = (fn: (r: DraftRequest) => void) => {
  const h = (e: Event) => fn((e as CustomEvent).detail as DraftRequest)
  window.addEventListener(DRAFT, h)
  return () => window.removeEventListener(DRAFT, h)
}
// what plays now (the game writes it each frame; the editor's playhead and the jukebox's Parar read it): the song of
// her fan (or of her zone), the sequencers whose song plays, and whether the Campanha do Gongo is on
export const nowPlaying: { id: string | null; beat: number; draft: boolean; campaign: boolean; devices: string[] } = { id: null, beat: NaN, draft: false, campaign: false, devices: [] }
// whether a sequencer's panel shows Parar
export const playingOn = (device: string | null) => nowPlaying.campaign || (device ? nowPlaying.devices.includes(device) : !!nowPlaying.id)
// the jukebox's Parar: its song (or the campaign) stops now
const STOP = 'pigchicken-song-stop'
export const stopSongNow = (device: string | null = jukeboxDevice) => window.dispatchEvent(new CustomEvent(STOP, { detail: device }))
export const onStopSong = (fn: (device: string | null) => void) => {
  const h = (e: Event) => fn(((e as CustomEvent).detail as string | null) ?? null)
  window.addEventListener(STOP, h)
  return () => window.removeEventListener(STOP, h)
}
export const onPlaySong = (fn: (id: string, device: string | null) => void) => {
  const h = (e: Event) => { const d = (e as CustomEvent).detail as { id: string; device: string | null } | string; if (typeof d === 'string') fn(d, null); else fn(String(d.id), d.device ?? null) }
  window.addEventListener(PLAY, h)
  return () => window.removeEventListener(PLAY, h)
}
