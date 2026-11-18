"use client"

// The "Zonas sonoras" layer (the header's eye, or the editor palette's button): each scene's own zone in a band right
// under the main ground (its top against the ground's line), stepped on by slams (zone-slam.ts: falling onto the
// ground holding Chocar moves the tag under the player to its next value, for whoever may edit the Pátio), each Zona sonora painted with its colour, the surfaces that rebate notes outlined in gold and the fixed
// lanes' notes, all over the world and following the camera. The zones' labels are their tags (zone-tags.tsx):
// editable in the editor, only shown otherwise. Outside the editor the zones show as they play now (with the changes
// their walls made and their life). In the editor the limits are dragged: the sides of each Zona sonora and the
// line between two scenes' zones.
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { onZoneSlam, sceneAtX, tagUnder, type TagSpan, type ZoneTagKey, nextZoneTag } from "@/lib/pigchicken/zone-slam"
import { elementBounds, type LayoutElement } from "@/lib/pigchicken/layout"
import { followCamera, liveCamera } from "@/lib/pigchicken/live-camera"
import { cn } from "@/lib/utils"
import { SCENE_W, WORLD_GROUND_Y, templeScene, worldScenes } from "@/lib/pigchicken/world"
import { zoneLabel } from "@/lib/pigchicken/music"
import { TEMPLE_IDLE } from "@/lib/pigchicken/temple-music"
import { sceneEdgeList, sceneZoneParams, type SceneEdges, type SceneZones, type SoundZoneParams } from "@/lib/pigchicken/sound-zones"
import { zoneLiveStore } from "@/lib/pigchicken/zone-life"
import { mineStore } from "@/lib/pigchicken/mine-grid-store"
import { mineZoneBoxes } from "@/lib/pigchicken/mine-zones"
import { LanesArt } from "./sound-zone-art"
import { ZoneTags } from "./zone-tags"

const noop = () => {}
// how far up the line between two scenes' zones is drawn (over the tallest ceiling a Pátio may have)
const LIMIT_H = 9000

type Rect = { x: number; y: number; w: number; h: number }
type Side = "l" | "r" | "t" | "b"
export type ZoneResize = { el: LayoutElement; rect: Rect }
const OPPOSITE: Record<Side, Side> = { l: "r", r: "l", t: "b", b: "t" }
// the smallest a zone gets when its limit is dragged
const ZONE_MIN = 40
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// A limit of a zone in the editor: the resize cursor over it, and dragging it reports where the pointer is in the
// world (x for an upright limit, y for a flat one). One undo step per drag. The cursor is set inline: the Pátio's
// own rule gives every [data-chicken-ignore] the plain one.
function LimitHandle({ axis, origin, title, className, style, onStart, onMove }: {
  axis: "x" | "y"; origin: React.RefObject<HTMLDivElement | null>; title: string; className?: string; style?: React.CSSProperties
  onStart?: () => void; onMove: (at: number, gesture: string) => void
}) {
  const drag = useRef<{ pointer: number; gesture: string } | null>(null)
  return (
    <div data-chicken-ignore role="separator" aria-orientation={axis === "x" ? "vertical" : "horizontal"} title={title} aria-label={title}
      className={cn("pointer-events-auto absolute touch-none hover:bg-white/50", className)} style={{ ...style, cursor: axis === "x" ? "ew-resize" : "ns-resize" }}
      onPointerDown={e => {
        if (e.button !== 0) return
        e.preventDefault(); e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { pointer: e.pointerId, gesture: `limit:${e.pointerId}:${Math.round(e.timeStamp)}` }
        onStart?.()
      }}
      onPointerMove={e => {
        const d = drag.current, r = origin.current?.getBoundingClientRect()
        // the layer's origin is the world's, moved and zoomed by the camera
        if (d && d.pointer === e.pointerId && r) onMove(axis === "x" ? (e.clientX - r.left) / liveCamera.zoom : (e.clientY - r.top) / liveCamera.zoom, d.gesture)
      }}
      onPointerUp={e => { if (drag.current?.pointer === e.pointerId) drag.current = null }}
      onPointerCancel={() => { drag.current = null }} />
  )
}

// The four limits of a Zona sonora of the map. A zone that shares the dragged limit (its opposite side on the same
// line, side by side with this one) moves with it, so the limit between two zones stays one.
function ZoneLimits({ el, zones, origin, onResize }: { el: LayoutElement; zones: LayoutElement[]; origin: React.RefObject<HTMLDivElement | null>; onResize: (changes: ZoneResize[], step: string) => void }) {
  const start = useRef<{ side: Side; own: Rect; linked: ZoneResize[] } | null>(null)
  const rectOf = (e: LayoutElement): Rect => ({ x: e.x, y: e.y, w: e.w, h: e.h })
  const edgeOf = (r: Rect, side: Side) => (side === "l" ? r.x : side === "r" ? r.x + r.w : side === "t" ? r.y : r.y + r.h)
  const begin = (side: Side) => () => {
    const own = rectOf(el), upright = side === "l" || side === "r"
    const linked = zones.filter(z => z.id !== el.id && !z.locked && Math.abs(edgeOf(rectOf(z), OPPOSITE[side]) - edgeOf(own, side)) <= 2
      && (upright ? z.y < own.y + own.h && z.y + z.h > own.y : z.x < own.x + own.w && z.x + z.w > own.x)).map(z => ({ el: z, rect: rectOf(z) }))
    start.current = { side, own, linked }
  }
  const move = (at: number, gesture: string) => {
    const s = start.current
    if (!s) return
    const first = s.side === "l" || s.side === "t" // the side where the box starts
    const far = (r: Rect, side: Side) => edgeOf(r, OPPOSITE[side])
    // neither this zone nor a neighbour gets smaller than the minimum
    const own = far(s.own, s.side) + (first ? -ZONE_MIN : ZONE_MIN)
    const others = s.linked.map(k => far(k.rect, OPPOSITE[s.side]) + (first ? ZONE_MIN : -ZONE_MIN))
    const e = Math.round(first ? clamp(at, Math.max(-Infinity, ...others), own) : clamp(at, own, Math.min(Infinity, ...others)))
    const to = (r: Rect, side: Side): Rect => side === "l" ? { ...r, x: e, w: r.x + r.w - e } : side === "r" ? { ...r, w: e - r.x } : side === "t" ? { ...r, y: e, h: r.y + r.h - e } : { ...r, h: e - r.y }
    onResize([{ el, rect: to(s.own, s.side) }, ...s.linked.map(k => ({ el: k.el, rect: to(k.rect, OPPOSITE[s.side]) }))], gesture)
  }
  const side = (id: Side, style: React.CSSProperties) => <LimitHandle key={id} axis={id === "l" || id === "r" ? "x" : "y"} origin={origin} title="Arrastar o limite da zona" style={style} onStart={begin(id)} onMove={move} />
  return <>
    {side("l", { left: -6, top: 0, bottom: 0, width: 10 })}
    {side("r", { right: -6, top: 0, bottom: 0, width: 10 })}
    {side("t", { top: -6, left: 0, right: 0, height: 10 })}
    {side("b", { bottom: -6, left: 0, right: 0, height: 10 })}
  </>
}

// the Grade de blocos' blocks that play a rhythm ("Blocos são zonas sonoras"), outlined with its name; the silent
// ones are not drawn
const gridGeo = () => mineStore.round?.grid.geo ?? null
const gridZones = () => mineStore.params?.zones ?? null
function BlockZones({ screens, sceneZones, sceneEdges }: { screens: number; sceneZones?: SceneZones; sceneEdges?: SceneEdges }) {
  const geo = useSyncExternalStore(mineStore.subscribe, gridGeo, gridGeo), zones = useSyncExternalStore(mineStore.subscribe, gridZones, gridZones)
  const boxes = useMemo(() => (geo && zones ? mineZoneBoxes(geo, zones, { zones: sceneZones, edges: sceneEdges, screens }).filter(b => b.beat !== "none") : []), [geo, zones, sceneZones, sceneEdges, screens])
  return <>{boxes.map(b => (
    <div key={`${b.c},${b.r}`} className="absolute" style={{ left: b.x + 4, top: b.y + 4, width: b.w - 8, height: b.h - 8, border: `2px dashed ${b.zone.color}`, background: `${b.zone.color}18` }}>
      <span className="absolute left-2 top-1 whitespace-nowrap font-mono text-[13px] [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]" style={{ color: b.zone.color }}>{b.zone.name}</span>
    </div>
  ))}</>
}

// sceneMusic: false when the Pátio turned the scenes' own zones off (their strips are not shown)
// onSlam: a slam stepped on a scene's tag (only for whoever may edit the Pátio: without it slams change nothing)
export function MusicZonesLayer({ elements, screens, sceneZones, sceneEdges, sceneMusic = true, editable, onZone = noop, onScene = noop, onOpenZone = noop, onOpenScene = noop, onSceneEdge = noop, onResizeZones = noop, onSlam, opacity = 1 }: {
  elements: LayoutElement[]; screens: number; sceneZones?: SceneZones; sceneEdges?: SceneEdges; sceneMusic?: boolean; editable: boolean
  // a dragged limit: between scene - 1 and scene, at world x; or the zones' new boxes
  onSceneEdge?: (scene: number, x: number, step: string) => void; onResizeZones?: (changes: ZoneResize[], step: string) => void
  onZone?: (el: LayoutElement, zone: SoundZoneParams, step?: string) => void
  onScene?: (scene: number, zone: SoundZoneParams, step?: string) => void
  onOpenZone?: (el: LayoutElement) => void; onOpenScene?: (scene: number) => void
  onSlam?: (scene: number, zone: SoundZoneParams, step: string) => void
  // how strongly the layer shows (the layers menu's Zonas slider)
  opacity?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => (ref.current ? followCamera(ref.current) : undefined), [])
  // the zones' life and changes, live
  useSyncExternalStore(zoneLiveStore.subscribe, zoneLiveStore.version, zoneLiveStore.version)
  const scenes = worldScenes(screens), temple = templeScene(screens)
  // where each scene's zone starts and ends (a Pátio may move the limits between them)
  const xs = sceneEdgeList(sceneEdges, screens)
  const zoneEls = elements.filter(e => e.kind === "zone" && e.params.zone)
  // a slam at world x: the scene's strip under it, the tag under it measured where it is drawn, and its next value
  const slam = useRef({ onSlam, sceneZones, xs, temple, sceneMusic })
  useEffect(() => { slam.current = { onSlam, sceneZones, xs, temple, sceneMusic } })
  useEffect(() => onZoneSlam(x => {
    const { onSlam: save, sceneZones: zones, xs: edges, temple: t, sceneMusic: on } = slam.current
    const s = sceneAtX(edges, x), origin = ref.current
    if (!save || !on || s < 0 || s === t || !origin) return
    const o = origin.getBoundingClientRect(), z = liveCamera.zoom || 1
    const tags: TagSpan[] = Array.from(origin.querySelectorAll<HTMLElement>(`[data-scene-strip="${s}"] [data-zone-tag]`), el => {
      const r = el.getBoundingClientRect()
      return { key: el.dataset.zoneTag as ZoneTagKey, l: (r.left - o.left) / z, r: (r.right - o.left) / z, top: (r.top - o.top) / z }
    })
    const tag = tagUnder(tags, x)
    const next = tag && nextZoneTag(sceneZoneParams(zones, s), tag.key)
    if (next) save(s, next, `slam:${s}:${tag.key}:${Math.round(performance.now())}`)
  }), [])
  return (
    <div aria-label="Zonas" className="pointer-events-none fixed inset-0 z-[204] overflow-hidden" style={{ opacity }}>
      <div ref={ref} className="absolute left-0 top-0">
        {/* each scene's own zone, stuck to the ground: it plays in the whole column over its floor, up to the ceiling */}
        {Array.from({ length: scenes }, (_, s) => {
          if (s === temple) {
            const z = TEMPLE_IDLE
            return (
              <div key={s} className="absolute" style={{ left: s * SCENE_W, top: WORLD_GROUND_Y, width: SCENE_W, height: 30, background: `${z.color}26`, borderTop: `2px solid ${z.color}` }}>
                <span className="absolute left-3 top-1 whitespace-nowrap font-mono text-[13px] [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]" style={{ color: z.color }}>Cena {s + 1} · {zoneLabel(z)}</span>
              </div>
            )
          }
          if (!sceneMusic) return null
          const z = sceneZoneParams(sceneZones, s)
          return (
            <div key={s} className="absolute" style={{ left: xs[s], top: WORLD_GROUND_Y, width: xs[s + 1] - xs[s], height: 32, background: `${z.color}26`, borderTop: `2px solid ${z.color}` }}>
              <div data-scene-strip={s} className="absolute left-2 top-0.5 flex max-w-[calc(100%-16px)] flex-wrap gap-1">
                <ZoneTags zone={z} scene sceneLabel={`Cena ${s + 1}`} editable={editable} onChange={(zone, step) => onScene(s, zone, step && `${step}:cena${s}`)} onOpen={() => onOpenScene(s)} />
              </div>
            </div>
          )
        })}
        <BlockZones screens={screens} sceneZones={sceneZones} sceneEdges={sceneEdges} />
        {/* the limit between two scenes' zones, from the ground to over the tallest ceiling */}
        {editable && sceneMusic && Array.from({ length: Math.max(0, screens - 1) }, (_, i) => i + 1).map(s => (
          <div key={`limite${s}`} className="absolute border-l border-dashed border-white/40" style={{ left: xs[s], top: WORLD_GROUND_Y - LIMIT_H, height: LIMIT_H + 32, width: 0 }}>
            <LimitHandle axis="x" origin={ref} title={`Arrastar o limite entre as zonas das cenas ${s} e ${s + 1}`} style={{ left: -6, top: 0, bottom: 0, width: 12 }} onMove={(x, step) => onSceneEdge(s, x, step)} />
          </div>
        ))}
        {elements.map(el => {
          if (el.kind === "lanes" && el.params.lanes) {
            return <div key={el.id} className="absolute" style={{ left: el.x, top: el.y, width: el.w, height: el.h, outline: "1px dashed rgba(255,255,255,0.5)" }}><LanesArt lanes={el.params.lanes} w={el.w} h={el.h} editing labels /></div>
          }
          if (el.kind === "zone" && el.params.zone) {
            const saved = el.params.zone
            const live = zoneLiveStore.get(el.id)
            // viewing: the zone as it plays now; editing: as it is saved
            const z = !editable && live?.src === saved ? live.zone : saved
            return (
              <div key={el.id} className="absolute" style={{ left: el.x, top: el.y, width: el.w, height: el.h, background: `${z.color}24`, border: `2px ${z.music ? "solid" : "dashed"} ${z.color}`, boxShadow: z.life ? `inset 0 0 0 4px ${z.color}55` : undefined }}>
                <div className="absolute left-2 top-2 flex max-w-[calc(100%-16px)] flex-wrap gap-1">
                  <ZoneTags zone={z} editable={editable} live={live && live.src === saved ? { hp: live.hp } : undefined}
                    onChange={(zone, step) => onZone(el, zone, step && `${step}:${el.id}`)} onOpen={() => onOpenZone(el)} />
                </div>
                {editable && !el.locked && <ZoneLimits el={el} zones={zoneEls} origin={ref} onResize={onResizeZones} />}
              </div>
            )
          }
          if (!el.rebate) return null
          const b = elementBounds(el)
          return (
            <div key={el.id} className="absolute rounded-sm" style={{ left: b.x - 3, top: b.y - 3, width: b.w + 6, height: b.h + 6, outline: "3px solid #ffd166", boxShadow: "0 0 12px #ffd166" }}>
              <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-black/75 px-1.5 font-mono text-[11px] text-[#ffd166]">♪ rebate · {el.rebate.mode === "chain" ? "cadeia própria" : el.rebate.mode === "delegate" ? "delega ao taco" : "não muda"}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
