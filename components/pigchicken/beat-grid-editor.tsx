"use client"

// The grid of a zone's percussion: one row per instrument of the kit, sixteen sixteenths, and each note a block
// that sits where it sounds. A click on an empty cell puts a note there (on the rhythm's own microtiming); a click
// on a note goes normal → accent → rest; dragging a note sideways moves it in time, as far as half a sixteenth
// from any step, so it can sit anywhere in the bar. The cells behind are the rigid grid, for reference.
import { useRef, useState } from "react"
import { SHIFT_MAX, STEPS, drumRow, drumShift, moveDrumNote, toggleDrumNote, type DrumPattern, type DrumRow } from "@/lib/pigchicken/zone-ambience"

// px a pointer travels before a press on a note is a drag and not a click
const DRAG_PX = 3
// hundredths of a sixteenth inside which a dragged note snaps to the grid or to the rhythm's own place
const SNAP = 3
const msOf = (shift: number, bpm: number) => Math.round(shift / 100 * 15000 / bpm)
const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

type Drag = { row: DrumRow; from: number; x: number; cell: number; start: number; base: DrumPattern; moved: boolean }

export function BeatGridEditor({ pattern, rows, color, bpm, seed, onChange }: {
  pattern: DrumPattern; rows: { id: DrumRow; label: string }[]; color: string; bpm: number
  // the rhythm's microtiming on a step (hundredths of a sixteenth): where a new note starts and what a drag snaps to
  seed: (step: number) => number
  onChange: (p: DrumPattern) => void
}) {
  const drag = useRef<Drag | null>(null)
  // the grid while a note is dragged, and the note being dragged in it
  const [draft, setDraft] = useState<{ pattern: DrumPattern; row: DrumRow; from: number; step: number } | null>(null)
  const shown = draft?.pattern ?? pattern
  const snapped = (pos: number) => {
    const step = Math.max(0, Math.min(STEPS - 1, Math.round(pos))), off = (pos - step) * 100
    for (const to of [0, seed(step)]) if (Math.abs(off - to) <= SNAP && Math.abs(to) <= SHIFT_MAX) return step + to / 100
    return pos
  }
  const nudge = (row: DrumRow, step: number, by: number) => onChange(moveDrumNote(pattern, row, step, step + (drumShift(pattern.time, row, step) + by) / 100).pattern)
  return (
    <div className="grid gap-field" aria-label="Grade da batida">
      {rows.map(r => {
        const row = drumRow(shown.grid, r.id)
        return (
          <div key={r.id} className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-1.5">
            <span className="truncate text-[10px] text-[#93a79a]" title={r.label}>{r.label}</span>
            <div data-no-drag className="relative h-5 touch-none select-none">
              <div className="absolute inset-0 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-px">
                {Array.from({ length: STEPS }, (_, i) => (
                  <button key={i} type="button" tabIndex={row[i] === "." ? 0 : -1} aria-label={`${r.label}, passo ${i + 1}`} aria-pressed={false}
                    onClick={() => { if (row[i] === ".") onChange(toggleDrumNote(pattern, r.id, i, seed(i))) }}
                    className="rounded-[2px]" style={{ background: i % 8 < 4 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)" }} />
                ))}
              </div>
              {Array.from(row, (c, i) => {
                if (c === ".") return null
                const shift = drumShift(shown.time, r.id, i), held = draft?.row === r.id && draft.step === i
                const ms = msOf(shift, bpm), when = shift ? `${signed(ms)} ms (${signed(shift)}% de semicolcheia)` : "na grade"
                return (
                  // a dragged note keeps the key of the step it left, so it stays the same element across steps
                  <button key={held ? `n${draft.from}` : `n${i}`} type="button" aria-label={`${r.label}, passo ${i + 1}: ${when}`} aria-pressed title={when}
                    onPointerDown={e => {
                      if (e.button !== 0) return
                      e.currentTarget.setPointerCapture(e.pointerId)
                      const cell = (e.currentTarget.parentElement?.getBoundingClientRect().width ?? 0) / STEPS
                      drag.current = { row: r.id, from: i, x: e.clientX, cell, start: i + shift / 100, base: pattern, moved: false }
                    }}
                    onPointerMove={e => {
                      const d = drag.current
                      if (!d || !d.cell) return
                      if (!d.moved && Math.abs(e.clientX - d.x) < DRAG_PX) return
                      d.moved = true
                      const to = moveDrumNote(d.base, d.row, d.from, snapped(d.start + (e.clientX - d.x) / d.cell))
                      setDraft({ pattern: to.pattern, row: d.row, from: d.from, step: to.step })
                    }}
                    onPointerUp={() => {
                      const d = drag.current
                      drag.current = null
                      if (!d) return
                      if (d.moved) { if (draft) onChange(draft.pattern) } else onChange(toggleDrumNote(pattern, d.row, d.from))
                      setDraft(null)
                    }}
                    onPointerCancel={() => { drag.current = null; setDraft(null) }}
                    onKeyDown={e => {
                      const by = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0
                      if (by) { e.preventDefault(); e.stopPropagation(); nudge(r.id, i, by * (e.shiftKey ? 5 : 1)) }
                      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(toggleDrumNote(pattern, r.id, i)) }
                    }}
                    className={"absolute inset-y-0 cursor-ew-resize rounded-[2px] outline-none focus-visible:ring-1 focus-visible:ring-white " + (held ? "z-10 ring-1 ring-white" : "")}
                    style={{ left: `${(i + shift / 100) * 100 / STEPS}%`, width: `calc(${100 / STEPS}% - 1px)`, background: color, opacity: c === "o" ? 0.5 : c === "x" ? 0.8 : 1 }}>
                    {held && <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-black/85 px-1 text-[9px] leading-4 text-white">{signed(ms)} ms</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
