// "Gerar de MIDI" (the jukebox): a .mid file becomes a song. The file is read here (Standard MIDI File, format 0 or 1:
// its tracks, tempo and notes, in beats), then the generator picks the tracks the player chose, quantizes them to
// the difficulty's grid, keeps only as many notes as the difficulty allows (notes a second, the shortest gap on the
// same lane, how many at once; the tracks share them), folds them into the fan's lanes (each track an octave or two up or down so its
// middle sits in the middle of the fan; drums by piece: kick low, snare in the middle, hats and cymbals high), and
// groups the notes that follow each other in the same region into aliens of up to 15 notes, each one appearing a
// few beats before its first. The result opens in the song editor.
import { msg, t as tr } from '../i18n'
import { fanNotes, songFan } from './fan'
import { SCALES, type ScaleId } from './music'
import { SONG_ALIENS_MAX, SONG_NOTES_MAX, DEFAULT_COVER, type LibrarySong } from './song-library'
import type { SongAlien } from './note-stage'
import { BUILTIN_VARIANTS, variantFor, type Catalog } from './alien-catalog'

// ---------- reading the file ----------

export type MidiNote = { beat: number; midi: number; dur: number; vel: number }
export type MidiTrack = { index: number; name: string; channel: number; drums: boolean; program: number; notes: MidiNote[] }
export type MidiFile = { bpm: number; beats: number; tracks: MidiTrack[] }

export class MidiError extends Error {}

// the General MIDI families (program / 8), for a track with no name
const FAMILIES = [msg('Piano'), msg('Percussão cromática'), msg('Órgão'), msg('Violão'), msg('Baixo'), msg('Cordas'), msg('Ensemble'), msg('Metais'), msg('Palhetas'), msg('Flautas'), msg('Synth lead'), msg('Synth pad'), msg('Efeitos'), msg('Étnico'), msg('Percussão'), msg('Efeitos sonoros')]

export function parseMidi(data: Uint8Array): MidiFile {
  let p = 0
  const need = (n: number) => { if (p + n > data.length) throw new MidiError(tr('O arquivo MIDI acabou antes da hora.')) }
  const u8 = () => { need(1); return data[p++] }
  const u16 = () => { need(2); const v = (data[p] << 8) | data[p + 1]; p += 2; return v }
  const u32 = () => { need(4); const v = ((data[p] << 24) >>> 0) + (data[p + 1] << 16) + (data[p + 2] << 8) + data[p + 3]; p += 4; return v }
  const tag = () => { need(4); const t = String.fromCharCode(data[p], data[p + 1], data[p + 2], data[p + 3]); p += 4; return t }
  const vlq = () => { let v = 0; for (let i = 0; i < 4; i++) { const b = u8(); v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v } throw new MidiError(tr('Um tempo do arquivo MIDI está estragado.')) }

  if (data.length < 14 || tag() !== 'MThd') throw new MidiError(tr('Este arquivo não é MIDI (.mid).'))
  const hlen = u32(), format = u16(), ntracks = u16(), division = u16()
  p += Math.max(0, hlen - 6)
  if (division & 0x8000) throw new MidiError(tr('Este MIDI conta o tempo em SMPTE; exporte com tempo em batidas.'))
  if (format > 1) throw new MidiError(tr('Este MIDI é do formato 2, que o gerador não lê.'))
  const ppq = division || 480
  const tempos: { tick: number; usPerBeat: number }[] = []
  // channel tracks: a format 0 file has every channel in one track, so tracks are split by channel
  const byKey = new Map<string, MidiTrack>()
  let endTick = 0
  for (let t = 0; t < ntracks && p + 8 <= data.length; t++) {
    const id = tag(), len = u32(), end = p + len
    if (!/^[\x20-\x7e]{4}$/.test(id)) throw new MidiError(tr('Uma faixa do arquivo MIDI está estragada.'))
    // a chunk of another kind (the format allows them) is skipped
    if (id !== 'MTrk') { p = end; t--; continue }
    if (end > data.length) throw new MidiError(tr('O arquivo MIDI acabou antes da hora.'))
    let tick = 0, status = 0, name = ''
    const programs = new Map<number, number>()
    const open = new Map<string, { tick: number; vel: number }>()
    const notes: { ch: number; tick: number; end: number; midi: number; vel: number }[] = []
    while (p < end) {
      tick += vlq()
      let b = data[p]
      if (b & 0x80) { p++; if (b < 0xf0) status = b } else if (status) b = status
      else throw new MidiError(tr('Um evento do arquivo MIDI está estragado.'))
      if (b === 0xff) {
        const type = u8(), l = vlq()
        need(l)
        if (type === 0x51 && l === 3) tempos.push({ tick, usPerBeat: (data[p] << 16) | (data[p + 1] << 8) | data[p + 2] })
        if (type === 0x03 && !name) name = new TextDecoder('latin1').decode(data.subarray(p, p + l)).trim()
        p += l
        if (type === 0x2f) break
        continue
      }
      // the length is read before moving on (`p += vlq()` would add it to the position from before the length)
      if (b === 0xf0 || b === 0xf7) { const l = vlq(); p += l; continue }
      const kind = b & 0xf0, ch = b & 0x0f
      const d1 = u8(), d2 = kind === 0xc0 || kind === 0xd0 ? 0 : u8()
      if (kind === 0xc0) programs.set(ch, d1)
      const key = `${ch}:${d1}`
      if (kind === 0x90 && d2 > 0) {
        const was = open.get(key)
        if (was) notes.push({ ch, tick: was.tick, end: tick, midi: d1, vel: was.vel })
        open.set(key, { tick, vel: d2 })
      } else if (kind === 0x80 || (kind === 0x90 && d2 === 0)) {
        const was = open.get(key)
        if (was) { notes.push({ ch, tick: was.tick, end: tick, midi: d1, vel: was.vel }); open.delete(key) }
      }
    }
    for (const [key, was] of open) notes.push({ ch: Number(key.split(':')[0]), tick: was.tick, end: tick, midi: Number(key.split(':')[1]), vel: was.vel })
    p = end
    endTick = Math.max(endTick, tick)
    for (const n of notes) {
      const k = `${t}:${n.ch}`
      let trk = byKey.get(k)
      if (!trk) {
        const program = programs.get(n.ch) ?? 0
        trk = { index: 0, name: name || (n.ch === 9 ? tr('Bateria') : (FAMILIES[program >> 3] ? tr(FAMILIES[program >> 3]) : tr('Faixa'))), channel: n.ch, drums: n.ch === 9, program, notes: [] }
        byKey.set(k, trk)
      }
      trk.notes.push({ beat: n.tick / ppq, midi: n.midi, dur: Math.max(0, n.end - n.tick) / ppq, vel: n.vel / 127 })
    }
  }
  const tracks = [...byKey.values()].filter(t => t.notes.length).map((t, i) => ({ ...t, index: i, notes: t.notes.sort((a, b) => a.beat - b.beat || b.midi - a.midi) }))
  if (!tracks.length) throw new MidiError(tr('Este MIDI não tem notas.'))
  // the song's tempo: the one that lasts the longest (a song has a single bpm)
  tempos.sort((a, b) => a.tick - b.tick)
  let us = 500000, best = 0
  tempos.forEach((t, i) => { const len = (tempos[i + 1]?.tick ?? endTick) - t.tick; if (len >= best) { best = len; us = t.usPerBeat } })
  const bpm = Math.round(60_000_000 / Math.max(1, us))
  return { bpm, beats: endTick / ppq, tracks }
}

// ---------- generating the song ----------

export type Difficulty = 'facil' | 'medio' | 'dificil' | 'insano'
export const DIFFICULTIES: { value: Difficulty; label: string; nps: number; gap: number; grid: number; together: number }[] = [
  { value: 'facil', label: msg('Fácil'), nps: 1.5, gap: 1, grid: 1, together: 1 },
  { value: 'medio', label: msg('Médio'), nps: 2.5, gap: 0.5, grid: 0.5, together: 1 },
  { value: 'dificil', label: msg('Difícil'), nps: 4, gap: 0.5, grid: 0.25, together: 2 },
  { value: 'insano', label: msg('Insano'), nps: 6, gap: 0.25, grid: 0.25, together: 2 },
]
// a drum track: by piece (the kit's kick, snare, clap and hats each its alien), or one variation for all
export const DRUMS_BY_PIECE = 'por-peca'
export type GenTrack = { index: number; on: boolean; variant: string }
export type GenOptions = { name: string; tracks: GenTrack[]; difficulty: Difficulty; root?: number; scale?: ScaleId; fromBar?: number; bars?: number; catalog?: Catalog }

// the key: the root and major or minor whose scale holds most of the music (by how long each note sounds)
export function detectKey(tracks: MidiTrack[]): { root: number; minor: boolean } {
  const hist = new Array(12).fill(0)
  for (const t of tracks) if (!t.drums) for (const n of t.notes) hist[n.midi % 12] += Math.max(0.25, Math.min(4, n.dur))
  let best = { root: 2, minor: false, score: -1 }
  for (let r = 0; r < 12; r++) for (const minor of [false, true]) {
    const steps = SCALES[minor ? 'minor' : 'major'].steps
    // the scale's notes, the tonic and the fifth count a little more
    const score = steps.reduce((s, st) => s + hist[(r + st) % 12], 0) + 0.3 * hist[r] + 0.15 * hist[(r + 7) % 12]
    if (score > best.score + 1e-9) best = { root: r, minor, score }
  }
  return { root: best.root, minor: best.minor }
}

// the variation a track gets by default: the bass low and heavy, the highest track a flute, the others in turn
export function defaultVariant(t: MidiTrack, all: MidiTrack[]): string {
  if (t.drums) return DRUMS_BY_PIECE
  const median = (x: MidiTrack) => { const m = x.notes.map(n => n.midi).sort((a, b) => a - b); return m[Math.floor(m.length / 2)] }
  if (median(t) < 50) return 'jelly-baixo'
  const pitched = all.filter(x => !x.drums)
  const top = pitched.reduce((a, b) => (median(b) > median(a) ? b : a), pitched[0])
  if (t === top) return 'lantern-flauta'
  return ['jelly-sino', 'jelly', 'lantern-papel', 'twin'][pitched.indexOf(t) % 4]
}

// a drum note's piece: its lane (from the bottom, 0..1 of the fan) and its alien
function drumPiece(m: number): { at: number; variant: string; rank: number } {
  if (m === 35 || m === 36) return { at: 0, variant: 'drum-bumbo', rank: 0 }
  if (m === 38 || m === 40 || m === 37) return { at: 0.45, variant: 'drum-caixa', rank: 1 }
  if (m === 39) return { at: 0.55, variant: 'drum-palmas', rank: 1 }
  if (m === 42 || m === 44 || m === 46 || m === 54 || m === 69 || m === 70) return { at: 0.8, variant: 'mini-chocalho', rank: 3 }
  if (m >= 49 && m <= 59) return { at: 1, variant: 'mini-chocalho', rank: 2 }
  return { at: 0.2 + 0.4 * ((m - 41) / 12), variant: 'drum', rank: 2 } // toms and the rest
}

type Hit = { beat: number; lane: number; vel: number; rank: number; track: number; variant: string }
const GAP_REST = 2 // beats without a note close an alien
const GROUP_MIN = 5, GROUP_MAX = 15, REGION = 3 // lanes
const SHARE_BEATS = 16 // the tracks share the places by how many notes each kept in the last 4 bars

export function generateSong(file: MidiFile, o: GenOptions): { song: LibrarySong; kept: number; dropped: number } {
  const diff = DIFFICULTIES.find(d => d.value === o.difficulty) ?? DIFFICULTIES[1]
  const catalog = o.catalog ?? BUILTIN_VARIANTS
  const chosen = o.tracks.filter(t => t.on).map(t => ({ g: t, t: file.tracks[t.index] })).filter(x => x.t)
  if (!chosen.length) throw new MidiError(tr('Escolha pelo menos uma faixa.'))
  // tempo inside 40..200: a fast song is read at half (each beat two), a slow one at double
  let bpm = file.bpm, k = 1
  while (bpm > 200) { bpm /= 2; k /= 2 }
  while (bpm < 40) { bpm *= 2; k *= 2 }
  bpm = Math.round(bpm)
  const key = detectKey(chosen.map(x => x.t))
  const root = o.root ?? 57 + ((key.root - 57 + 120) % 12)
  const scale: ScaleId = o.scale ?? (key.minor ? 'minorPenta' : 'majorPenta')
  const fan = songFan(root, scale)
  const lanes = fanNotes(fan).filter((m): m is number => m !== null).sort((a, b) => a - b)
  const lo = lanes[0], hi = lanes[lanes.length - 1], mid = (lo + hi) / 2
  const laneOf = (m: number) => { let b = 0; lanes.forEach((x, i) => { if (Math.abs(x - m) < Math.abs(lanes[b] - m)) b = i }); return b }
  const from = Math.max(0, (o.fromBar ?? 0) * 4), to = o.bars ? from + o.bars * 4 : Infinity

  // every note of the chosen tracks, on the grid, in its lane
  const hits: Hit[] = []
  let total = 0
  for (const { g, t } of chosen) {
    const ms = t.notes.map(n => n.midi).sort((a, b) => a - b)
    const shift = Math.round((mid - ms[Math.floor(ms.length / 2)]) / 12) * 12
    for (const n of t.notes) {
      const beat = Math.round((n.beat * k - from) / diff.grid) * diff.grid
      if (beat < 0 || beat >= to - from) continue
      total++
      if (t.drums) {
        const d = drumPiece(n.midi)
        hits.push({ beat, lane: Math.round(d.at * (lanes.length - 1)), vel: n.vel, rank: d.rank, track: g.index, variant: g.variant === DRUMS_BY_PIECE ? d.variant : g.variant })
      } else {
        let m = n.midi + shift
        while (m > hi + 2) m -= 12
        while (m < lo - 2) m += 12
        hits.push({ beat, lane: laneOf(m), vel: n.vel, rank: 1, track: g.index, variant: g.variant === DRUMS_BY_PIECE ? 'jelly' : g.variant })
      }
    }
  }
  // the density: at each beat at most `together` notes, never the same lane closer than the gap, and no more than
  // nps notes in any second. The tracks share the places: a note waits for (gives its place to) a note of a track
  // with fewer notes kept in the last bars that comes within the next second, so a steady drum track does not take
  // every place from the melody and the bass. Among the notes of a beat: that same share, then the kick, the snare
  // and the melody, the strongest and the highest
  hits.sort((a, b) => a.beat - b.beat)
  const kept: Hit[] = []
  const lastOn = new Map<number, number>()
  const second = bpm / 60 // beats in a second
  const nps = Math.max(1, Math.floor(diff.nps))
  const recent: number[] = [] // the beats of the notes kept in the last second
  const share = new Map<number, number[]>() // per track, the beats of its notes kept in the last bars
  const shareOf = (track: number, beat: number) => {
    const bs = share.get(track)
    if (!bs) return 0
    while (bs.length && bs[0] <= beat - SHARE_BEATS) bs.shift()
    return bs.length
  }
  const fits = (p: Hit, beat: number) => beat - (lastOn.get(p.lane) ?? -Infinity) >= diff.gap - 1e-9
  const before = (a: Hit, b: Hit, beat: number) => shareOf(a.track, beat) - shareOf(b.track, beat) || a.rank - b.rank || b.vel - a.vel || b.lane - a.lane
  for (let i = 0; i < hits.length;) {
    const beat = hits[i].beat
    let j = i
    while (j < hits.length && hits[j].beat === beat) j++
    while (recent.length && recent[0] <= beat - second + 1e-9) recent.shift()
    let here = 0
    const usedLanes = new Set<number>()
    const left = hits.slice(i, j)
    while (left.length && here < diff.together && recent.length < nps) {
      let b = 0
      for (let x = 1; x < left.length; x++) if (before(left[x], left[b], beat) < 0) b = x
      const p = left.splice(b, 1)[0]
      if (usedLanes.has(p.lane) || !fits(p, beat)) continue
      // a track with fewer notes lately has one coming soon that this one would leave no place for: it waits
      const mine = shareOf(p.track, beat)
      let wait = false
      for (let x = j; x < hits.length && hits[x].beat < beat + second - 1e-9 && !wait; x++) {
        const q = hits[x]
        if (q.track === p.track || shareOf(q.track, beat) >= mine || !fits(q, q.beat)) continue
        const full = recent.filter(r => r > q.beat - second + 1e-9).length + 1 >= nps
        if (full || (q.lane === p.lane && q.beat - beat < diff.gap - 1e-9)) wait = true
      }
      if (wait) continue
      kept.push(p); here++; usedLanes.add(p.lane); lastOn.set(p.lane, beat); recent.push(beat)
      share.set(p.track, [...(share.get(p.track) ?? []), beat])
    }
    i = j
  }
  // the song starts on the bar of its first note
  const start = kept.length ? Math.floor(kept[0].beat / 4) * 4 : 0
  kept.forEach(p => { p.beat -= start })

  // the aliens: per track and variation, the notes that follow each other in the same region. A long song whose
  // aliens would pass the library's limit is grouped again with a longer rest, so its end is not cut off
  const streams = new Map<string, Hit[]>()
  for (const p of kept) { const key2 = `${p.track}|${p.variant}`; streams.set(key2, [...(streams.get(key2) ?? []), p]) }
  const group = (rest: number) => {
    const out: SongAlien[] = []
    for (const [, ps] of streams) {
      let g: Hit[] = []
      const close = () => {
        if (!g.length) return
        const v = variantFor(catalog, g[0].variant, 'jelly')
        out.push({ species: v.species, variant: v.id, notes: g.map(p => ({ beat: p.beat, midi: lanes[p.lane] })) })
        g = []
      }
      for (const p of ps) {
        const prev = g[g.length - 1]
        if (prev) {
          const meanLane = g.reduce((s, x) => s + x.lane, 0) / g.length
          if (p.beat - prev.beat > rest || g.length >= GROUP_MAX || (g.length >= GROUP_MIN && Math.abs(p.lane - meanLane) > REGION)) close()
        }
        g.push(p)
      }
      close()
    }
    return out
  }
  let aliens = group(GAP_REST)
  for (let rest = GAP_REST * 2; aliens.length > SONG_ALIENS_MAX && rest <= 64; rest *= 2) aliens = group(rest)
  aliens.sort((a, b) => a.notes[0].beat - b.notes[0].beat)
  const capped = aliens.slice(0, SONG_ALIENS_MAX).map(a => ({ ...a, notes: a.notes.slice(0, SONG_NOTES_MAX) }))
  const colors = ['#7bdff2', '#c77dff', '#7bd88f', '#ffd166', '#ff8fab', '#4cc9f0', '#f4a261', '#b5e48c', '#ff6b5b', '#9d8df1', '#64dfdf', '#ffb703']
  const name = o.name.trim().slice(0, 60) || tr('Música do MIDI')
  const song: LibrarySong = {
    id: 'midi', name, intro: '', noteMode: 'fan', introBars: 2, fan, cover: { ...DEFAULT_COVER },
    music: {
      zone: { id: 'templo-midi', name, root, scale, chordScale: scale === 'minorPenta' || scale === 'minor' ? 'minor' : SCALES[scale].steps.length === 7 ? scale : 'major', bpm, feel: 'straight', progression: [0, 5, 3, 4], color: colors[root % 12] },
      layers: ['gong', 'taiko', 'wood', 'hat', 'bass'], melody: [0, 1, 2, 4, 3, 2, 1, 0], groove: 1,
    },
    aliens: capped, builtin: false,
  }
  const notes = capped.reduce((s, a) => s + a.notes.length, 0)
  return { song, kept: notes, dropped: total - notes }
}
