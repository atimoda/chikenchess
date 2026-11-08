"use client"

// The online Pátio on screen: sends this browser's chickens to the game server 20 times a second (in world units,
// so every screen agrees whatever its camera) and draws the other browsers' chickens, each with its look and a
// name tag in its browser's color (with the chicken's number when that browser has more than one).
import { useEffect, useRef, useSyncExternalStore } from "react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import type { ChickenLook } from "@/lib/chicken/look-art"
import { PLAYER_COLORS } from "@/lib/chicken/lobby"
import { stateByte, stateName } from "@/lib/chicken/net-protocol"
import { getNetState, remoteChicken, sendOwnChickens, subscribeNet, type NetPlayer } from "@/lib/chicken/online-room"
import { liveCamera } from "@/lib/pigchicken/live-camera"
import { cancelGameFrame, requestGameFrame } from "@/lib/game-frame"
import { ITEM_SVG } from "@/lib/pigchicken/art"

// the item in hand travels as one byte: its place in this list (0: empty hands)
const ITEM_KEYS = Object.keys(ITEM_SVG).sort()
const itemByte = (key: string | null) => (key ? ITEM_KEYS.indexOf(key) + 1 : 0)
const itemKey = (byte: number) => (byte > 0 ? ITEM_KEYS[byte - 1] ?? null : null)

const SEND_MS = 50
// the name tag sits this far above her feet (rig units, like the chat bubble)
const TAG_UP = 236

export const netColor = (index: number) => PLAYER_COLORS[index % PLAYER_COLORS.length]
export const useNet = () => useSyncExternalStore(subscribeNet, getNetState, getNetState)

type Remote = { engine: ChickenEngine; wrap: HTMLDivElement; tag: HTMLDivElement; pid: number; slot: number; seen: boolean; item: number; face: number }

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
        return { slot, x: s.x + liveCamera.x, y: s.y - liveCamera.y, vx: s.vx, vy: s.vy, face: s.face, state: stateByte(s.networkAnimation ?? s.state), item: itemByte(eng.getHeldItem()) }
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
        const entry: Remote = { engine, wrap, tag, pid: p.pid, slot, seen: false, item: 0, face: 1 }
        engine.setRemote(() => {
          const c = remoteChicken(entry.pid, entry.slot)
          if (!c) return null
          if (!entry.seen) { entry.seen = true; wrap.style.visibility = "visible"; tag.style.visibility = "visible" }
          // the item in her hand, pointing the way she faces
          if (c.item !== entry.item || (c.item && c.face !== entry.face)) {
            entry.item = c.item; entry.face = c.face
            const key = itemKey(c.item), svg = key ? ITEM_SVG[key as keyof typeof ITEM_SVG] : undefined
            engine.setHeld(key && svg ? { svg, itemKey: key, angle: c.face < 0 ? 180 : 0, kick: 0 } : null)
          }
          return { x: c.x - liveCamera.x, y: c.y + liveCamera.y, vx: c.vx, vy: c.vy, face: c.face, state: stateName(c.state) }
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
        const s = r.engine.getMotionState()
        r.tag.style.transform = `translate(${Math.round(s.x - r.tag.offsetWidth / 2)}px, ${Math.round(s.y - TAG_UP * s.scale)}px)`
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
