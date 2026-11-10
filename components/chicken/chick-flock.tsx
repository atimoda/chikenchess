"use client"

// The chicks (pintinhos) that follow the first player's chicken in the Pátio: bots of the 'chick' species, each with
// its own engine (every movement mechanic, chick tuning) driven by the follow brain (lib/chicken/chick-follow.ts)
// instead of input. They start as CHICK_START chicks in random realistic styles, falling in around her; the Parquinho
// moves them with its camera and catches them with the Passaguá (through `engines`, like the local players').
import { useEffect, useRef } from "react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import { createFollowBrain, followStep, type FollowActions, type FollowBrain } from "@/lib/chicken/chick-follow"
import { chickArt, randomChickStyle } from "@/lib/chicken/chick-art"
import { requestGameFrame, cancelGameFrame } from "@/lib/game-frame"

export const CHICK_START = 7

export function ChickFlock({ lead, groundHeight, engines, count = CHICK_START }: {
  lead: ChickenEngine | null
  groundHeight: number
  engines: React.RefObject<Map<string, ChickenEngine>>
  count?: number
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const groundRef = useRef(groundHeight)
  groundRef.current = groundHeight
  useEffect(() => {
    const host = hostRef.current, map = engines.current
    if (!host || !lead) return
    const brains = new Map<string, { brain: FollowBrain; actions: FollowActions }>()
    const at = lead.getMotionState()
    for (let i = 0; i < count; i++) {
      const id = `chick-${i}`
      const eng = createChickenEngine(host, { groundHeight: groundRef.current, fixedScale: true, species: "chick", art: chickArt(randomChickStyle("realista")) })
      eng.setGame({ gameMode: true })
      eng.setDevices([])
      const entry = { brain: createFollowBrain(), actions: {} as FollowActions }
      eng.setBot(() => entry.actions)
      // around her, on both sides, a little scattered
      eng.dropAt(at.x + (i % 2 ? -1 : 1) * (60 + 26 * Math.floor(i / 2) + Math.random() * 20))
      map.set(id, eng); brains.set(id, entry)
    }
    let last = performance.now(), raf = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now
      const ls = lead.getMotionState()
      map.forEach((eng, id) => {
        const entry = brains.get(id)
        if (!entry) return
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
      cancelGameFrame(raf)
      brains.forEach((_, id) => { map.get(id)?.destroy(); map.delete(id) })
    }
  }, [lead, engines, count])
  return <div ref={hostRef} className="pointer-events-none fixed inset-0 z-[199]" />
}
