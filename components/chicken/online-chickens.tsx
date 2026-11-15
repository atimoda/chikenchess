"use client"

// The online Pátio on screen: sends this browser's chickens to the game server 20 times a second (in world units,
// so every screen agrees whatever its camera) and draws the other browsers' chickens, each with its look and a
// name tag in its browser's color (with the chicken's number when that browser has more than one). Where each one
// aims (the item in her hand and her eyes) and the surface she clings to travel as one byte each. The chicks that
// follow this browser's first chicken go up too (10 times a second while they move), and the other browsers' chicks
// are drawn here with the look they were hatched with; `netChicks` lists them for the Parquinho, whose Passaguá asks
// their browser for them (lib/chicken/net-chicks.ts).
import { useEffect, useRef, useSyncExternalStore } from "react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import type { ChickenLook } from "@/lib/chicken/look-art"
import { PLAYER_COLORS } from "@/lib/chicken/lobby"
import { angleByte, byteAngle, stateByte, stateName } from "@/lib/chicken/net-protocol"
import { PORTAL_TRANSITION_MS } from "@/lib/chicken/portal"
import { getNetState, hideRemoteChick, netCan, remoteChicken, remoteChicks, sendNetChicks, sendOwnChickens, subscribeNet, type NetPlayer } from "@/lib/chicken/online-room"
import { CHICK_STYLES, chickArt } from "@/lib/chicken/chick-art"
import { chickAt, chickNumber, chickStyleOf, exportChicks } from "@/lib/chicken/net-chicks"
import { netIdFor } from "@/lib/pigchicken/net-world"
import { TAKE_WAIT } from "@/lib/pigchicken/net-souls"
import { liveCamera } from "@/lib/pigchicken/live-camera"
import { cancelGameFrame, requestGameFrame } from "@/lib/game-frame"
import { ITEM_SVG } from "@/lib/pigchicken/art"
import { DEFAULT_ITEMS, isStaff, itemRig, type ItemId } from "@/lib/pigchicken/items"
import { aimElevation, staffPose } from "@/lib/pigchicken/staff-pose"
import { stageWidth } from "@/lib/stage-size"

// the item in hand travels as one byte: its place in this list (0: empty hands)
const ITEM_KEYS = Object.keys(ITEM_SVG).sort()
const itemByte = (key: string | null) => (key ? ITEM_KEYS.indexOf(key) + 1 : 0)
const itemKey = (byte: number) => (byte > 0 ? ITEM_KEYS[byte - 1] ?? null : null)

const SEND_MS = 50
// the chicks: this often while they move, and this often anyway (whoever just joined learns of them)
const CHICKS_MS = 100, CHICKS_KEEP_MS = 1000
// the name tag sits this far above her feet (rig units, like the chat bubble)
const TAG_UP = 236

export const netColor = (index: number) => PLAYER_COLORS[index % PLAYER_COLORS.length]
export const useNet = () => useSyncExternalStore(subscribeNet, getNetState, getNetState)

// aim: the angle she is drawn pointing at, eased toward the latest one (the packets come 20 times a second)
// portal: the portal animation she is in on this screen (as her browser says), and the camera it was last drawn with
type Remote = { engine: ChickenEngine; wrap: HTMLDivElement; tag: HTMLDivElement; pid: number; slot: number; seen: boolean; item: number; aim: number | null; at: number; portal: "portal" | "portalArrival" | null; camX: number; camY: number }
// another browser's chick drawn here (id: its id in the lobby; hidden: asked of its browser, out of sight meanwhile)
export type NetChickMirror = { engine: ChickenEngine; wrap: HTMLDivElement; pid: number; id: number; hidden: boolean; hide: () => void }
// the shortest turn from a to b
const turnTo = (a: number, b: number) => ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI

// own: this browser's chickens in order (Player 1 first); onSpeakers: the first chicken of each other browser,
// for the chat bubbles (by chat player id); chicks: this browser's chicks; netChicks: where the other browsers'
// chicks are kept (by pid and number)
export function OnlineChickens({ own, groundHeight, onSpeakers, chicks, netChicks }: { own: () => ChickenEngine[]; groundHeight: number; onSpeakers: (engines: Record<string, ChickenEngine>) => void; chicks?: React.RefObject<Map<string, ChickenEngine>>; netChicks?: React.RefObject<Map<string, NetChickMirror>> }) {
  const net = useNet()
  const hostRef = useRef<HTMLDivElement>(null)
  const remotes = useRef(new Map<string, Remote>())
  const ownRef = useRef(own)
  ownRef.current = own
  const speakersRef = useRef(onSpeakers)
  speakersRef.current = onSpeakers
  const ownMirrors = useRef(new Map<string, NetChickMirror>())
  const mirrors = netChicks ?? ownMirrors
  const groundRef = useRef(groundHeight)
  groundRef.current = groundHeight
  const online = net.status === "online"

  // ---------- this browser's chickens, up ----------
  useEffect(() => {
    if (!online) return
    const timer = window.setInterval(() => {
      const list = ownRef.current().slice(0, 4).map((eng, slot) => {
        const s = eng.getMotionState()
        const clinging = s.state === "cling"
        // going into a portal, she is sent where the portal is (her feet, were she standing in its centre): the others
        // draw her being sucked into it
        const into = s.state === "portal" ? eng.getPortalTransit() : null
        return {
          slot, x: (into ? into.x : s.x) + liveCamera.x, y: (into ? into.y + 80 * s.scale : s.y) - liveCamera.y, vx: s.vx, vy: s.vy, face: s.face, state: stateByte(s.networkAnimation ?? s.state), item: itemByte(eng.getHeldItem()),
          aim: angleByte(eng.getAim()), rot: clinging ? angleByte(s.angle) : 0,
        }
      })
      sendOwnChickens(list)
    }, SEND_MS)
    return () => window.clearInterval(timer)
  }, [online])

  // ---------- this browser's chicks, up ----------
  useEffect(() => {
    if (!online || !chicks) return
    let told = "", toldAt = 0
    const timer = window.setInterval(() => {
      if (!netCan("chicks")) return
      const list = exportChicks([...chicks.current.values()].map(eng => {
        const s = eng.getMotionState()
        return { n: chickNumber(eng), x: s.x + liveCamera.x, y: s.y - liveCamera.y, vx: s.vx, vy: s.vy, face: s.face, state: stateByte(s.networkAnimation ?? s.state), style: chickStyleOf(eng) }
      }))
      // standing still: now and then is enough; none left: one empty list, then quiet
      const key = JSON.stringify(list), now = performance.now()
      if (key === told && (!list.length || now - toldAt < CHICKS_KEEP_MS)) return
      told = key; toldAt = now
      sendNetChicks(list)
    }, CHICKS_MS)
    return () => window.clearInterval(timer)
  }, [online, chicks])

  // ---------- the others' chickens, down ----------
  const others: NetPlayer[] = online && net.info ? net.info.players.filter(p => p.pid !== net.myPid) : []
  const key = others.map(p => `${p.pid}:${p.chickens}:${p.color}:${p.name}:${JSON.stringify(p.looks)}`).join("|")
  useEffect(() => {
    const host = hostRef.current, map = remotes.current
    if (!host) return
    const wanted = new Map<string, { p: NetPlayer; slot: number }>()
    others.forEach(p => { for (let slot = 0; slot < p.chickens; slot++) wanted.set(`${p.pid}:${slot}`, { p, slot }) })
    map.forEach((r, k) => { if (!wanted.has(k)) { r.engine.destroy(); r.wrap.remove(); r.tag.remove(); map.delete(k) } })
    wanted.forEach(({ p, slot }, k) => {
      let r = map.get(k)
      if (!r) {
        const wrap = document.createElement("div")
        wrap.style.visibility = "hidden"
        host.appendChild(wrap)
        const engine = createChickenEngine(wrap, { groundHeight, fixedScale: true })
        engine.setGame({ gameMode: true })
        const tag = document.createElement("div")
        tag.className = "pointer-events-none fixed left-0 top-0 z-[203] whitespace-nowrap rounded-full border-2 bg-black/60 px-2 py-0.5 font-mono text-[11px] font-bold text-white"
        host.appendChild(tag)
        const entry: Remote = { engine, wrap, tag, pid: p.pid, slot, seen: false, item: 0, aim: null, at: performance.now(), portal: null, camX: 0, camY: 0 }
        engine.setRemote(() => {
          const c = remoteChicken(entry.pid, entry.slot)
          if (!c) return null
          if (!entry.seen) { entry.seen = true; wrap.style.visibility = "visible"; tag.style.visibility = "visible" }
          // where she aims: the item in her hand turns with it (without one, the way she faces) and so do her eyes
          const now = performance.now(), dt = Math.min(0.1, (now - entry.at) / 1000)
          entry.at = now
          const target = byteAngle(c.aim)
          entry.aim = target === null ? null : entry.aim === null ? target : entry.aim + turnTo(entry.aim, target) * (1 - Math.exp(-dt * 20))
          const angle = entry.aim ?? (c.face < 0 ? Math.PI : 0)
          const key = itemKey(c.item), svg = key ? ITEM_SVG[key as keyof typeof ITEM_SVG] : undefined
          if (c.item !== entry.item || key) {
            entry.item = c.item
            const def = key && key in DEFAULT_ITEMS ? DEFAULT_ITEMS[key as ItemId] : null
            // a staff is carried in its own pose on her body (the game's default one), as on the browser that plays her
            const staff = def && isStaff(def) ? staffPose(def, 0, aimElevation(angle, c.face)) : null
            engine.setHeld(key && svg ? { svg, itemKey: key, angle, kick: 0, atHand: !!staff, rig: def ? itemRig(def) : null, staff } : null)
          }
          engine.setGame({ lookAngle: entry.aim })
          // in a portal: the same animation as on her browser, into (or out of) the portal's centre on this screen
          const state = stateName(c.state)
          if (state === "portal" || state === "portalArrival") {
            const centre = { x: c.x - liveCamera.x, y: c.y + liveCamera.y - 80 * engine.getMotionState().scale, durationMs: PORTAL_TRANSITION_MS }
            if (entry.portal !== state) {
              entry.portal = state
              if (state === "portal") { engine.setPortalEntry(null); engine.setPortalEntry(centre) } else engine.arriveAtPortal(centre)
            } else {
              // this screen's camera moved meanwhile: she and the portal move with the world
              const dx = entry.camX - liveCamera.x, dy = liveCamera.y - entry.camY
              if (dx || dy) engine.shift(dx, dy)
              if (state === "portal") engine.setPortalEntry(centre)
            }
            entry.camX = liveCamera.x; entry.camY = liveCamera.y
            return null
          }
          if (entry.portal) { if (entry.portal === "portal") engine.setPortalEntry(null); entry.portal = null }
          return { x: c.x - liveCamera.x, y: c.y + liveCamera.y, vx: c.vx, vy: c.vy, face: c.face, state: stateName(c.state), cling: byteAngle(c.rot) }
        })
        tag.style.visibility = "hidden"
        r = entry
        map.set(k, r)
      }
      r.engine.setLook((p.looks[slot] as ChickenLook | null) ?? null)
      r.tag.textContent = p.chickens > 1 ? `${p.name} ${slot + 1}` : p.name
      r.tag.style.borderColor = netColor(p.color)
    })
    const speakers: Record<string, ChickenEngine> = {}
    map.forEach(r => { if (r.slot === 0) speakers[`net:${r.pid}`] = r.engine })
    speakersRef.current(speakers)
  }, [key, groundHeight])

  // the name tags follow their chickens, and the others' chicks come and go with what their browsers say
  useEffect(() => {
    let raf = 0
    const frame = () => {
      raf = requestGameFrame(frame)
      const host = hostRef.current, store = remoteChicks(), map = mirrors.current, now = performance.now()
      map.forEach((m, key) => { if (!store.has(key)) { m.engine.destroy(); m.wrap.remove(); map.delete(key) } })
      if (host) store.forEach((c, key) => {
        let m = map.get(key)
        if (!m) {
          const wrap = document.createElement("div")
          host.appendChild(wrap)
          const engine = createChickenEngine(wrap, { groundHeight: groundRef.current, fixedScale: true, species: "chick", art: chickArt(CHICK_STYLES[c.style] ?? CHICK_STYLES[0]) })
          engine.setGame({ gameMode: true })
          engine.setRemote(() => {
            const at = remoteChicks().get(key)
            if (!at) return null
            const p = chickAt(at, performance.now())
            return { x: p.x - liveCamera.x, y: p.y + liveCamera.y, vx: at.vx, vy: at.vy, face: at.face, state: stateName(at.state) }
          })
          const entry: NetChickMirror = { engine, wrap, pid: c.pid, id: netIdFor(c.pid, c.n), hidden: false, hide: () => { entry.hidden = true; wrap.style.visibility = "hidden"; hideRemoteChick(key, TAKE_WAIT) } }
          m = entry
          map.set(key, m)
        }
        const hidden = c.hidden > now
        if (hidden !== m.hidden) { m.hidden = hidden; m.wrap.style.visibility = hidden ? "hidden" : "visible" }
        m.engine.setCameraZoom(liveCamera.zoom)
      })
      remotes.current.forEach(r => {
        if (!r.seen) return
        r.engine.setCameraZoom(liveCamera.zoom)
        const s = r.engine.getMotionState()
        const z = liveCamera.zoom, cx = stageWidth() / 2, cy = window.innerHeight / 2
        const x = cx + (s.x - cx) * z - r.tag.offsetWidth * z / 2
        const y = cy + (s.y - TAG_UP * s.scale - cy) * z
        // sucked into a portal, her name goes with her
        r.tag.style.opacity = r.portal === "portal" ? "0" : ""
        r.tag.style.transformOrigin = "0 0"
        r.tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${z})`
      })
    }
    frame()
    return () => cancelGameFrame(raf)
  }, [mirrors])

  // all of them go when the page closes or online stops
  useEffect(() => {
    const map = remotes.current, small = mirrors.current
    return () => {
      map.forEach(r => { r.engine.destroy(); r.wrap.remove(); r.tag.remove() }); map.clear(); speakersRef.current({})
      small.forEach(m => { m.engine.destroy(); m.wrap.remove() }); small.clear()
    }
  }, [mirrors])

  return <div ref={hostRef} className="pointer-events-none fixed inset-0 z-[199]" />
}
