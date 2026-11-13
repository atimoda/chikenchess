// The ghosts of the Quadros de lousa: while a player is near a board with a move (lib/pigchicken/chalkboard.ts), a
// half see-through, white chicken does that move over and over beside it, and fades away when every player leaves.
// Each ghost is a real chicken engine driven by the move's script (setBot), so it moves, climbs and bounces exactly as
// the player's buttons would make her; it is mute, cannot be picked up and nothing in the game sees it (no items,
// portals, shots or enemies). ParquinhoPlay calls `frame` once per frame and moves `engines()` with its camera.
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import type { ChickenAction } from "@/lib/chicken/controls"
import { TRAINING_DEMOS, demoActionsAt, demoLength, nearBoard, type DemoId } from "@/lib/pigchicken/chalkboard"
import { layoutFloorBelow, type LayoutElement } from "@/lib/pigchicken/layout"
import { WORLD_GROUND_Y } from "@/lib/pigchicken/world"

// how see-through the ghost is, and how long it takes to appear or go (s)
export const GHOST_OPACITY = 0.5
export const GHOST_FADE = 0.3

type Ghost = { eng: ChickenEngine; div: HTMLDivElement; demo: DemoId; key: string; t: number; seen: number; actions: Partial<Record<ChickenAction, boolean>> }

export type GhostFrame = {
  // the Pátio's elements in world units (regions resolved): the boards and the floors the ghosts start on
  elements: LayoutElement[]
  // every local player's feet (world)
  players: { x: number; y: number }[]
  camX: number; camY: number; zoom: number; dt: number
  walls: { lo: number; hi: number; top?: number }
}

export function createTrainingGhosts(host: HTMLElement) {
  const ghosts = new Map<string, Ghost>()
  const drop = (id: string) => {
    const g = ghosts.get(id)
    if (!g) return
    g.eng.destroy(); g.div.remove(); ghosts.delete(id)
  }
  const start = (g: Ghost, el: LayoutElement, f: GhostFrame) => {
    const b = el.params.chalkboard!
    const x = el.x + el.w / 2 + b.ghostX
    const floor = layoutFloorBelow(f.elements, x, el.y + el.h + b.ghostY)
    g.eng.placeAt(x - f.camX, floor + f.camY - 1, TRAINING_DEMOS[g.demo].face ?? 1)
    g.t = 0
  }
  return {
    engines: () => [...ghosts.values()].map(g => g.eng),
    frame(f: GhostFrame) {
      const live = new Set<string>()
      for (const el of f.elements) {
        const b = el.kind === "chalkboard" ? el.params.chalkboard : undefined
        if (!b?.demo || el.depth) continue
        live.add(el.id)
        const near = f.players.some(p => nearBoard(el, b, p.x, p.y))
        let g = ghosts.get(el.id)
        // a board changed in the editor starts its ghost again
        const key = `${b.demo}:${el.x}:${el.y}:${el.w}:${el.h}:${b.ghostX}:${b.ghostY}`
        if (g && g.key !== key) { drop(el.id); g = undefined }
        if (!g) {
          if (!near) continue
          const div = document.createElement("div")
          div.dataset.trainingGhost = el.id
          div.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;filter:grayscale(1) brightness(2.5)"
          host.appendChild(div)
          const eng = createChickenEngine(div, { groundHeight: window.innerHeight - WORLD_GROUND_Y - f.camY, fixedScale: true, ghost: true })
          eng.setGame({ gameMode: true })
          eng.setDevices([])
          const ghost: Ghost = { eng, div, demo: b.demo, key, t: 0, seen: 0, actions: {} }
          eng.setBot(() => ghost.actions)
          eng.setBounds(f.walls)
          eng.setCameraZoom(f.zoom)
          ghosts.set(el.id, ghost)
          start(ghost, el, f)
          g = ghost
        }
        const demo = TRAINING_DEMOS[g.demo], len = demoLength(demo)
        g.seen = Math.max(0, Math.min(1, g.seen + (near ? 1 : -1) * f.dt / GHOST_FADE))
        if (!near && g.seen <= 0) { drop(el.id); continue }
        g.t += f.dt
        if (g.t >= len) start(g, el, f)
        g.actions = demoActionsAt(demo, g.t)
        // it fades in at the start of each round and out at its end, so the jump back to the start is not seen
        const round = Math.min(1, g.t / GHOST_FADE, (len - g.t) / GHOST_FADE)
        g.div.style.opacity = String(Math.max(0, GHOST_OPACITY * g.seen * round).toFixed(3))
      }
      for (const id of [...ghosts.keys()]) if (!live.has(id)) drop(id)
    },
    dispose() { for (const id of [...ghosts.keys()]) drop(id) },
  }
}
