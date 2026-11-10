"use client"

// The "Zonas sonoras" layer (the header's eye, or the editor palette's button): each scene's own zone in a band on
// its floor, each Zona sonora painted with its colour, the surfaces that rebate notes outlined in gold and the fixed
// lanes' notes, all over the world and following the camera. The zones' labels are their tags (zone-tags.tsx):
// editable in the editor, only shown otherwise. Outside the editor the zones show as they play now (with the changes
// their walls made and their life).
import { useEffect, useRef, useSyncExternalStore } from "react"
import { elementBounds, type LayoutElement } from "@/lib/pigchicken/layout"
import { followCamera } from "@/lib/pigchicken/live-camera"
import { SCENE_W, WORLD_GROUND_Y, templeScene, worldScenes } from "@/lib/pigchicken/world"
import { zoneLabel } from "@/lib/pigchicken/music"
import { TEMPLE_IDLE } from "@/lib/pigchicken/temple-music"
import { sceneZoneParams, type SceneZones, type SoundZoneParams } from "@/lib/pigchicken/sound-zones"
import { zoneLiveStore } from "@/lib/pigchicken/zone-life"
import { LanesArt } from "./sound-zone-art"
import { ZoneTags } from "./zone-tags"

const noop = () => {}

export function MusicZonesLayer({ elements, screens, sceneZones, editable, onZone = noop, onScene = noop, onOpenZone = noop, onOpenScene = noop, opacity = 1 }: {
  elements: LayoutElement[]; screens: number; sceneZones?: SceneZones; editable: boolean
  onZone?: (el: LayoutElement, zone: SoundZoneParams, step?: string) => void
  onScene?: (scene: number, zone: SoundZoneParams, step?: string) => void
  onOpenZone?: (el: LayoutElement) => void; onOpenScene?: (scene: number) => void
  // how strongly the layer shows (the layers menu's Zonas slider)
  opacity?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => (ref.current ? followCamera(ref.current) : undefined), [])
  // the zones' life and changes, live
  useSyncExternalStore(zoneLiveStore.subscribe, zoneLiveStore.version, zoneLiveStore.version)
  const scenes = worldScenes(screens), temple = templeScene(screens)
  return (
    <div aria-label="Zonas sonoras" className="pointer-events-none fixed inset-0 z-[204] overflow-hidden" style={{ opacity }}>
      <div ref={ref} className="absolute left-0 top-0">
        {/* each scene's own zone: it plays in the whole column of the scene, from the floor to the ceiling */}
        {Array.from({ length: scenes }, (_, s) => {
          if (s === temple) {
            const z = TEMPLE_IDLE
            return (
              <div key={s} className="absolute" style={{ left: s * SCENE_W, top: WORLD_GROUND_Y - 30, width: SCENE_W, height: 30, background: `${z.color}26`, borderTop: `2px solid ${z.color}` }}>
                <span className="absolute left-3 top-1 whitespace-nowrap font-mono text-[13px] [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]" style={{ color: z.color }}>Cena {s + 1} · {zoneLabel(z)}</span>
              </div>
            )
          }
          const z = sceneZoneParams(sceneZones, s)
          return (
            <div key={s} className="absolute" style={{ left: s * SCENE_W, top: WORLD_GROUND_Y - 32, width: SCENE_W, height: 32, background: `${z.color}26`, borderTop: `2px solid ${z.color}` }}>
              <div className="absolute left-2 top-0.5 flex max-w-[calc(100%-16px)] flex-wrap gap-1">
                <ZoneTags zone={z} scene sceneLabel={`Cena ${s + 1}`} editable={editable} onChange={(zone, step) => onScene(s, zone, step && `${step}:cena${s}`)} onOpen={() => onOpenScene(s)} />
              </div>
            </div>
          )
        })}
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
