'use client'

import { useRef, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { ARP_MAX_STEPS, ARP_RATES, DEFAULT_ARP_CONFIG, normalizeArpConfig, type ArpConfig, type ArpFeel, type ArpOrder } from '@/lib/music/arpeggiator'
import styles from './music-arpeggiator.module.css'

// The arp config is a personal preference shared by every sequencer on screen.
const KEY = 'chickenchess:arpeggiator:v1'
let current: ArpConfig | null = null
const listeners = new Set<() => void>()
function read(): ArpConfig {
  if (current) return current
  try { current = normalizeArpConfig(JSON.parse(localStorage.getItem(KEY) ?? 'null')) } catch { current = DEFAULT_ARP_CONFIG }
  return current
}
function write(next: ArpConfig) {
  current = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode: keep it for this session */ }
  listeners.forEach(listener => listener())
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function useArpConfig(): [ArpConfig, (patch: Partial<ArpConfig>) => ArpConfig] {
  const config = useSyncExternalStore(subscribe, read, () => DEFAULT_ARP_CONFIG)
  return [config, patch => { const next = normalizeArpConfig({ ...read(), ...patch }); write(next); return next }]
}

/** Little dot pictures of each order, five columns, rows from the bottom. */
const ORDERS: { order: ArpOrder; label: string; title: string; dots: number[][] }[] = [
  { order: 'up', label: 'Up', title: 'Lowest to highest, then again', dots: [[0], [1], [2], [3], [4]] },
  { order: 'down', label: 'Down', title: 'Highest to lowest, then again', dots: [[4], [3], [2], [1], [0]] },
  { order: 'updown', label: 'Up/Down', title: 'Up and back down without repeating the ends', dots: [[0], [2], [4], [2], [0]] },
  { order: 'played', label: 'As played', title: 'The order the notes first sound in the MIDI', dots: [[1], [3], [0], [4], [2]] },
  { order: 'walk', label: 'Walk', title: 'Each step moves one note up or down at random', dots: [[1], [2], [1], [2], [3]] },
  { order: 'random', label: 'Random', title: 'Any held note at random, never the same twice in a row', dots: [[3], [0], [4], [1], [3]] },
  { order: 'chord', label: 'Chord', title: 'All held notes together on every step', dots: [[0, 2, 4], [0, 2, 4], [0, 2, 4]] },
]
const FEELS: { feel: ArpFeel; label: string; title: string }[] = [
  { feel: 'straight', label: '–', title: 'Straight' },
  { feel: 'triplet', label: 'T', title: 'Triplet (⅔ of the step)' },
  { feel: 'dotted', label: '.', title: 'Dotted (1½ steps)' },
]

function OrderDots({ dots }: { dots: number[][] }) {
  return <svg viewBox={`0 0 ${dots.length * 6} 30`} aria-hidden="true">
    {dots.flatMap((rows, column) => rows.map(row => <rect key={`${column}-${row}`} x={column * 6 + 1} y={24 - row * 6} width="4" height="4" rx="1" />))}
  </svg>
}

function Slider({ label, value, onChange, title }: { label: string; value: number; onChange: (value: number) => void; title: string }) {
  return <label className={styles.slider} title={title}>
    <span className={styles.head}><span>{label}</span><output>{Math.round(value * 100)}%</output></span>
    <input type="range" min={0} max={100} value={Math.round(value * 100)} onChange={event => onChange(Number(event.target.value) / 100)} style={{ '--fill': `${value * 100}%` } as CSSProperties} />
  </label>
}

/** Bars of the rhythm: drag up/down to set each step's accent; the bottom is a rest. */
function RhythmBars({ config, onChange }: { config: ArpConfig; onChange: (rhythm: number[]) => void }) {
  const drag = useRef<{ rhythm: number[]; erase: boolean } | null>(null)
  const set = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const index = Math.floor((event.clientX - box.left) / box.width * config.length)
    if (!drag.current || index < 0 || index >= config.length) return
    const level = Math.max(0, Math.min(1, 1 - (event.clientY - box.top) / box.height))
    const value = drag.current.erase || level < .12 ? 0 : Math.round(level * 20) / 20
    if (drag.current.rhythm[index] === value) return
    drag.current.rhythm = drag.current.rhythm.map((v, i) => i === index ? value : v)
    onChange(drag.current.rhythm)
  }
  return <div className={styles.rhythm} role="group" aria-label="Rhythm: drag each bar up for a stronger step, to the bottom for a rest"
    onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { rhythm: [...config.rhythm], erase: event.button === 2 || event.altKey }; set(event) }}
    onPointerMove={event => { if (drag.current) set(event) }}
    onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}
    onContextMenu={event => event.preventDefault()}>
    {config.rhythm.slice(0, config.length).map((value, index) => <i key={index} data-rest={value <= .02 || undefined} data-beat={index % 4 === 0 || undefined} style={{ '--level': value } as CSSProperties} title={`Step ${index + 1}: ${value <= .02 ? 'rest' : `${Math.round(value * 100)}%`}`} />)}
  </div>
}

/** Settings opened by holding the Arpeggiator button; every change re-applies to the variation. */
export function ArpeggiatorPanel({ config, onChange }: { config: ArpConfig; onChange: (patch: Partial<ArpConfig>) => void }) {
  return <div className={styles.panel} role="group" aria-label="Arpeggiator settings">
    <div className={styles.section}>
      <span className={styles.label}>Order</span>
      <div className={styles.orders} role="radiogroup" aria-label="Arp order">
        {ORDERS.map(({ order, label, title, dots }) => <button key={order} type="button" role="radio" aria-checked={config.order === order} data-on={config.order === order} title={title} onClick={() => onChange({ order })}><OrderDots dots={dots} /><span>{label}</span></button>)}
      </div>
    </div>
    <div className={styles.row}>
      <div className={styles.section}>
        <span className={styles.label}>Rate</span>
        <span className={styles.group}>
          <select aria-label="Arp rate" value={config.rate} onChange={event => onChange({ rate: Number(event.target.value) as ArpConfig['rate'] })}>{ARP_RATES.map(rate => <option key={rate} value={rate}>1/{rate}</option>)}</select>
          <span className={styles.segmented} role="radiogroup" aria-label="Rate feel">{FEELS.map(({ feel, label, title }) => <button key={feel} type="button" role="radio" aria-checked={config.feel === feel} data-on={config.feel === feel} title={title} onClick={() => onChange({ feel })}>{label}</button>)}</span>
        </span>
      </div>
      <div className={styles.section}>
        <span className={styles.label}>Octaves</span>
        <span className={styles.segmented} role="radiogroup" aria-label="Arp octaves">{[1, 2, 3, 4].map(octaves => <button key={octaves} type="button" role="radio" aria-checked={config.octaves === octaves} data-on={config.octaves === octaves} onClick={() => onChange({ octaves })}>{octaves}</button>)}</span>
      </div>
      <div className={styles.section}>
        <span className={styles.label}>Length <small>steps</small></span>
        <span className={styles.stepper}>
          <button type="button" aria-label="Fewer steps" disabled={config.length <= 1} onClick={() => onChange({ length: config.length - 1 })}><Minus size={12} /></button>
          <output aria-label="Arp length">{config.length}</output>
          <button type="button" aria-label="More steps" disabled={config.length >= ARP_MAX_STEPS} onClick={() => onChange({ length: config.length + 1 })}><Plus size={12} /></button>
        </span>
      </div>
    </div>
    <div className={styles.row}>
      <Slider label="Gate" value={config.gate} title="How long each note holds, as a share of the step" onChange={gate => onChange({ gate: Math.max(.05, gate) })} />
      <Slider label="Swing" value={config.swing} title="Pushes every second step later" onChange={swing => onChange({ swing })} />
    </div>
    <div className={styles.row} data-disabled={config.order === 'chord' || undefined}>
      <Slider label="Chord" value={config.chord} title="Chance, on each loop, that a step also plays chord tones above the arp note" onChange={chord => onChange({ chord })} />
      <div className={styles.section}>
        <span className={styles.label}>Above</span>
        <span className={styles.segmented} role="radiogroup" aria-label="Chord tones above">{([0, 1, 2] as const).map(above => <button key={above} type="button" role="radio" aria-checked={config.above === above} data-on={config.above === above} disabled={config.chord <= 0} title={above === 0 ? 'The same note an octave up' : `The next ${above} held note${above > 1 ? 's' : ''} above`} onClick={() => onChange({ above })}>{above === 0 ? '0' : `+${above}`}</button>)}</span>
      </div>
    </div>
    <div className={styles.section}>
      <span className={styles.label}>Rhythm</span>
      <RhythmBars config={config} onChange={rhythm => onChange({ rhythm: [...rhythm, ...config.rhythm.slice(rhythm.length)] })} />
    </div>
  </div>
}

const HOLD_MS = 450

/** Click applies the arp; holding (or right-click / ↓) opens and closes the settings. */
export function ArpeggiatorButton({ open, disabled, onApply, onToggleOpen }: { open: boolean; disabled?: boolean; onApply: () => void; onToggleOpen: () => void }) {
  const timer = useRef<number | null>(null)
  const held = useRef(false)
  const clear = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null }
  return <button type="button" className={styles.toggle} data-on={open} aria-expanded={open} disabled={disabled}
    aria-label="Arpeggiator" title="Arpeggiator: click to arpeggiate this variation's notes; hold (or right-click) to open the settings"
    onPointerDown={event => { if (event.button !== 0) return; held.current = false; clear(); timer.current = window.setTimeout(() => { timer.current = null; held.current = true; onToggleOpen() }, HOLD_MS) }}
    onPointerUp={clear} onPointerLeave={clear} onPointerCancel={clear}
    onContextMenu={event => { event.preventDefault(); if (!held.current) onToggleOpen() }}
    onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); onToggleOpen() } }}
    onClick={() => { if (held.current) { held.current = false; return } onApply() }}>
    <svg viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="9" width="2.4" height="2.4" rx=".6" /><rect x="4.4" y="6.5" width="2.4" height="2.4" rx=".6" /><rect x="7.8" y="4" width="2.4" height="2.4" rx=".6" /><rect x="11.2" y="1.5" width="2.4" height="2.4" rx=".6" /><rect x="7.8" y="9" width="2.4" height="2.4" rx=".6" opacity=".45" /></svg>
  </button>
}
