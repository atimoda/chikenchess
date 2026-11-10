"use client"

// The chicks (pintinhos) that follow the player's chicken (the "mother"): bots of the 'chick' species, each with its
// own engine (every movement mechanic, chick tuning) driven by the follow brain (lib/chicken/chick-follow.ts)
// instead of input. Mounted by ChickenLayer, so they exist wherever she does: on the globe (the first screen) and in
// every Pátio. CHICK_START chicks in random realistic styles fall from the sky one after another right after her
// (CHICK_DROP_DELAY, then CHICK_DROP_GAP apart); a new spawnKey (another Pátio) brings a new random flock, and null
// waits (the Pátio still loading). In the Pátio, the Parquinho moves them with its camera and catches them with the
// Passaguá (through `engines`, like the local players').
import { useEffect, useRef } from "react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import { createFollowBrain, followStep, type FollowActions, type FollowBrain } from "@/lib/chicken/chick-follow"
import { chickArt, randomChickStyle } from "@/lib/chicken/chick-art"
import { requestGameFrame, cancelGameFrame } from "@/lib/game-frame"

export const CHICK_START = 4
export const CHICK_DROP_DELAY = 700, CHICK_DROP_GAP = 260

export function ChickFlock({ lead, groundHeight, engines, count = CHICK_START, fixedScale = false, spawnKey }: {
  lead: ChickenEngine | null
  groundHeight: number
  engines: React.RefObject<Map<string, ChickenEngine>>
  count?: number
  fixedScale?: boolean
  spawnKey?: string | null
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const groundRef = useRef(groundHeight)
  groundRef.current = groundHeight
  useEffect(() => {
    const host = hostRef.current, map = engines.current
    if (!host || !lead || spawnKey === null || count <= 0) return
    const brains = new Map<string, { brain: FollowBrain; actions: FollowActions }>()
    const timers: number[] = []
    const tag = `${spawnKey ?? "globe"}-${Date.now()}`
    for (let i = 0; i < count; i++) {
      timers.push(window.setTimeout(() => {
        const id = `chick-${tag}-${i}`
        const eng = createChickenEngine(host, { groundHeight: groundRef.current, fixedScale, species: "chick", art: chickArt(randomChickStyle("realista")) })
        eng.setGame({ gameMode: true })
        eng.setDevices([])
        const entry = { brain: createFollowBrain(), actions: {} as FollowActions }
        eng.setBot(() => entry.actions)
        // just behind her, alternating sides, a little scattered
        const at = lead.getMotionState()
        eng.dropAt(at.x + (i % 2 ? -1 : 1) * (50 + 24 * Math.floor(i / 2) + Math.random() * 20))
        map.set(id, eng); brains.set(id, entry)
      }, CHICK_DROP_DELAY + i * CHICK_DROP_GAP))
    }
    let last = performance.now(), raf = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now
      const ls = lead.getMotionState()
      brains.forEach((entry, id) => {
        const eng = map.get(id)
        if (!eng) { brains.delete(id); return } // caught
        const me = eng.getMotionState()
        if (me.held || me.state.startsWith("portal")) { entry.actions = {}; return }
        const r = followStep(entry.brain, me, ls, dt)
        entry.actions = r.actions
        if (r.lost) eng.dropAt(ls.x + (Math.random() * 2 - 1) * 80)
      })
      raf = requestGameFrame(tick)
    }
    raf = requestGameFrame(tick)
    return () => {
      timers.forEach(t => window.clearTimeout(t))
      cancelGameFrame(raf)
      brains.forEach((_, id) => { map.get(id)?.destroy(); map.delete(id) })
    }
  }, [lead, engines, count, fixedScale, spawnKey])
  useEffect(() => { engines.current.forEach(eng => eng.setGroundHeight(groundHeight)) }, [engines, groundHeight])
  return <div ref={hostRef} className="pointer-events-none fixed inset-0 z-[199]" />
}
