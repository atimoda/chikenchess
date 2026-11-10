"use client"

// "Gerar de MIDI" (the jukebox): pick a .mid file, the tracks that go in and each one's alien, the difficulty, the
// key and the bars; the song is made as the choices change (its cover and its numbers show it), Ouvir plays it in
// the temple and Gerar saves it under its name and opens it in the editor.
import { useEffect, useMemo, useRef, useState } from "react"
import { FileMusic, Play, Wand2, X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { coverCanvas } from "@/components/pigchicken/song-cover-draw"
import { CATALOG_SPECIES, loadCatalog, subscribeCatalog, type Catalog } from "@/lib/pigchicken/alien-catalog"
import { SCALES, type ScaleId } from "@/lib/pigchicken/music"
import { DIFFICULTIES, DRUMS_BY_PIECE, MidiError, defaultVariant, detectKey, generateSong, parseMidi, type Difficulty, type GenTrack, type MidiFile } from "@/lib/pigchicken/midi-song"
import { clock, keyName, loadLibrary, openSongEditor, playDraft, saveSongAs, songSeconds } from "@/lib/pigchicken/song-library"
import { SPECIES } from "@/lib/pigchicken/temple"
import { cn } from "@/lib/utils"

const NEON = "#39ff88"
const ROOTS = Array.from({ length: 12 }, (_, i) => 57 + i)
const field = "h-8 rounded-md border border-white/15 bg-[#0b110e] px-2 text-xs text-white"
const noteName = (m: number) => `${keyName(m)}${Math.floor(m / 12) - 1}`

export function MidiPanel({ onClose }: { onClose: () => void }) {
  const [catalog, setCatalog] = useState<Catalog>(() => loadCatalog())
  useEffect(() => subscribeCatalog(setCatalog), [])
  const [file, setFile] = useState<MidiFile | null>(null)
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  const [tracks, setTracks] = useState<GenTrack[]>([])
  const [difficulty, setDifficulty] = useState<Difficulty>("medio")
  const [root, setRoot] = useState<number | null>(null)
  const [scale, setScale] = useState<ScaleId | null>(null)
  const [fromBar, setFromBar] = useState(1)
  const [bars, setBars] = useState(0)

  const load = async (f: File) => {
    setError("")
    try {
      const m = parseMidi(new Uint8Array(await f.arrayBuffer()))
      setFile(m)
      setName(f.name.replace(/\.(mid|midi)$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 60) || "Música do MIDI")
      setTracks(m.tracks.map(t => ({ index: t.index, on: true, variant: defaultVariant(t, m.tracks) })))
      setRoot(null); setScale(null); setFromBar(1); setBars(0)
    } catch (e) {
      setFile(null); setError(e instanceof MidiError ? e.message : "Não foi possível ler este arquivo.")
    }
  }

  const made = useMemo(() => {
    if (!file) return null
    try { return { ...generateSong(file, { name, tracks, difficulty, root: root ?? undefined, scale: scale ?? undefined, fromBar: fromBar - 1, bars: bars || undefined, catalog }), error: "" } }
    catch (e) { return { song: null, kept: 0, dropped: 0, error: e instanceof Error ? e.message : String(e) } }
  }, [file, name, tracks, difficulty, root, scale, fromBar, bars, catalog])
  const song = made?.song ?? null
  const key = useMemo(() => (file ? detectKey(file.tracks.filter(t => tracks.find(g => g.index === t.index)?.on)) : null), [file, tracks])

  const cover = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = cover.current
    if (!c || !song) return
    const art = coverCanvas(song, 112 * Math.min(2, window.devicePixelRatio || 1), catalog)
    c.width = art.width; c.height = art.height
    c.getContext("2d")!.drawImage(art, 0, 0)
  }, [song, catalog])

  const setTrack = (i: number, patch: Partial<GenTrack>) => setTracks(ts => ts.map(t => (t.index === i ? { ...t, ...patch } : t)))
  const make = () => {
    if (!song || !song.aliens.length) return
    const saved = saveSongAs(loadLibrary(), song, name.trim() || "Música do MIDI")
    openSongEditor(saved.id)
  }

  return (
    <FloatingPanel id="pigchicken-midi" role="dialog" aria-label="Gerar de MIDI" onKeyDown={e => e.stopPropagation()}
      initial={(vw, vh) => ({ x: Math.max(12, vw - Math.min(560, vw - 24) - 12), y: 64, w: Math.min(560, vw - 24), h: Math.min(720, vh - 104) })} minW={320}
      className="rounded-[22px] border-2 bg-[#07130d] font-mono text-xs text-[#dfe8df] shadow-[0_0_24px_rgba(57,255,136,0.25),0_20px_60px_rgba(0,0,0,0.6)]" style={{ borderColor: NEON }}>
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <FileMusic className="h-4 w-4" style={{ color: NEON }} />
        <h2 className="min-w-0 flex-1 truncate text-sm text-white">Gerar de MIDI</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-4">
        <label className="grid gap-1.5">
          <span className="text-[#93a79a]">Arquivo .mid</span>
          <input type="file" accept=".mid,.midi,audio/midi,audio/x-midi" onChange={e => { const f = e.target.files?.[0]; if (f) void load(f) }}
            className="text-xs text-white file:mr-3 file:h-8 file:rounded-md file:border file:border-white/20 file:bg-transparent file:px-3 file:text-white" />
        </label>
        {error && <p className="rounded-md border border-[#ff6b5b]/50 bg-[#ff6b5b]/10 px-2 py-1.5 text-[#ffb4a8]">{error}</p>}
        {!file && !error && <p className="text-[11px] text-[#93a79a]">O gerador lê as faixas, o tempo e as notas, junta as notas em aliens de 5 a 15 tiros e abre a música no editor para você ajustar.</p>}
        {file && (
          <>
            <label className="grid gap-1">Nome<input value={name} maxLength={60} onChange={e => setName(e.target.value)} className={field} /></label>
            {/* the tracks */}
            <div className="grid gap-1">
              <span className="text-[#93a79a]">Faixas</span>
              {file.tracks.map(t => {
                const g = tracks.find(x => x.index === t.index)
                if (!g) return null
                const ms = t.notes.map(n => n.midi)
                return (
                  <div key={t.index} className={cn("flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5", g.on ? "border-white/20" : "border-white/5 opacity-60")}>
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input type="checkbox" checked={g.on} onChange={e => setTrack(t.index, { on: e.target.checked })} />
                      <span className="min-w-0">
                        <span className="block truncate text-white">{t.name}</span>
                        <span className="block text-[10px] text-[#93a79a]">{t.notes.length} notas · {t.drums ? "bateria" : `${noteName(Math.min(...ms))} a ${noteName(Math.max(...ms))}`}</span>
                      </span>
                    </label>
                    <select aria-label={`Alien da faixa ${t.name}`} value={g.variant} onChange={e => setTrack(t.index, { variant: e.target.value })} className={cn(field, "max-w-44")}>
                      {t.drums && <option value={DRUMS_BY_PIECE}>Por peça (bumbo, caixa…)</option>}
                      {CATALOG_SPECIES.map(sp => <optgroup key={sp} label={SPECIES[sp].name}>{catalog.filter(v => v.species === sp).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>)}
                    </select>
                  </div>
                )
              })}
            </div>
            {/* the choices */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-20 text-[#93a79a]">Dificuldade</span>
              {DIFFICULTIES.map(d => <button key={d.value} type="button" aria-pressed={difficulty === d.value} onClick={() => setDifficulty(d.value)} className={cn("h-7 rounded-full border px-3", difficulty === d.value ? "border-primary text-white" : "border-white/15")}>{d.label}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <label className="flex items-center gap-1.5">Tom
                <select value={root ?? ""} onChange={e => setRoot(e.target.value === "" ? null : Number(e.target.value))} className={field}>
                  <option value="">Do arquivo{key ? ` (${keyName(key.root)} ${key.minor ? "menor" : "maior"})` : ""}</option>
                  {ROOTS.map(r => <option key={r} value={r}>{keyName(r)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5">Escala
                <select value={scale ?? ""} onChange={e => setScale(e.target.value === "" ? null : (e.target.value as ScaleId))} className={field}>
                  <option value="">Pentatônica do tom</option>
                  {(Object.keys(SCALES) as ScaleId[]).map(k => <option key={k} value={k}>{SCALES[k].label}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5">Do compasso<input type="number" min={1} max={999} value={fromBar} onChange={e => setFromBar(Math.max(1, Math.round(Number(e.target.value) || 1)))} className={cn(field, "w-16")} /></label>
              <label className="flex items-center gap-1.5">Compassos<input type="number" min={0} max={999} value={bars} onChange={e => setBars(Math.max(0, Math.round(Number(e.target.value) || 0)))} className={cn(field, "w-16")} title="0: até o fim" /></label>
            </div>
            {/* what comes out */}
            {made?.error ? <p className="text-[#ffb4a8]">{made.error}</p> : song && (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-black/40 p-2">
                <canvas ref={cover} aria-hidden="true" className="h-[112px] w-[112px] rounded-md" />
                <dl className="grid content-start grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[11px]">
                  <dt className="text-[#93a79a]">bpm</dt><dd className="text-white">{song.music.zone.bpm}{song.music.zone.bpm !== file.bpm ? ` (o arquivo tem ${file.bpm})` : ""}</dd>
                  <dt className="text-[#93a79a]">Tom</dt><dd className="truncate text-white">{keyName(song.music.zone.root)} · {SCALES[song.music.zone.scale].label.toLowerCase()}</dd>
                  <dt className="text-[#93a79a]">Duração</dt><dd className="text-white">{clock(songSeconds(song))}</dd>
                  <dt className="text-[#93a79a]">Aliens</dt><dd className="text-white">{song.aliens.length}</dd>
                  <dt className="text-[#93a79a]">Notas</dt><dd className="text-white">{made?.kept ?? 0}{made && made.dropped > 0 ? ` (${made.dropped} ficaram de fora)` : ""}</dd>
                </dl>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              <button type="button" disabled={!song?.aliens.length} onClick={() => { if (song) { playDraft(song, 0); onClose() } }} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-3 hover:border-primary disabled:opacity-40"><Play className="h-4 w-4" />Ouvir no templo</button>
              <button type="button" disabled={!song?.aliens.length} onClick={make} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-bold text-[#05060c] disabled:opacity-40" style={{ background: NEON }}><Wand2 className="h-4 w-4" />Gerar e abrir no editor</button>
            </div>
          </>
        )}
      </div>
    </FloatingPanel>
  )
}
