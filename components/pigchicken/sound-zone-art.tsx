"use client"

// The music's elements drawn in the Pátio: the Faixas fixas (a fan or columns of lanes in the colour of each note's
// degree, faint like the frets of the songs' fan) and the Zona sonora (only in the editor: its colour and label).
import { memo } from "react"
import { NOTE_NAMES } from "@/lib/pigchicken/music"
import { lanesCenter, lanesShape, soundZoneLabel, type LanesParams, type SoundZoneParams } from "@/lib/pigchicken/sound-zones"

const noteName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`

// one wedge of the fan, from the centre out to `r`
function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`
  const span = Math.abs(a1 - a0)
  if (span >= Math.PI * 2 - 1e-6) return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
  return `M${cx} ${cy}L${p(a0)}A${r} ${r} 0 ${span > Math.PI ? 1 : 0} ${a1 > a0 ? 1 : 0} ${p(a1)}Z`
}

export const LanesArt = memo(function LanesArt({ lanes, w, h, editing = false, labels = false }: { lanes: LanesParams; w: number; h: number; editing?: boolean; labels?: boolean }) {
  const shape = lanesShape(lanes)
  // in the game the lanes show as strongly as their glow says; the editor always shows them a little
  const glow = editing ? Math.max(0.3, lanes.glow) : lanes.glow
  if (glow <= 0 || !shape.length) return null
  const fill = 0.16 * glow, line = 0.55 * glow
  if (lanes.layout === "columns") {
    return (
      <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-hidden">
        {shape.map((l, i) => (
          <g key={i}>
            <rect x={l.from * w} y={0} width={(l.to - l.from) * w} height={h} fill={l.color} opacity={l.midi === null ? fill / 3 : fill} />
            <line x1={l.from * w} x2={l.from * w} y1={0} y2={h} stroke={l.color} strokeWidth={2} opacity={line} />
            {labels && l.midi !== null && <text x={(l.from + l.to) / 2 * w} y={h - 8} textAnchor="middle" fontSize={13} fontFamily="monospace" fill={l.color}>{noteName(l.midi)}</text>}
          </g>
        ))}
      </svg>
    )
  }
  const c = lanesCenter({ x: 0, y: 0, w, h }, lanes)
  const r = Math.hypot(Math.max(c.x, w - c.x), Math.max(c.y, h - c.y))
  const lr = Math.min(Math.max(40, Math.min(w / 2, h) * 0.78), r)
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-hidden">
      {shape.map((l, i) => (
        <g key={i}>
          <path d={wedge(c.x, c.y, r, l.a0, l.a1)} fill={l.color} opacity={l.midi === null ? fill / 3 : fill} />
          <line x1={c.x} y1={c.y} x2={c.x + Math.cos(l.a0) * r} y2={c.y + Math.sin(l.a0) * r} stroke={l.color} strokeWidth={2} opacity={line} />
          {labels && l.midi !== null && <text x={c.x + Math.cos(l.mid) * lr} y={c.y + Math.sin(l.mid) * lr} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontFamily="monospace" fill={l.color}>{noteName(l.midi)}</text>}
        </g>
      ))}
      <circle cx={c.x} cy={c.y} r={5} fill="#fff" opacity={line} />
    </svg>
  )
})

export const ZoneArt = memo(function ZoneArt({ zone, strong = false }: { zone: SoundZoneParams; strong?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-md" style={{ background: `${zone.color}${strong ? "2e" : "1f"}`, border: `2px ${zone.music ? "solid" : "dashed"} ${zone.color}` }}>
      <span className="absolute left-2 top-2 max-w-[calc(100%-16px)] truncate rounded bg-black/70 px-1.5 py-0.5 font-mono text-[12px]" style={{ color: zone.color }}>
        ♫ {soundZoneLabel(zone)}
      </span>
    </div>
  )
})
