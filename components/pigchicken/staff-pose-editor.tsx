"use client"

// How she carries a staff (taco, passaguá), dragged with the pointer: the point of the staff's drawing the wing's hand
// grips, and, on her body, where that hand sits and how the staff leans, carried and with the strong blow fully charged
// (lib/pigchicken/staff-pose.ts). The carried and charged poses share the drawing: one is edited, the other is a ghost.
import { msg, useT } from "@/lib/i18n"
import { useMemo, useRef, useState } from "react"
import { ITEM_BOX, ITEM_SVG } from "@/lib/pigchicken/art"
import type { ItemDef, ItemId } from "@/lib/pigchicken/items"
import { staffPose, unwrapAngle } from "@/lib/pigchicken/staff-pose"
import { LOOK_ART } from "@/lib/chicken/look-art"
import { CHICKEN_SHOULDER, wingReachTransform } from "@/lib/chicken/engine"

type Which = "carry" | "wind"
const FIELDS: Record<Which, { x: "staffX" | "windX"; y: "staffY" | "windY"; angle: "staffAngle" | "windAngle"; label: string }> = {
  carry: { x: "staffX", y: "staffY", angle: "staffAngle", label: msg("Parado") },
  wind: { x: "windX", y: "windY", angle: "windAngle", label: msg("Carregando") },
}
const HAND = "#ffd166", TIP = "#4cc9f0"
const DEG = Math.PI / 180
const snap = (v: number) => Math.round(v * 2) / 2
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
// her whole body with room around it for the staff, in rig units
const BODY_VIEW = { l: -170, t: -262, w: 300, h: 290 }
const PAD = 14

export function StaffPoseEditor({ id, item, onChange }: { id: ItemId; item: ItemDef; onChange: (fn: (d: ItemDef) => void) => void }) {
  const t = useT()
  const gripRef = useRef<SVGSVGElement>(null), bodyRef = useRef<SVGSVGElement>(null)
  const [which, setWhich] = useState<Which>("carry")
  const [drag, setDrag] = useState<"grip" | "grip2" | "hand" | "tip" | null>(null)
  const art = ITEM_SVG[id], box = ITEM_BOX[id] ?? [-10, -10, 100, 20]
  const chicken = useMemo(() => LOOK_ART.layers(LOOK_ART.breedLook(LOOK_ART.BREEDS[0].id)), [])
  if (!art) return null
  const [bx, by, bw, bh] = box
  const gripView = { l: bx - PAD, t: by - PAD, w: bw + PAD * 2, h: bh + PAD * 2 }
  // the far end of the staff's drawing, on its axis: the ball that leans it
  const tipX = bx + bw
  const S = CHICKEN_SHOULDER
  const poses: Record<Which, ReturnType<typeof staffPose>> = { carry: staffPose(item, 0), wind: staffPose(item, 1) }
  const place = (p: ReturnType<typeof staffPose>) => `translate(${S.x + p.x} ${S.y + p.y}) rotate(${p.angle}) translate(${-item.gripX} ${-item.gripY})`
  const tipOf = (p: ReturnType<typeof staffPose>) => {
    const r = p.angle * DEG, x = tipX - item.gripX, y = -item.gripY
    return { x: S.x + p.x + x * Math.cos(r) - y * Math.sin(r), y: S.y + p.y + x * Math.sin(r) + y * Math.cos(r) }
  }
  const at = (svg: SVGSVGElement | null, e: React.PointerEvent) => {
    const m = svg?.getScreenCTM()
    return svg && m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : null
  }
  const f = FIELDS[which], cur = poses[which], other = poses[which === "carry" ? "wind" : "carry"]
  const moveGrip = (e: React.PointerEvent) => {
    const p = drag === "grip" || drag === "grip2" ? at(gripRef.current, e) : null
    if (p && drag === "grip2") onChange(d => { d.grip2X = clamp(snap(p.x), -200, 200); d.grip2Y = clamp(snap(p.y), -200, 200) })
    else if (p) onChange(d => { d.gripX = clamp(snap(p.x), -200, 200); d.gripY = clamp(snap(p.y), -200, 200) })
  }
  const moveBody = (e: React.PointerEvent) => {
    const p = drag === "hand" || drag === "tip" ? at(bodyRef.current, e) : null
    if (!p) return
    if (drag === "hand") onChange(d => { d[f.x] = clamp(snap(p.x - S.x), -200, 200); d[f.y] = clamp(snap(p.y - S.y), -200, 200) })
    else {
      // the tip follows the pointer: the staff turns around the hand, on the side it was already turning to
      const a = (Math.atan2(p.y - (S.y + cur.y), p.x - (S.x + cur.x)) - Math.atan2(-item.gripY, tipX - item.gripX)) / DEG
      onChange(d => { d[f.angle] = clamp(Math.round(unwrapAngle(a, d[f.angle])), -360, 360) })
    }
  }
  const stop = () => setDrag(null)
  const grab = (k: "grip" | "grip2" | "hand" | "tip") => (e: React.PointerEvent<SVGGElement>) => { e.preventDefault(); e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId); setDrag(k) }
  const ball = (k: "grip" | "grip2" | "hand" | "tip", x: number, y: number, r: number, color: string, title: string) => (
    <g style={{ cursor: drag === k ? "grabbing" : "grab" }} onPointerDown={grab(k)}>
      <title>{title}</title>
      <circle cx={x} cy={y} r={r * 1.9} fill="transparent" />
      <circle cx={x} cy={y} r={r} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={r * 0.22} />
    </g>
  )
  const tip = tipOf(cur)
  return (
    <div className="grid gap-field">
      <svg ref={gripRef} viewBox={`${gripView.l} ${gripView.t} ${gripView.w} ${gripView.h}`} preserveAspectRatio="xMidYMid meet" aria-label={t("Ponto do bastão que a mão da asa segura: arraste para mudar")}
        onPointerMove={moveGrip} onPointerUp={stop} onPointerCancel={stop}
        className="h-24 w-full touch-none select-none rounded-md border border-white/10 bg-[#a9bcb1]">
        <g dangerouslySetInnerHTML={{ __html: art }} style={{ pointerEvents: "none" }} />
        {ball("grip", item.gripX, item.gripY, 3.2, HAND, `${t("Mão da asa")}: ${item.gripX}, ${item.gripY}`)}
        {item.grip2On && ball("grip2", item.grip2X, item.grip2Y, 3.2, "#ffd166", `${t("Segunda mão")}: ${item.grip2X}, ${item.grip2Y}`)}
      </svg>
      <div className="flex gap-field">
        {(Object.keys(FIELDS) as Which[]).map(k => (
          <button key={k} type="button" aria-pressed={which === k} onClick={() => setWhich(k)}
            title={k === "carry" ? t("Como ela carrega o bastão") : t("Como ela fica com o golpe forte todo carregado")}
            className={`h-8 flex-1 rounded-md border px-2 ${which === k ? "border-primary bg-primary/15 text-white" : "border-white/15 hover:border-primary"}`}>{t(FIELDS[k].label)}</button>
        ))}
      </div>
      <svg ref={bodyRef} viewBox={`${BODY_VIEW.l} ${BODY_VIEW.t} ${BODY_VIEW.w} ${BODY_VIEW.h}`} preserveAspectRatio="xMidYMid meet" aria-label={t("Bastão no corpo ({pose}): arraste a mão e a ponta", { pose: t(f.label) })}
        onPointerMove={moveBody} onPointerUp={stop} onPointerCancel={stop}
        className="h-72 w-full touch-none select-none rounded-md border border-white/10 bg-[#a9bcb1]">
        <g style={{ pointerEvents: "none" }}>
          <g dangerouslySetInnerHTML={{ __html: chicken.body }} />
          <g opacity={0.3} transform={place(other)} dangerouslySetInnerHTML={{ __html: art }} />
          <g transform={wingReachTransform(cur.x, cur.y, item.wingFlip)} dangerouslySetInnerHTML={{ __html: chicken.wing }} />
          <g transform={place(cur)} dangerouslySetInnerHTML={{ __html: art }} />
        </g>
        {ball("tip", tip.x, tip.y, 7, TIP, `${t("Inclinação")}: ${item[f.angle]}°`)}
        {ball("hand", S.x + cur.x, S.y + cur.y, 7, HAND, `${t("Mão da asa no corpo")}: ${item[f.x]}, ${item[f.y]}`)}
      </svg>
      <label className="flex items-center gap-2" title={t("Espelha a asa que segura o bastão ao longo do comprimento, para não ficar de cabeça para baixo quando gira muito")}>
        <input type="checkbox" checked={item.wingFlip} onChange={e => { const v = e.target.checked; onChange(d => { d.wingFlip = v }) }} className="h-4 w-4 accent-[var(--primary)]" />
        <span>{t("Inverter asa (vertical)")}</span>
      </label>
      <label className="flex items-center gap-2" title={t("Pig e Ken: o item fica na mão de trás, e a da frente vira a segunda mão")}>
        <input type="checkbox" checked={item.swapHands} onChange={e => { const v = e.target.checked; onChange(d => { d.swapHands = v }) }} className="h-4 w-4 accent-[var(--primary)]" />
        <span>{t("Segurar com a outra mão (dois braços)")}</span>
      </label>
      <label className="flex items-center gap-2" title={t("Pig e Ken: a outra mão também segura o bastão, no ponto “Segunda mão no bastão”")}>
        <input type="checkbox" checked={item.grip2On} onChange={e => { const v = e.target.checked; onChange(d => { d.grip2On = v; if (v && !d.grip2X && !d.grip2Y) { d.grip2X = d.gripX + 20; d.grip2Y = d.gripY } }) }} className="h-4 w-4 accent-[var(--primary)]" />
        <span>{t("Segunda mão no bastão (dois braços)")}</span>
      </label>
    </div>
  )
}
