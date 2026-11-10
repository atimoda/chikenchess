"use client"

// The online Pátio on screen: sends this browser's chickens to the game server 20 times a second (in world units,
// so every screen agrees whatever its camera) and draws the other browsers' chickens, each with its look and a
// name tag in its browser's color (with the chicken's number when that browser has more than one). Where each one
// aims (the item in her hand and her eyes) and the surface she clings to travel as one byte each.
import { useEffect, useRef, useSyncExternalStore } from "react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import type { ChickenLook } from "@/lib/chicken/look-art"
import { PLAYER_COLORS } from "@/lib/chicken/lobby"
import { angleByte, byteAngle, stateByte, stateName } from "@/lib/chicken/net-protocol"
import { getNetState, remoteChicken, sendOwnChickens, subscribeNet, type NetPlayer } from "@/lib/chicken/online-room"
import { liveCamera } from "@/lib/pigchicken/live-camera"
import { cancelGameFrame, requestGameFrame } from "@/lib/game-frame"
import { ITEM_SVG } from "@/lib/pigchicken/art"
import { DEFAULT_ITEMS, itemRig, type ItemId } from "@/lib/pigchicken/items"
import { stageWidth } from "@/lib/stage-size"

// the item in hand travels as one byte: its place in this list (0: empty hands)
const ITEM_KEYS = Object.keys(ITEM_SVG).sort()
const itemByte = (key: string | null) => (key ? ITEM_KEYS.indexOf(key) + 1 : 0)
const itemKey = (byte: number) => (byte > 0 ? ITEM_KEYS[byte - 1] ?? null : null)

const SEND_MS = 50
// the name tag sits this far above her feet (rig units, like the chat bubble)
const TAG_UP = 236

export const netColor = (index: number) => PLAYER_COLORS[index % PLAYER_COLORS.length]
export const useNet = () => useSyncExternalStore(subscribeNet, getNetState, getNetState)

// aim: the angle she is drawn pointing at, eased toward the latest one (the packets come 20 times a second)
type Remote = { engine: ChickenEngine; wrap: HTMLDivElement; tag: HTMLDivElement; pid: number; slot: number; seen: boolean; item: number; aim: number | null; at: number }
// the shortest turn from a to b
const turnTo = (a: number, b: number) => ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI

// own: this browser's chickens in order (Player 1 first); onSpeakers: the first chicken of each other browser,
// for the chat bubbles (by chat player id)
export function OnlineChickens({ own, groundHeight, onSpeakers }: { own: () => ChickenEngine[]; groundHeight: number; onSpeakers: (engines: Record<string, ChickenEngine>) => void }) {
  const net = useNet()
  const hostRef = useRef<HTMLDivElement>(null)
  const remotes = useRef(new Map<string, Remote>())
  const ownRef = useRef(own)
  ownRef.current = own
  const speakersRef = useRef(onSpeakers)
  speakersRef.current = onSpeakers
  const online = net.status === "online"

  // ---------- this browser's chickens, up ----------
  useEffect(() => {
    if (!online) return
    const timer = window.setInterval(() => {
      const list = ownRef.current().slice(0, 4).map((eng, slot) => {
        const s = eng.getMotionState()
        const clinging = s.state === "cling"
        return {
          slot, x: s.x + liveCamera.x, y: s.y - liveCamera.y, vx: s.vx, vy: s.vy, face: s.face, state: stateByte(s.networkAnimation ?? s.state), item: itemByte(eng.getHeldItem()),
          aim: angleByte(eng.getAim()), rot: clinging ? angleByte(s.angle) : 0,
        }
      })
      sendOwnChickens(list)
    }, SEND_MS)
    return () => window.clearInterval(timer)
  }, [online])

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
        const entry: Remote = { engine, wrap, tag, pid: p.pid, slot, seen: false, item: 0, aim: null, at: performance.now() }
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
            engine.setHeld(key && svg ? { svg, itemKey: key, angle, kick: 0, rig: key in DEFAULT_ITEMS ? itemRig(DEFAULT_ITEMS[key as ItemId]) : null } : null)
          }
          engine.setGame({ lookAngle: entry.aim })
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

  // the name tags follow their chickens
  useEffect(() => {
    let raf = 0
    const frame = () => {
      raf = requestGameFrame(frame)
      remotes.current.forEach(r => {
        if (!r.seen) return
        r.engine.setCameraZoom(liveCamera.zoom)
        const s = r.engine.getMotionState()
        const z = liveCamera.zoom, cx = stageWidth() / 2, cy = window.innerHeight / 2
        const x = cx + (s.x - cx) * z - r.tag.offsetWidth * z / 2
        const y = cy + (s.y - TAG_UP * s.scale - cy) * z
        r.tag.style.transformOrigin = "0 0"
        r.tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${z})`
      })
    }
    frame()
    return () => cancelGameFrame(raf)
  }, [])

  // all of them go when the page closes or online stops
  useEffect(() => {
    const map = remotes.current
    return () => { map.forEach(r => { r.engine.destroy(); r.wrap.remove(); r.tag.remove() }); map.clear(); speakersRef.current({}) }
  }, [])

  return <div ref={hostRef} className="pointer-events-none fixed inset-0 z-[199]" />
}
