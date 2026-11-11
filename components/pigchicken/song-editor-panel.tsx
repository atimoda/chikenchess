"use client"

// The song editor (Editar, in the jukebox): the song as a timeline. Beats run left to right (bars, zoom); a row per
// lane of the fan, the highest note on top, like a piano roll lying down, and the Diálogos lane under them with the
// pauses and the lines. Each alien is a block from its spawn to when it touches her, with a dot at each of its notes.
// Drag moves in time or across lanes; double click makes an alien (or a line); Ctrl+click adds a note to the alien
// picked, right click takes one out; Delete, Ctrl+C / Ctrl+V at the cursor, Ctrl+Z / Ctrl+Shift+Z. A preview shows
// the half circle around her at the cursor (or at the song's beat while it plays), and "Tocar daqui" plays the
// draft in the temple from the cursor's bar.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, MessageSquare, Pause, Play, Plus, Redo2, Save, Square, Trash2, Undo2, X, ZoomIn, ZoomOut } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { CATALOG_SPECIES, loadCatalog, subscribeCatalog, variantFor, type Catalog } from "@/lib/pigchicken/alien-catalog"
import { DEGREE_COLORS, SCALES, type ScaleId } from "@/lib/pigchicken/music"
import { fanAngleOf, fanLanes } from "@/lib/pigchicken/fan"
import {
  ARRIVE_R, LEAD_BEATS, LINE_PLACES, MIN_FLIGHT, MOVE_MODES, SPAWN_DIST, SPEAKERS, alienNotes, alienPath, pathAt, pauseEnd, spawnBeat, speakerOf,
  type MoveMode, type SongAlien, type SongLine,
} from "@/lib/pigchicken/note-stage"
import {
  keyName, loadLibrary, normalizeSong, nowPlaying, playDraft, saveSongAs, stopDraft, updateSong, type LibrarySong,
} from "@/lib/pigchicken/song-library"
import {
  NOTHING, addAlien, addLine, addNote, copyItems, insertPause, isEmpty, laneNotes, laneOf, moveAliens, moveLines, moveNote, movePause, pasteClip, removeItems,
  removeNote, retune, setPauseBars, snapBeat, timelineSpan, updateAlien, updateLine, updatePause, type Clip, type Selection,
} from "@/lib/pigchicken/song-edit"
import { SPECIES } from "@/lib/pigchicken/temple"
import { cn } from "@/lib/utils"

const NEON = "#39ff88"
const TALK_H = 44, RULER_H = 22, LABEL_W = 52
const GRIDS = [{ v: 1, label: "1 tempo" }, { v: 0.5, label: "½ tempo" }, { v: 0.25, label: "¼ tempo" }]
const ROOTS = Array.from({ length: 12 }, (_, i) => 57 + i) // Lá … Sol♯, around the voice
const field = "h-8 rounded-md border border-white/15 bg-[#0b110e] px-2 text-xs text-white"
const btn = "inline-flex h-8 items-center gap-1.5 rounded-md border border-white/15 px-2.5 hover:border-primary disabled:opacity-40 disabled:hover:border-white/15"

type Drag =
  | { kind: "aliens"; idx: number[]; sx: number; sy: number; db: number; dl: number; moved: boolean }
  | { kind: "note"; ai: number; ni: number; sx: number; sy: number; db: number; dl: number; moved: boolean }
  | { kind: "lines"; idx: number[]; sx: number; sy: number; db: number; dl: number; moved: boolean }
  | { kind: "pause"; idx: number[]; sx: number; sy: number; db: number; dl: number; moved: boolean }

function degreeIn(root: number, steps: number[], m: number) {
  const pc = (((m - root) % 12) + 12) % 12
  let best = 0
  steps.forEach((s, i) => { if (Math.abs(s - pc) < Math.abs(steps[best] - pc)) best = i })
  return best
}
const noteLabel = (m: number) => `${keyName(m)}${Math.floor(m / 12) - 1}`

function applyDrag(s: LibrarySong, d: Drag | null): LibrarySong {
  if (!d || !d.moved) return s
  if (d.kind === "aliens") return moveAliens(s, d.idx, d.db, d.dl)
  if (d.kind === "note") return moveNote(s, d.ai, d.ni, d.db, d.dl)
  if (d.kind === "pause") return movePause(s, d.idx[0], d.db).song
  return moveLines(s, d.idx, d.db)
}

export function SongEditorPanel({ songId, onClose }: { songId: string; onClose: () => void }) {
  const [catalog, setCatalog] = useState<Catalog>(() => loadCatalog())
  useEffect(() => subscribeCatalog(setCatalog), [])
  const [draft, setDraft] = useState<LibrarySong | null>(() => {
    const s = loadLibrary().songs.find(x => x.id === songId)
    return s ? structuredClone(s) : null
  })
  const [hist, setHist] = useState<{ past: LibrarySong[]; future: LibrarySong[] }>({ past: [], future: [] })
  const [dirty, setDirty] = useState(false)
  const [sel, setSel] = useState<Selection>(NOTHING)
  const [cursor, setCursor] = useState(0)
  const [ppb, setPpb] = useState(28)
  const [grid, setGrid] = useState(0.5)
  const [brush, setBrush] = useState("jelly")
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const [naming, setNaming] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [small, setSmall] = useState(false)
  const [playhead, setPlayhead] = useState(NaN)
  // dragging on the ruler: the cursor follows the pointer and the preview shows that beat (even while it plays)
  const [scrub, setScrub] = useState(false)
  // the lanes fill the timeline's height (between 18 and 34 px each)
  const [fit, setFit] = useState(300)
  const clip = useRef<Clip | null>(null)
  const merge = useRef<{ key: string; at: number } | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const scroller = useRef<HTMLDivElement | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  // a change: the one before goes to the history (typing in a field joins its letters into one step)
  const commit = useCallback((next: LibrarySong, nextSel?: Selection, key?: string) => {
    const cur = draftRef.current
    if (!cur) return
    const now = performance.now(), joined = !!key && merge.current?.key === key && now - merge.current.at < 1500
    merge.current = key ? { key, at: now } : null
    if (!joined) setHist(h => ({ past: [...h.past.slice(-99), cur], future: [] }))
    setDraft(next); setDirty(true); setNote("")
    if (nextSel) setSel(nextSel)
  }, [])
  const undo = () => {
    if (!hist.past.length || !draft) return
    setDraft(hist.past[hist.past.length - 1]); setHist({ past: hist.past.slice(0, -1), future: [draft, ...hist.future] })
    setSel(NOTHING); setDirty(true); merge.current = null
  }
  const redo = () => {
    if (!hist.future.length || !draft) return
    setDraft(hist.future[0]); setHist({ past: [...hist.past, draft], future: hist.future.slice(1) })
    setSel(NOTHING); setDirty(true); merge.current = null
  }

  // the playhead: the song's beat while the draft plays in the temple
  useEffect(() => {
    let raf = 0, last = NaN
    const tick = () => {
      const b = nowPlaying.draft && nowPlaying.id === draftRef.current?.id ? nowPlaying.beat : NaN
      if (!(Number.isNaN(b) && Number.isNaN(last)) && !(Math.abs(b - last) < 0.05)) { last = b; setPlayhead(b) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const view = useMemo(() => (draft ? applyDrag(draft, drag) : null), [draft, drag])
  const lanes = useMemo(() => (view ? laneNotes(view) : []), [view])
  const span = useMemo(() => (view ? timelineSpan(view) : { from: -8, to: 32 }), [view])
  const B0 = span.from
  const xOf = (b: number) => (b - B0) * ppb
  const laneH = Math.max(18, Math.min(34, Math.floor((fit - RULER_H - TALK_H - 14) / Math.max(1, lanes.length))))
  const rowOf = (lane: number) => lanes.length - 1 - lane
  const gridW = (span.to - B0) * ppb, lanesH = lanes.length * laneH

  // (the panel shows its content a frame after it mounts: the timeline is watched once it is there)
  const ro = useRef<ResizeObserver | null>(null)
  const scrollerRef = useCallback((el: HTMLDivElement | null) => {
    scroller.current = el
    ro.current?.disconnect(); ro.current = null
    if (el) { ro.current = new ResizeObserver(() => setFit(el.clientHeight)); ro.current.observe(el) }
  }, [])
  // keep the playhead in sight while it plays
  useEffect(() => {
    const sc = scroller.current
    if (!sc || Number.isNaN(playhead)) return
    const x = LABEL_W + xOf(playhead)
    if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft + LABEL_W) sc.scrollLeft = Math.max(0, x - LABEL_W - 80)
  }, [playhead])

  if (!draft || !view) {
    return (
      <FloatingPanel id="pigchicken-song-editor" role="dialog" aria-label="Editor de música" initial={(vw) => ({ x: 12, y: 64, w: Math.min(420, vw - 24), h: 160 })}
        className="rounded-[22px] border-2 bg-[#07130d] p-4 font-mono text-xs text-[#dfe8df]" style={{ borderColor: NEON }}>
        <p>Essa música não está mais na jukebox.</p>
        <button type="button" onClick={onClose} className={cn(btn, "mt-3 w-fit")}>Fechar</button>
      </FloatingPanel>
    )
  }

  const z = draft.music.zone, steps = SCALES[z.scale].steps, spb = 60 / z.bpm
  const laneColor = (m: number) => DEGREE_COLORS[degreeIn(z.root, steps, m) % DEGREE_COLORS.length]
  const kindOf = (id: string) => { const v = variantFor(catalog, id, "jelly"); return { species: v.species, variant: v.id } }

  // where the pointer is on the grid: its beat (on the grid) and lane
  const at = (e: { clientX: number; clientY: number }) => {
    const r = gridRef.current!.getBoundingClientRect()
    const beat = snapBeat(B0 + (e.clientX - r.left) / ppb, grid)
    const row = Math.floor((e.clientY - r.top) / laneH)
    return { beat, lane: row >= 0 && row < lanes.length ? lanes.length - 1 - row : -1, talk: e.clientY - r.top >= lanesH }
  }

  // ---------- the pointer ----------
  const beginDrag = (d: Drag) => {
    window.getSelection()?.removeAllRanges()
    dragRef.current = d; setDrag(d)
    const move = (e: PointerEvent) => {
      const cur = dragRef.current
      if (!cur) return
      const dx = e.clientX - cur.sx, dy = e.clientY - cur.sy
      const next = { ...cur, moved: cur.moved || Math.hypot(dx, dy) > 4, db: snapBeat(dx / ppb, cur.kind === "pause" ? 4 : grid), dl: cur.kind === "lines" || cur.kind === "pause" ? 0 : -Math.round(dy / laneH) }
      if (next.db !== cur.db || next.dl !== cur.dl || next.moved !== cur.moved) { dragRef.current = next; setDrag(next) }
    }
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up)
      const cur = dragRef.current
      dragRef.current = null; setDrag(null)
      if (cur?.moved && (cur.db || cur.dl) && draftRef.current) {
        if (cur.kind === "pause") { const r = movePause(draftRef.current, cur.idx[0], cur.db); commit(r.song, { ...NOTHING, pauses: [r.index] }) }
        else commit(applyDrag(draftRef.current, cur))
      }
    }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up)
  }
  const onGridDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    scroller.current?.focus({ preventScroll: true })
    const p = at(e)
    if ((e.ctrlKey || e.metaKey) && sel.aliens.length === 1 && p.lane >= 0) { commit(addNote(draft, sel.aliens[0], p.beat, lanes[p.lane]), sel); return }
    setCursor(p.beat)
    if (!e.shiftKey) setSel(NOTHING)
  }
  const onGridDouble = (e: React.MouseEvent) => {
    const p = at(e)
    if (p.talk) {
      const r = addLine(draft, { beat: p.beat, who: "narrador", text: "", secs: 3, place: "banner", blip: true })
      commit(r.song, { ...NOTHING, lines: [r.index] })
    } else if (p.lane >= 0) {
      const r = addAlien(draft, p.beat, lanes[p.lane], kindOf(brush))
      commit(r.song, { ...NOTHING, aliens: [r.index] })
    }
  }
  const pickAlien = (i: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    scroller.current?.focus({ preventScroll: true })
    const p = at(e)
    if ((e.ctrlKey || e.metaKey) && sel.aliens.length === 1 && p.lane >= 0) { commit(addNote(draft, sel.aliens[0], p.beat, lanes[p.lane]), sel); return }
    let aliens = sel.aliens
    if (e.shiftKey) aliens = aliens.includes(i) ? aliens.filter(x => x !== i) : [...aliens, i]
    else if (!aliens.includes(i)) aliens = [i]
    setSel({ aliens, lines: e.shiftKey ? sel.lines : [], pauses: [] })
    setCursor(p.beat)
    if (aliens.includes(i)) beginDrag({ kind: "aliens", idx: aliens, sx: e.clientX, sy: e.clientY, db: 0, dl: 0, moved: false })
  }
  const pickNote = (ai: number, ni: number) => (e: React.PointerEvent) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || sel.aliens.length !== 1 || sel.aliens[0] !== ai) return
    e.stopPropagation()
    scroller.current?.focus({ preventScroll: true })
    beginDrag({ kind: "note", ai, ni, sx: e.clientX, sy: e.clientY, db: 0, dl: 0, moved: false })
  }
  const dropNote = (ai: number, ni: number) => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const next = removeNote(draft, ai, ni)
    commit(next, next.aliens.length < draft.aliens.length ? NOTHING : sel)
  }
  const pickLine = (i: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    scroller.current?.focus({ preventScroll: true })
    let lines = sel.lines
    if (e.shiftKey) lines = lines.includes(i) ? lines.filter(x => x !== i) : [...lines, i]
    else if (!lines.includes(i)) lines = [i]
    setSel({ aliens: e.shiftKey ? sel.aliens : [], lines, pauses: [] })
    if (lines.includes(i)) beginDrag({ kind: "lines", idx: lines, sx: e.clientX, sy: e.clientY, db: 0, dl: 0, moved: false })
  }
  const pickPause = (i: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    scroller.current?.focus({ preventScroll: true })
    setSel({ ...NOTHING, pauses: [i] })
    beginDrag({ kind: "pause", idx: [i], sx: e.clientX, sy: e.clientY, db: 0, dl: 0, moved: false })
  }
  // a new alien of the variation picked in the bar, at the cursor, on the middle lane
  const insertAlien = (id: string) => {
    if (!lanes.length) return
    const r = addAlien(draft, snapBeat(cursor, grid), lanes[Math.floor(lanes.length / 2)], kindOf(id))
    commit(r.song, { ...NOTHING, aliens: [r.index] })
  }
  // the ruler: press and drag to move the cursor through the song; let go while it plays and it plays from there
  const rulerBeat = (e: React.PointerEvent) => { const r = e.currentTarget.getBoundingClientRect(); return snapBeat(B0 + (e.clientX - r.left) / ppb, grid) }
  const onRulerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrub(true); setCursor(rulerBeat(e))
  }
  const onRulerMove = (e: React.PointerEvent) => { if (scrub) setCursor(rulerBeat(e)) }
  const onRulerUp = (e: React.PointerEvent) => {
    if (!scrub) return
    setScrub(false)
    if (!Number.isNaN(playhead)) playDraft(draft, Math.max(0, rulerBeat(e)))
  }

  // ---------- the keys ----------
  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    const t = e.target as HTMLElement
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase()
    if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
    else if (mod && k === "y") { e.preventDefault(); redo() }
    else if (mod && k === "s") { e.preventDefault(); save() }
    else if (mod && k === "c") { const c = copyItems(draft, sel); if (c) { clip.current = c; setNote(`Copiado: ${c.aliens.length} aliens, ${c.lines.length} falas`) } }
    else if (mod && k === "x") { const c = copyItems(draft, sel); if (c) { clip.current = c; commit(removeItems(draft, sel), NOTHING) } }
    else if (mod && k === "v") { if (clip.current) { const r = pasteClip(draft, clip.current, cursor); commit(r.song, r.sel) } }
    else if (mod && k === "a") { e.preventDefault(); setSel({ aliens: draft.aliens.map((_, i) => i), lines: (draft.lines ?? []).map((_, i) => i), pauses: [] }) }
    else if (e.key === "Delete" || e.key === "Backspace") { if (!isEmpty(sel)) { e.preventDefault(); commit(removeItems(draft, sel), NOTHING) } }
    else if (e.key === "Escape") { if (!isEmpty(sel)) { e.preventDefault(); setSel(NOTHING) } }
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault()
      const d = (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 4 : grid)
      if (sel.aliens.length || sel.lines.length) commit(moveLines(moveAliens(draft, sel.aliens, d, 0), sel.lines, d), sel, `arrows-${JSON.stringify(sel)}`)
      else setCursor(c => c + d)
    } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && sel.aliens.length) {
      e.preventDefault()
      commit(moveAliens(draft, sel.aliens, 0, e.key === "ArrowUp" ? 1 : -1), sel, `arrows-${JSON.stringify(sel)}`)
    }
  }

  // ---------- the song ----------
  const save = () => {
    if (draft.builtin) { setNaming(n => n ?? `${draft.name} 2`); return }
    const clean = normalizeSong(draft)
    if (!clean) { setNote("Uma música precisa de pelo menos um alien com notas."); return }
    updateSong(loadLibrary(), clean)
    setDirty(false); setNote("Salva.")
  }
  const saveAs = () => {
    const name = naming?.trim()
    if (!name) return
    const clean = normalizeSong({ ...draft, id: draft.id || "x" })
    if (!clean) { setNote("Uma música precisa de pelo menos um alien com notas."); return }
    const copy = saveSongAs(loadLibrary(), clean, name)
    setDraft(structuredClone(copy)); setHist({ past: [], future: [] }); setDirty(false); setNaming(null); setNote(`Salva como “${copy.name}”.`)
  }
  const close = () => {
    if (dirty && !window.confirm("Sair sem salvar as mudanças?")) return
    onClose()
  }
  const play = () => {
    playDraft(draft, Math.max(0, cursor))
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    setSmall(true)
  }
  const setSong = (patch: Partial<LibrarySong>, key: string) => commit({ ...draft, ...patch }, undefined, key)
  const setZone = (patch: Partial<LibrarySong["music"]["zone"]>, key: string) => commit({ ...draft, music: { ...draft.music, zone: { ...draft.music.zone, ...patch } } }, undefined, key)

  const playing = !Number.isNaN(playhead)
  const shown = playing && !scrub ? playhead : cursor
  const one = sel.aliens.length === 1 ? draft.aliens[sel.aliens[0]] : null
  const line = sel.lines.length === 1 && !sel.aliens.length ? (draft.lines ?? [])[sel.lines[0]] : null
  const pause = sel.pauses.length === 1 ? (draft.pauses ?? [])[sel.pauses[0]] : null

  return (
    <FloatingPanel id="pigchicken-song-editor" role="dialog" aria-label="Editor de música" onKeyDown={onKey}
      initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(1180, vw - 24), h: Math.min(640, vh - 90) })} minW={360} minH={small ? 60 : 300}
      className={cn("rounded-[22px] border-2 font-mono text-xs text-[#dfe8df]", small ? "pointer-events-none border-transparent bg-transparent" : "bg-[#07130d] shadow-[0_0_24px_rgba(57,255,136,0.25),0_20px_60px_rgba(0,0,0,0.6)]")}
      style={small ? undefined : { borderColor: NEON }}>
      {/* the header: drag it; the song's name; play, stop, undo, save */}
      {/* collapsed: only a small bar in the corner, clear of the song's score */}
      <div data-drag-handle className={cn("pointer-events-auto flex items-center gap-1.5 px-3 py-2", small ? "w-fit max-w-full self-start rounded-[18px] border-2 bg-[#07130d]" : "flex-wrap border-b border-white/10")} style={small ? { borderColor: NEON } : undefined}>
        {small
          ? <h2 className="min-w-0 max-w-40 truncate text-sm text-white"><span style={{ color: z.color }}>{draft.name}</span>{dirty && <span className="text-[#93a79a]"> · não salva</span>}</h2>
          : <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <input aria-label="Nome da música" value={draft.name} maxLength={60} onChange={e => setSong({ name: e.target.value }, "name")}
                className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-bold outline-none hover:border-white/15 focus:border-primary" style={{ color: z.color }} />
              {dirty && <span className="shrink-0 text-[#93a79a]">não salva</span>}
            </div>}
        <button type="button" onClick={play} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-bold text-[#05060c]" style={{ background: NEON }} title="Toca no templo a partir do compasso do cursor"><Play className="h-4 w-4" />Tocar daqui</button>
        <button type="button" onClick={() => stopDraft()} disabled={!playing} className={btn} aria-label="Parar"><Square className="h-3.5 w-3.5" /></button>
        {!small && <>
        <button type="button" onClick={undo} disabled={!hist.past.length} className={btn} aria-label="Desfazer (Ctrl+Z)" title="Desfazer (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
        <button type="button" onClick={redo} disabled={!hist.future.length} className={btn} aria-label="Refazer (Ctrl+Shift+Z)" title="Refazer (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></button>
        {!draft.builtin && <button type="button" onClick={save} disabled={!dirty} className={btn}><Save className="h-4 w-4" />Salvar</button>}
        <button type="button" onClick={() => setNaming(n => (n === null ? `${draft.name} 2` : null))} aria-expanded={naming !== null} className={btn}>Salvar como</button>
        </>}
        <button type="button" onClick={() => setSmall(v => !v)} className={btn} aria-label={small ? "Expandir editor" : "Recolher editor"}>{small ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</button>
        <button type="button" aria-label="Fechar editor" onClick={close} className={btn}><X className="h-4 w-4" /></button>
      </div>
      {!small && <>
        {naming !== null && (
          <form onSubmit={e => { e.preventDefault(); saveAs() }} className="flex gap-1.5 border-b border-white/10 px-3 py-2">
            <input autoFocus aria-label="Nome da nova música" value={naming} onChange={e => setNaming(e.target.value)} maxLength={60} className={cn(field, "min-w-0 flex-1")} />
            <button type="submit" disabled={!naming.trim()} className="h-8 rounded-md border px-3 font-bold disabled:opacity-40" style={{ borderColor: NEON, color: NEON }}>Salvar</button>
          </form>
        )}
        {/* the song's settings and the tools */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-white/10 px-3 py-2">
          <label className="flex items-center gap-1.5">bpm<input type="number" min={40} max={200} value={z.bpm} onChange={e => setZone({ bpm: Math.max(40, Math.min(200, Number(e.target.value) || z.bpm)) }, "bpm")} className={cn(field, "w-16")} /></label>
          <select aria-label="Tom" title="Tom" value={((z.root % 12) + 12) % 12} onChange={e => { const pc = Number(e.target.value); const root = ROOTS.find(r => r % 12 === pc) ?? 60; commit(retune(draft, root, z.scale)) }} className={field}>
              {ROOTS.map(r => <option key={r} value={r % 12}>{keyName(r)}</option>)}
          </select>
          <select aria-label="Escala" title="Escala" value={z.scale} onChange={e => commit(retune(draft, z.root, e.target.value as ScaleId))} className={field}>
              {(Object.keys(SCALES) as ScaleId[]).map(k => <option key={k} value={k}>{SCALES[k].label}</option>)}
          </select>
          <label className="flex items-center gap-1.5">Intro<input type="number" min={1} max={8} value={draft.introBars} onChange={e => setSong({ introBars: Math.max(1, Math.min(8, Math.round(Number(e.target.value) || 1))) }, "intro")} className={cn(field, "w-12")} />comp.</label>
          <input type="color" aria-label="Cor" title="Cor" value={z.color} onChange={e => setZone({ color: e.target.value }, "color")} className="h-8 w-9 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
          <span className="mx-1 h-5 w-px bg-white/10" />
          <div className="flex items-center">
            <button type="button" onClick={() => insertAlien(brush)} className={cn(btn, "rounded-r-none")} title="Põe um alien desta variação no cursor (ou dê duplo clique numa faixa)"><Plus className="h-4 w-4" />Alien</button>
            <select aria-label="Variação do alien" title="Escolher uma variação já põe um alien dela no cursor" value={brush} onChange={e => { setBrush(e.target.value); insertAlien(e.target.value) }} className={cn(field, "max-w-36 rounded-l-none border-l-0")}>
              {CATALOG_SPECIES.map(sp => <optgroup key={sp} label={SPECIES[sp].name}>{catalog.filter(v => v.species === sp).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>)}
            </select>
          </div>
          <button type="button" onClick={() => { const r = insertPause(draft, snapBeat(cursor, 4), 2); commit(r.song, { ...NOTHING, pauses: [r.index] }) }} className={btn} title="Abre 2 compassos no cursor e empurra o resto para depois"><Pause className="h-4 w-4" />Pausa</button>
          <button type="button" onClick={() => { const r = addLine(draft, { beat: cursor, who: "narrador", text: "", secs: 3, place: "banner", blip: true }); commit(r.song, { ...NOTHING, lines: [r.index] }) }} className={btn}><MessageSquare className="h-4 w-4" />Fala</button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <select aria-label="Grade" value={grid} onChange={e => setGrid(Number(e.target.value))} className={field}>{GRIDS.map(g => <option key={g.v} value={g.v}>{g.label}</option>)}</select>
          <button type="button" onClick={() => setPpb(p => Math.max(8, Math.round(p / 1.4)))} className={btn} aria-label="Menos zoom"><ZoomOut className="h-4 w-4" /></button>
          <button type="button" onClick={() => setPpb(p => Math.min(120, Math.round(p * 1.4)))} className={btn} aria-label="Mais zoom"><ZoomIn className="h-4 w-4" /></button>
        </div>
        <div className="flex min-h-0 flex-1">
          {/* the timeline */}
          <div ref={scrollerRef} tabIndex={0} aria-label="Linha do tempo" className="relative min-w-0 flex-1 select-none overflow-auto outline-none focus-visible:ring-1 focus-visible:ring-primary">
            <div className="relative" style={{ width: LABEL_W + gridW, height: RULER_H + lanesH + TALK_H }}>
              {/* the ruler: bars and beats; a click puts the cursor */}
              <div className="sticky top-0 z-20 flex" style={{ height: RULER_H }}>
                <div className="sticky left-0 z-10 shrink-0 border-b border-r border-white/10 bg-[#07130d]" style={{ width: LABEL_W }} />
                <div className="relative cursor-ew-resize touch-none border-b border-white/10 bg-[#0a1a12]" style={{ width: gridW }} onPointerDown={onRulerDown} onPointerMove={onRulerMove} onPointerUp={onRulerUp} onPointerCancel={() => setScrub(false)}>
                  {Array.from({ length: Math.ceil((span.to - B0) / 4) }, (_, i) => B0 + i * 4).map(b => (
                    <span key={b} className="absolute top-0.5 text-[10px] text-[#93a79a]" style={{ left: xOf(b) + 3 }}>{b >= 0 ? b / 4 + 1 : b >= -draft.introBars * 4 ? `intro ${b / 4 + draft.introBars + 1}` : ""}</span>
                  ))}
                  <div className="pointer-events-none absolute bottom-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent" style={{ left: xOf(cursor), borderTopColor: NEON }} />
                </div>
              </div>
              <div className="flex">
                {/* the lanes' notes */}
                <div className="sticky left-0 z-10 shrink-0 border-r border-white/10 bg-[#07130d]" style={{ width: LABEL_W }}>
                  {[...lanes].reverse().map(m => <div key={m} className="flex items-center gap-1 px-1.5 text-[10px]" style={{ height: laneH }}><span className="h-2 w-2 rounded-full" style={{ background: laneColor(m) }} />{noteLabel(m)}</div>)}
                  <div className="flex items-center px-1.5 text-[10px] text-[#93a79a]" style={{ height: TALK_H }}>Diálogos</div>
                </div>
                {/* the grid */}
                <div ref={gridRef} className="relative" style={{ width: gridW, height: lanesH + TALK_H }} onPointerDown={onGridDown} onDoubleClick={onGridDouble} onContextMenu={e => e.preventDefault()}>
                  {[...lanes].reverse().map((m, r) => <div key={m} className="absolute inset-x-0" style={{ top: r * laneH, height: laneH, background: r % 2 ? "rgba(255,255,255,0.025)" : "transparent" }} />)}
                  <div className="absolute inset-x-0 border-t border-white/15 bg-black/30" style={{ top: lanesH, height: TALK_H }} />
                  <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.13) 0 1px, transparent 1px ${4 * ppb}px), repeating-linear-gradient(to right, rgba(255,255,255,0.045) 0 1px, transparent 1px ${ppb}px)` }} />
                  {/* the intro (count in) */}
                  <div className="pointer-events-none absolute top-0 bg-white/[0.04]" style={{ left: xOf(-draft.introBars * 4), width: draft.introBars * 4 * ppb, height: lanesH }}>
                    <span className="absolute left-1 top-0.5 text-[10px] text-white/30">intro</span>
                  </div>
                  {/* the pauses: room across every lane, a block on the Diálogos lane */}
                  {(view.pauses ?? []).map((p, i) => {
                    const on = sel.pauses.includes(i)
                    return (
                      <div key={`p${i}`}>
                        <div className="pointer-events-none absolute top-0" style={{ left: xOf(p.beat), width: p.bars * 4 * ppb, height: lanesH, background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 6px, transparent 6px 12px)" }} />
                        <div onPointerDown={pickPause(i)} className={cn("absolute flex cursor-grab items-start rounded-md border px-1.5 py-0.5 text-[10px]", on ? "border-white bg-white/15 text-white" : "border-white/25 bg-white/5 text-[#c9ced6]")}
                          style={{ left: xOf(p.beat), width: p.bars * 4 * ppb, top: lanesH + 2, height: TALK_H - 4 }}>
                          {p.silent ? "Pausa · silêncio" : "Pausa"} · {p.bars} comp.
                        </div>
                      </div>
                    )
                  })}
                  {/* the lines */}
                  {(view.lines ?? []).map((l, i) => {
                    const who = speakerOf(l.who, catalog), on = sel.lines.includes(i)
                    return (
                      <div key={`l${i}`} onPointerDown={pickLine(i)} title={l.text}
                        className={cn("absolute z-[2] cursor-grab truncate rounded border-l-[3px] px-1 text-[10px] leading-[16px]", on ? "bg-white/25 text-white ring-1 ring-white" : "bg-black/60 text-[#dfe8df]")}
                        style={{ left: xOf(l.beat), top: lanesH + 14 + (i % 2) * 4, width: Math.max(40, l.secs / spb * ppb), borderColor: who.color }}>
                        {who.name}: {l.text || "…"}
                      </div>
                    )
                  })}
                  {/* the aliens */}
                  {view.aliens.map((a, i) => <AlienBlock key={i} laneH={laneH} a={a} i={i} on={sel.aliens.includes(i)} only={sel.aliens.length === 1} catalog={catalog} lanes={lanes} rowOf={rowOf} xOf={xOf} z={z} laneColor={laneColor} onDown={pickAlien(i)} onNoteDown={pickNote} onNoteMenu={dropNote} />)}
                  {/* the cursor and the playhead */}
                  <div className="pointer-events-none absolute top-0 z-[3] w-0 border-l" style={{ left: xOf(cursor), height: lanesH + TALK_H, borderColor: `${NEON}aa` }} />
                  {playing && <div className="pointer-events-none absolute top-0 z-[3] w-0 border-l-2 border-white" style={{ left: xOf(playhead), height: lanesH + TALK_H }} />}
                </div>
              </div>
            </div>
          </div>
          {/* the preview and the inspector */}
          <div className="grid w-[264px] shrink-0 content-start gap-2 overflow-y-auto border-l border-white/10 p-3">
            <Preview song={view} catalog={catalog} beat={shown} />
            <div className="text-[10px] text-[#93a79a]">{playing && !scrub ? "tocando" : "cursor"}: compasso {Math.floor(shown / 4) + 1}, tempo {Math.floor((((shown % 4) + 4) % 4) * 4) / 4 + 1}</div>
            {note && <div className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-white">{note}</div>}
            {one && <AlienInspector a={one} catalog={catalog} onChange={(fn, key) => commit(updateAlien(draft, sel.aliens, fn), sel, key)} onDelete={() => commit(removeItems(draft, sel), NOTHING)} />}
            {sel.aliens.length > 1 && (
              <div className="grid gap-2">
                <h3 className="text-sm text-white">{sel.aliens.length} aliens</h3>
                <VariantSelect value="" catalog={catalog} onChange={id => { const k = kindOf(id); commit(updateAlien(draft, sel.aliens, a => ({ ...a, species: k.species, variant: k.variant })), sel) }} placeholder="Trocar a variação de todos" />
                <button type="button" onClick={() => commit(removeItems(draft, sel), NOTHING)} className={cn(btn, "w-fit")}><Trash2 className="h-4 w-4" />Excluir</button>
              </div>
            )}
            {line && <LineInspector l={line} catalog={catalog} grid={grid} onChange={(patch, key) => commit(updateLine(draft, sel.lines[0], patch), sel, key)} onDelete={() => commit(removeItems(draft, sel), NOTHING)} />}
            {pause && (
              <div className="grid gap-2">
                <h3 className="text-sm text-white">Pausa</h3>
                <p className="text-[11px] text-[#93a79a]">Nenhum alien nela: o jogo segura a próxima onda até ela acabar. Mudar o tamanho empurra ou puxa o que vem depois.</p>
                <label className="flex items-center justify-between gap-2">Compassos<input type="number" min={1} max={16} value={pause.bars} onChange={e => commit(setPauseBars(draft, sel.pauses[0], Number(e.target.value) || 1), sel, "pause-bars")} className={cn(field, "w-16")} /></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={pause.silent} onChange={e => commit(updatePause(draft, sel.pauses[0], { silent: e.target.checked }), sel)} />Silêncio total (sem o fundo)</label>
                <button type="button" onClick={() => {
                  const inside = (draft.lines ?? []).filter(l => l.beat >= pause.beat && l.beat < pauseEnd(pause)).length
                  const r = addLine(draft, { beat: Math.min(pauseEnd(pause) - 1, pause.beat + inside * 4), who: "narrador", text: "", secs: 3, place: "banner", blip: true })
                  commit(r.song, { ...NOTHING, lines: [r.index] })
                }} className={cn(btn, "w-fit")}><MessageSquare className="h-4 w-4" />Fala nesta pausa</button>
                <button type="button" onClick={() => commit(removeItems(draft, sel), NOTHING)} className={cn(btn, "w-fit")}><Trash2 className="h-4 w-4" />Excluir pausa</button>
              </div>
            )}
            {isEmpty(sel) && (
              <div className="grid gap-2">
                <label className="grid gap-1">Abertura (o banner do começo)
                  <textarea value={draft.intro} maxLength={400} rows={3} onChange={e => setSong({ intro: e.target.value }, "intro-text")} className="rounded-md border border-white/15 bg-[#0b110e] p-2 text-xs text-white" />
                </label>
                <ul className="grid gap-0.5 text-[11px] text-[#93a79a]">
                  <li>+ Alien ou escolher a variação: um alien no cursor</li>
                  <li>Duplo clique: um alien (ou uma fala, nos Diálogos)</li>
                  <li>Arrastar na régua: o cursor e a prévia</li>
                  <li>Arrastar uma pausa: muda de lugar</li>
                  <li>Arrastar: no tempo e entre as faixas</li>
                  <li>Ctrl+clique: uma nota no alien escolhido</li>
                  <li>Botão direito numa nota: tira</li>
                  <li>Setas: move · Shift: um compasso</li>
                  <li>Delete · Ctrl+C / X / V (no cursor) · Ctrl+Z</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </>}
    </FloatingPanel>
  )
}

// ---------- an alien on the timeline ----------
function AlienBlock({ laneH: LANE_H, a, i, on, only, catalog, lanes, rowOf, xOf, z, laneColor, onDown, onNoteDown, onNoteMenu }: {
  laneH: number; a: SongAlien; i: number; on: boolean; only: boolean; catalog: Catalog; lanes: number[]; rowOf: (lane: number) => number; xOf: (b: number) => number
  z: LibrarySong["music"]["zone"]; laneColor: (m: number) => string
  onDown: (e: React.PointerEvent) => void; onNoteDown: (ai: number, ni: number) => (e: React.PointerEvent) => void; onNoteMenu: (ai: number, ni: number) => (e: React.MouseEvent) => void
}) {
  const v = variantFor(catalog, a.variant, a.species)
  const color = a.color ?? v.color
  const all = alienNotes(a, v, { root: z.root, steps: SCALES[z.scale].steps })
  const ls = a.notes.map(n => laneOf(lanes, n.midi))
  const lo = Math.min(...ls), hi = Math.max(...ls)
  const from = spawnBeat(a), to = Math.max(...all.map(n => n.beat)) + v.after
  const top = rowOf(hi) * LANE_H, h = (hi - lo + 1) * LANE_H
  const extra = all.filter(n => !a.notes.some(m => m.beat === n.beat && m.midi === n.midi))
  return (
    <>
      <div onPointerDown={onDown} title={v.name} className={cn("absolute z-[1] cursor-grab rounded-md", on ? "ring-2 ring-white" : "")}
        style={{ left: xOf(from), width: Math.max(8, xOf(to) - xOf(from)), top: top + 1, height: h - 2, background: `${color}26`, border: `1px solid ${color}88` }}>
        <span className="pointer-events-none absolute left-1 top-0 max-w-full truncate text-[9px] leading-[12px]" style={{ color }}>{v.name}</span>
      </div>
      {extra.map((n, k) => <div key={`e${k}`} className="pointer-events-none absolute z-[1] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ left: xOf(n.beat), top: rowOf(laneOf(lanes, n.midi)) * LANE_H + LANE_H / 2, borderColor: laneColor(n.midi) }} />)}
      {a.notes.map((n, k) => (
        <div key={k} onPointerDown={on && only ? onNoteDown(i, k) : undefined} onContextMenu={onNoteMenu(i, k)}
          className={cn("absolute z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full", on ? "h-3 w-3 ring-2 ring-white" : "pointer-events-none h-2.5 w-2.5")}
          style={{ left: xOf(n.beat), top: rowOf(laneOf(lanes, n.midi)) * LANE_H + LANE_H / 2, background: laneColor(n.midi), cursor: on && only ? "move" : undefined }} />
      ))}
    </>
  )
}

function VariantSelect({ value, catalog, onChange, placeholder }: { value: string; catalog: Catalog; onChange: (id: string) => void; placeholder?: string }) {
  return (
    <select value={value} onChange={e => e.target.value && onChange(e.target.value)} className={field}>
      {placeholder && <option value="">{placeholder}</option>}
      {CATALOG_SPECIES.map(sp => <optgroup key={sp} label={SPECIES[sp].name}>{catalog.filter(v => v.species === sp).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>)}
    </select>
  )
}

function AlienInspector({ a, catalog, onChange, onDelete }: { a: SongAlien; catalog: Catalog; onChange: (fn: (a: SongAlien) => SongAlien, key?: string) => void; onDelete: () => void }) {
  const v = variantFor(catalog, a.variant, a.species)
  const first = Math.min(...a.notes.map(n => n.beat)), last = Math.max(...a.notes.map(n => n.beat))
  const lead = a.at === undefined ? LEAD_BEATS : first - a.at
  const moveLabel = MOVE_MODES.find(m => m.value === v.move)?.label ?? v.move
  return (
    <div className="grid gap-2">
      <h3 className="text-sm" style={{ color: a.color ?? v.color }}>{v.name}</h3>
      <p className="text-[11px] text-[#93a79a]">{a.notes.length} notas, do compasso {Math.floor(first / 4) + 1} ao {Math.floor(last / 4) + 1}. Ctrl+clique põe nota, botão direito tira, arrastar uma nota a move.</p>
      <label className="grid gap-1">Variação<VariantSelect value={v.id} catalog={catalog} onChange={id => { const nv = variantFor(catalog, id, "jelly"); onChange(x => ({ ...x, species: nv.species, variant: nv.id })) }} /></label>
      <label className="grid gap-1">Movimento
        <select value={a.move ?? ""} onChange={e => { const m = e.target.value as MoveMode | ""; onChange(x => { const y = { ...x }; if (m) y.move = m; else delete y.move; return y }) }} className={field}>
          <option value="">Da variação ({moveLabel})</option>
          {MOVE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">Ângulo
          <input type="number" min={0} max={359} placeholder="pela nota" value={a.angle ?? ""} onChange={e => { const t = e.target.value; onChange(x => { const y = { ...x }; if (t === "") delete y.angle; else y.angle = ((Math.round(Number(t)) % 360) + 360) % 360; return y }, "angle") }} className={cn(field, "w-full min-w-0")} />
        </label>
        <label className="grid gap-1">Distância
          <input type="number" min={80} max={1200} step={10} placeholder={String(SPAWN_DIST)} value={a.dist ?? ""} onChange={e => { const t = e.target.value; onChange(x => { const y = { ...x }; if (t === "") delete y.dist; else y.dist = Math.max(80, Math.min(1200, Number(t))); return y }, "dist") }} className={cn(field, "w-full min-w-0")} />
        </label>
      </div>
      <label className="flex items-center justify-between gap-2">Aparece (tempos antes da 1ª nota)
        <input type="number" min={1} max={32} step={0.5} value={lead} onChange={e => { const l = Math.max(1, Math.min(32, Number(e.target.value) || LEAD_BEATS)); onChange(x => { const y = { ...x }; if (l === LEAD_BEATS) delete y.at; else y.at = first - l; return y }, "lead") }} className={cn(field, "w-16")} />
      </label>
      <label className="flex items-center gap-2"><input type="color" value={a.color ?? v.color} onChange={e => { const c = e.target.value; onChange(x => ({ ...x, color: c }), "color") }} className="h-7 w-9 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />Cor {a.color && <button type="button" className="text-[#93a79a] underline" onClick={() => onChange(x => { const y = { ...x }; delete y.color; return y })}>da variação</button>}</label>
      <button type="button" onClick={onDelete} className={cn(btn, "w-fit")}><Trash2 className="h-4 w-4" />Excluir</button>
    </div>
  )
}

function LineInspector({ l, catalog, grid, onChange, onDelete }: { l: SongLine; catalog: Catalog; grid: number; onChange: (patch: Partial<SongLine>, key?: string) => void; onDelete: () => void }) {
  return (
    <div className="grid gap-2">
      <h3 className="text-sm text-white">Fala</h3>
      <label className="grid gap-1">Quem fala
        <select value={l.who} onChange={e => onChange({ who: e.target.value })} className={field}>
          {SPEAKERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          {CATALOG_SPECIES.map(sp => <optgroup key={sp} label={SPECIES[sp].name}>{catalog.filter(v => v.species === sp).map(v => <option key={v.id} value={`alien:${v.id}`}>{v.name}</option>)}</optgroup>)}
        </select>
      </label>
      <label className="grid gap-1">Texto
        <textarea autoFocus={!l.text} value={l.text} maxLength={200} rows={3} onChange={e => onChange({ text: e.target.value }, "line-text")} className="rounded-md border border-white/15 bg-[#0b110e] p-2 text-xs text-white" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">Tempo<input type="number" step={grid} value={l.beat} onChange={e => onChange({ beat: Number(e.target.value) || 0 }, "line-beat")} className={cn(field, "w-full min-w-0")} /></label>
        <label className="grid gap-1">Na tela (s)<input type="number" min={0.5} max={20} step={0.5} value={l.secs} onChange={e => onChange({ secs: Math.max(0.5, Math.min(20, Number(e.target.value) || 3)) }, "line-secs")} className={cn(field, "w-full min-w-0")} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {LINE_PLACES.map(p => <button key={p.value} type="button" aria-pressed={l.place === p.value} onClick={() => onChange({ place: p.value })} className={cn("h-7 rounded-full border px-3", l.place === p.value ? "border-primary text-white" : "border-white/15")}>{p.label}</button>)}
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={l.blip} onChange={e => onChange({ blip: e.target.checked })} />Blip de voz a cada letra</label>
      <button type="button" onClick={onDelete} className={cn(btn, "w-fit")}><Trash2 className="h-4 w-4" />Excluir</button>
    </div>
  )
}

// ---------- the preview: the half circle around her at a beat ----------
function Preview({ song, catalog, beat }: { song: LibrarySong; catalog: Catalog; beat: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const W = 240, H = 150, dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = W * dpr; c.height = H * dpr
    const ctx = c.getContext("2d")!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = "#050a07"; ctx.fillRect(0, 0, W, H)
    const z = song.music.zone, steps = SCALES[z.scale].steps, spb = 60 / z.bpm, now = beat * spb
    const cx = W / 2, cy = H - 22, k = (H - 30) / (SPAWN_DIST + 30)
    const deg = (m: number) => DEGREE_COLORS[degreeIn(z.root, steps, m) % DEGREE_COLORS.length]
    // the ground, the lanes and the ring
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.moveTo(0, cy + 14); ctx.lineTo(W, cy + 14); ctx.stroke()
    const R = Math.max(14, ARRIVE_R * k * 1.6)
    for (const l of fanLanes(song.fan, m => degreeIn(z.root, steps, m))) {
      ctx.strokeStyle = l.color; ctx.globalAlpha = 0.7; ctx.lineWidth = 4
      ctx.beginPath(); ctx.arc(cx, cy, R + 3, Math.min(l.a0, l.a1) + 0.03, Math.max(l.a0, l.a1) - 0.03); ctx.stroke()
      ctx.globalAlpha = 0.1; ctx.lineWidth = 1; ctx.strokeStyle = "#fff"
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(l.a0) * R, cy + Math.sin(l.a0) * R); ctx.lineTo(cx + Math.cos(l.a0) * 400, cy + Math.sin(l.a0) * 400); ctx.stroke()
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = "#f4f1e8"; ctx.beginPath(); ctx.arc(cx, cy + 6, 5, 0, Math.PI * 2); ctx.fill()
    // the aliens out at that beat, and their notes in the air
    const toScreen = (dx: number, dy: number) => ({ x: cx + dx * k, y: cy + dy * k })
    for (const a of song.aliens) {
      const v = variantFor(catalog, a.variant, a.species)
      const notes = alienNotes(a, v, { root: z.root, steps })
      const path = alienPath(song, a, v, notes, 0, spb)
      if (now < path.ts || now > path.tEnd + (path.mode === "pass" ? 3 : path.mode === "still" ? 2 : 0)) continue
      const p = pathAt(path, now, spb)
      const q = toScreen(p.dx, p.dy)
      ctx.fillStyle = a.color ?? v.color
      ctx.beginPath(); ctx.arc(q.x, q.y, 4 + 2 * v.size, 0, Math.PI * 2); ctx.fill()
      const speed = { ...v.shot, ...a.shot }.speed
      for (const n of notes) {
        const arrive = n.beat * spb
        if (arrive < now) continue
        const ang = fanAngleOf(song.fan, n.midi)
        const tx = Math.cos(ang) * ARRIVE_R, ty = Math.sin(ang) * ARRIVE_R
        const from = pathAt(path, arrive - 1, spb)
        const flight = Math.max(MIN_FLIGHT, Math.hypot(tx - from.dx, ty - from.dy) / speed)
        if (now < arrive - flight) continue
        const f = pathAt(path, arrive - flight, spb), u = (now - (arrive - flight)) / flight
        const s = toScreen(f.dx + (tx - f.dx) * u, f.dy + (ty - f.dy) * u)
        ctx.fillStyle = deg(n.midi); ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2); ctx.fill()
      }
    }
    // a pause, a line
    const pz = (song.pauses ?? []).find(p => beat >= p.beat && beat < pauseEnd(p))
    ctx.font = "10px ui-monospace, monospace"; ctx.textBaseline = "top"; ctx.textAlign = "left"
    if (pz) { ctx.fillStyle = "#c9ced6"; ctx.fillText(pz.silent ? "pausa · silêncio" : "pausa", 6, 6) }
    const said = (song.lines ?? []).filter(l => beat >= l.beat && beat < l.beat + l.secs / spb).pop()
    if (said) {
      const who = speakerOf(said.who, catalog)
      ctx.fillStyle = who.color; ctx.fillText(`${who.name}: ${said.text}`.slice(0, 38), 6, pz ? 20 : 6)
    }
  }, [song, catalog, beat])
  return <canvas ref={ref} aria-label="Prévia em volta da galinha" className="h-[150px] w-[240px] rounded-md border border-white/10" />
}
