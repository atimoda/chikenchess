"use client"

// The item's points on its drawing, dragged with the pointer (rig units, x forward from the grip, y down): the pivot
// it turns around (sitting on her shoulder or mouth), where the wing and the back wing hold it, and where the shot leaves.
// With "Arco e Flecha" the bow and the arrow are drawn apart: the arrow sits with its nock on the wing's point, the
// string bends to it, and a dashed line shows how far back the charge pulls it.
import { StepSelect } from "@/components/ui/step-select"
import { useMemo, useRef, useState } from "react"
import { ARCHERY_ART, ITEM_BOX, ITEM_SVG } from "@/lib/pigchicken/art"
import { PIVOT_PARTS, type ItemDef, type ItemId, type PivotPart } from "@/lib/pigchicken/items"

type PointKey = "pivot" | "hand" | "back" | "muzzle"
const POINTS: { key: PointKey; label: string; color: string; x: keyof ItemDef; y: keyof ItemDef; hint: string }[] = [
  { key: "pivot", label: "Eixo", color: "#ff5a4f", x: "pivotX", y: "pivotY", hint: "Fica preso na parte do corpo escolhida e é o centro do giro da mira" },
  { key: "hand", label: "Asa", color: "#ffd166", x: "handX", y: "handY", hint: "A ponta da asa da frente fica sempre encostada aqui" },
  { key: "back", label: "Asa de trás", color: "#c77dff", x: "backX", y: "backY", hint: "A ponta da asa de trás fica sempre encostada aqui" },
  { key: "muzzle", label: "Saída", color: "#4cc9f0", x: "muzzleX", y: "muzzleY", hint: "De onde sai o tiro (ou a nota) e começa a mira" },
]
const ON: Partial<Record<PointKey, "handOn" | "backOn">> = { hand: "handOn", back: "backOn" }
const PAD = 26
const snap = (v: number) => Math.round(v * 2) / 2

export function ItemPointsEditor({ id, item, base, onChange }: { id: ItemId; item: ItemDef; base: ItemDef; onChange: (fn: (d: ItemDef) => void) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<PointKey | null>(null)
  const art = ITEM_SVG[id], box = ITEM_BOX[id]
  // the view holds the drawing and the game's points with a margin, fixed while editing so a drag never rescales it
  const view = useMemo(() => {
    const [bx, by, bw, bh] = box ?? [-40, -40, 80, 80]
    const xs = [bx, bx + bw, ...POINTS.map(p => base[p.x] as number)], ys = [by, by + bh, ...POINTS.map(p => base[p.y] as number)]
    const l = Math.min(...xs) - PAD, t = Math.min(...ys) - PAD
    return { l, t, w: Math.max(...xs) + PAD - l, h: Math.max(...ys) + PAD - t }
  }, [box, base])
  const unit = Math.max(view.w, view.h) / 300
  const at = (e: React.PointerEvent) => {
    const svg = svgRef.current, m = svg?.getScreenCTM()
    if (!svg || !m) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: snap(p.x), y: snap(p.y) }
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const p = at(e), pt = POINTS.find(q => q.key === drag)!
    if (p) onChange(d => { (d as Record<string, unknown>)[pt.x] = Math.max(-200, Math.min(200, p.x)); (d as Record<string, unknown>)[pt.y] = Math.max(-200, Math.min(200, p.y)) })
  }
  if (!art) return null
  const parts = item.archery ? ARCHERY_ART[id] : undefined
  return (
    <div className="grid gap-field">
      <label className="flex items-center justify-between gap-3" title="A parte do corpo onde o eixo do item fica preso">
        <span>Eixo preso em</span>
        <StepSelect value={item.pivotAt} onChange={e => { const v = e.target.value as PivotPart; onChange(d => { d.pivotAt = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
          {PIVOT_PARTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </StepSelect>
      </label>
      <div className="flex flex-wrap gap-x-4 gap-y-[2px]">
        {(["hand", "back"] as const).map(k => {
          const flag = ON[k]!
          return (
            <label key={k} className="flex items-center gap-2" title={POINTS.find(p => p.key === k)!.hint}>
              <input type="checkbox" checked={item[flag]} onChange={e => { const v = e.target.checked; onChange(d => { d[flag] = v }) }} className="h-4 w-4 accent-[var(--primary)]" />
              <span>{k === "hand" ? "Asa segura o item" : "Asa de trás segura o item"}</span>
            </label>
          )
        })}
        <label className="flex items-center gap-2" title="Espelha as asas que seguram o item ao longo do comprimento, para não ficarem de cabeça para baixo quando giram muito">
          <input type="checkbox" checked={item.wingFlip} onChange={e => { const v = e.target.checked; onChange(d => { d.wingFlip = v }) }} className="h-4 w-4 accent-[var(--primary)]" />
          <span>Inverter asa (vertical)</span>
        </label>
        <label className="flex items-center gap-2" title="Pig e Ken: o item fica na mão de trás, e a da frente vira a segunda mão">
          <input type="checkbox" checked={item.swapHands} onChange={e => { const v = e.target.checked; onChange(d => { d.swapHands = v }) }} className="h-4 w-4 accent-[var(--primary)]" />
          <span>Segurar com a outra mão (dois braços)</span>
        </label>
        {item.fireMode === "charge" && (
          <label className="flex items-center gap-2" title="Na carga do tiro, a asa da frente puxa a flecha para trás e a corda dobra junto; a asa de trás segura o arco parado">
            <input type="checkbox" checked={item.archery} onChange={e => { const v = e.target.checked; onChange(d => { d.archery = v; if (v) { d.handOn = true; d.backOn = true } }) }} className="h-4 w-4 accent-[var(--primary)]" />
            <span>Arco e Flecha</span>
          </label>
        )}
      </div>
      <svg ref={svgRef} viewBox={`${view.l} ${view.t} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" aria-label="Pontos do item: arraste para mudar"
        onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
        className="h-64 w-full touch-none select-none rounded-md border border-white/10 bg-[#a9bcb1]">
        <line x1={view.l} y1={0} x2={view.l + view.w} y2={0} stroke="#0b110e" strokeOpacity={0.25} strokeWidth={unit} />
        <line x1={0} y1={view.t} x2={0} y2={view.t + view.h} stroke="#0b110e" strokeOpacity={0.25} strokeWidth={unit} />
        {parts ? (
          <g style={{ pointerEvents: "none" }}>
            <path d={`M${parts.string[0]} ${parts.string[1]} L${item.handX} ${item.handY} L${parts.string[2]} ${parts.string[3]}`} fill="none" stroke="#e8e2d0" strokeWidth={1.2} strokeLinejoin="round" />
            <g transform={`translate(${item.handX} ${item.handY})`} dangerouslySetInnerHTML={{ __html: parts.arrow }} />
            <g dangerouslySetInnerHTML={{ __html: parts.body }} />
          </g>
        ) : <g dangerouslySetInnerHTML={{ __html: art }} style={{ pointerEvents: "none" }} />}
        {/* how far back the charge pulls the wing's point */}
        {item.archery && item.fireMode === "charge" && <line x1={item.handX} y1={item.handY} x2={item.handX - item.drawLen} y2={item.handY} stroke="#ffd166" strokeOpacity={0.7} strokeWidth={unit} strokeDasharray={`${4 * unit} ${3 * unit}`} />}
        {/* the shot's line, from the muzzle forward */}
        <line x1={item.muzzleX} y1={item.muzzleY} x2={view.l + view.w} y2={item.muzzleY} stroke="#4cc9f0" strokeOpacity={0.4} strokeWidth={unit} strokeDasharray={`${4 * unit} ${3 * unit}`} />
        {POINTS.map(p => {
          const flag = ON[p.key], off = flag ? !item[flag] : false
          const x = item[p.x] as number, y = item[p.y] as number, r = 7 * unit
          return (
            <g key={p.key} opacity={off ? 0.3 : 1} style={{ cursor: off ? "default" : drag === p.key ? "grabbing" : "grab" }}
              onPointerDown={e => { if (off) return; e.preventDefault(); (e.currentTarget.ownerSVGElement ?? svgRef.current)?.setPointerCapture(e.pointerId); setDrag(p.key) }}>
              <title>{`${p.label}: ${x}, ${y}. ${p.hint}`}</title>
              <circle cx={x} cy={y} r={r * 1.9} fill="transparent" />
              <circle cx={x} cy={y} r={r} fill={p.color} fillOpacity={0.35} stroke={p.color} strokeWidth={1.5 * unit} />
              {p.key === "pivot" && <path d={`M${x - r * 1.5} ${y} H${x + r * 1.5} M${x} ${y - r * 1.5} V${y + r * 1.5}`} stroke={p.color} strokeWidth={1.2 * unit} />}
              <text x={x + r * 1.3} y={y - r * 1.1} fontSize={11 * unit} fill={p.color} style={{ paintOrder: "stroke", stroke: "#0b110e", strokeWidth: 3 * unit }}>{p.label}</text>
            </g>
          )
        })}
      </svg>
      <p className="text-[10px] text-[#93a79a]">Arraste os pontos sobre o desenho. Eixo: preso {item.pivotAt === "mouth" ? "na boca (bico)" : "no ombro"}, é onde o item gira com a mira. Asa e Asa de trás: a ponta de cada asa fica grudada no ponto, girando e esticando. {item.beam ? "No violino, enquanto toca, a asa segura o arco. " : ""}As barras abaixo ajustam fino.</p>
    </div>
  )
}
