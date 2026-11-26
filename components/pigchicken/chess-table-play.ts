// The Mesas de chickenchess in the Parquinho (lib/pigchicken/chess-table.ts has the rules, chess-table-store.ts the
// queues and the match): Usar on a stool, a slam on a table's top, the players of the match held on their stools,
// whoever walked away leaving the queue, and the Chaves de ouro the match won.
import type { ChickenEngine } from "@/lib/chicken/engine"
import type { Combat, FrameInput } from "@/lib/pigchicken/combat"
import { liveCamera } from "@/lib/pigchicken/live-camera"
import { CHESS_QUEUE_REACH, chessPrompt, chessSlamOption, chessStool, onChessTop, whoOf, type ChessPrompt, type ChessSide } from "@/lib/pigchicken/chess-table"
import { chessTableSlam, chessTableStore, chessTableUse, setChessListener, stepChessTables, takeChessRewards, type ChessTableBox } from "@/lib/pigchicken/chess-table-store"

// what Usar would do on each stool a player of this screen stands on now, with that player's key (`${table}:${side}`)
export const chessHints = new Map<string, { prompt: ChessPrompt; key: string }>()

const bodyOf = (e: ChickenEngine) => {
  const st = e.getMotionState()
  return { x: st.x + liveCamera.x, y: st.y - liveCamera.y, grounded: st.grounded }
}
// the stool a body stands on (on its top, or on the floor right at it), if any
function stoolUnder(body: { x: number; y: number; grounded: boolean }): { box: ChessTableBox; side: ChessSide } | null {
  if (!body.grounded) return null
  for (const box of chessTableStore.boxes) {
    for (const side of [0, 1] as const) {
      const s = chessStool(box, side)
      if (body.x >= s.l - 4 && body.x <= s.r + 4 && body.y >= s.top - 6 && body.y <= s.floor + 2) return { box, side }
    }
  }
  return null
}

export function bindChessTablePlay(combat: Combat, o: { engines: () => [string, ChickenEngine][] }) {
  return {
    // once a frame, before the players: the count, the queues and the keys won
    step(now: number) {
      chessHints.clear()
      const engines = new Map(o.engines())
      const near = (who: string, box: ChessTableBox) => {
        const e = engines.get(who)
        if (!e) return false
        const b = bodyOf(e)
        return Math.hypot(b.x - (box.x + box.w / 2), b.y - (box.y + box.h)) <= CHESS_QUEUE_REACH
      }
      stepChessTables(now, near)
      const p1 = engines.get("p1")
      if (p1) { const b = bodyOf(p1); setChessListener(b.x, b.y) }
      for (const who of takeChessRewards()) {
        if (!engines.has(who)) continue
        combat.use(who)
        combat.grant("chesskey")
        const e = engines.get(who)!, b = bodyOf(e)
        combat.addText(b.x, b.y - 180, "Chave de ouro!", "#ffd34a", 22)
        combat.burst(b.x, b.y - 120, 28, "#ffd34a", 260, 3)
      }
      combat.use("p1")
    },
    // a player of this screen: her hint on the stool she stands on, and Usar there (it is the stool's, not Pegar's)
    player(who: string, eng: ChickenEngine, input: FrameInput & { grabHeld?: boolean }, key: string) {
      const on = stoolUnder(bodyOf(eng))
      if (!on) return
      const prompt = chessPrompt(chessTableStore.state(on.box.id), on.side, who)
      if (!prompt) return
      const at = `${on.box.id}:${on.side}`
      if (!chessHints.has(at)) chessHints.set(at, { prompt, key })
      if (input.grab) chessTableUse(on.box.id, on.side, who, performance.now())
      input.grab = false; input.grabReleased = false
      if (input.grabHeld !== undefined) input.grabHeld = false
    },
    // where a player of the match sits (world units), held there for the whole match; null: not in it
    seat(who: string): { x: number; y: number; face: number; keepJump: boolean } | null {
      const m = chessTableStore.match
      if (!m) return null
      const side: ChessSide | null = m.white === who ? 0 : m.black === who ? 1 : null
      if (side === null) return null
      const box = chessTableStore.boxes.find(b => b.id === m.tableId)
      if (!box || whoOf(chessTableStore.state(box.id).seats[side]) !== who) return null
      const s = chessStool(box, side)
      return { x: s.cx, y: s.floor, face: s.face, keepJump: true }
    },
    // a player landed holding Chocar at (x, y) (world): on a table's top, its option there steps to its next value
    slam(x: number, y: number) {
      for (const box of chessTableStore.boxes) {
        if (!onChessTop(box, x, y)) continue
        const option = chessSlamOption(box, x)
        if (option) chessTableSlam(box.id, option, performance.now())
        return
      }
    },
  }
}
