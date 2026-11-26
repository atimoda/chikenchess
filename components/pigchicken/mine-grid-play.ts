// The Grade de blocos in the Parquinho (lib/pigchicken/mine-round.ts has the rules, mine-grid-store.ts the round):
// what the notes, the shots, the blasts and the shocks of the combat do to the blocks, Usar at a bomb, installing a
// bomb from the inventory, and what happens when a block's bomb goes off (the blast, the deaths, the Filhotes).
import type { ChickenEngine } from "@/lib/chicken/engine"
import { chickArt, playerChickStyle } from "@/lib/chicken/chick-art"
import type { Combat, FrameInput } from "@/lib/pigchicken/combat"
import { liveCamera } from "@/lib/pigchicken/live-camera"
import { mineCell, mineCellAt, mineCellRect, mineRoomClamp, mineWallThickness, type MineSpot } from "@/lib/pigchicken/mine-grid"
import {
  mineBlastCells, mineBlowHits, mineBlowNotes, mineBombUse, mineInstallSpot, mineTitles, mineWallHit,
  type MineAct, type MineBombUse, type MineEvent, type MineRound,
} from "@/lib/pigchicken/mine-round"
import { defaultChest, rollLoot } from "@/lib/pigchicken/chests"
import { mineAct, mineStore, mineTouched, setMineChick, stepMine, watchMine } from "@/lib/pigchicken/mine-grid-store"
import { mineActivatorBlastHit, mineActivatorBlowHit, mineActivatorNote, mineActivatorShot, mineActivatorStore, openMineActivator, takeMineActivatorFlashes } from "@/lib/pigchicken/mine-activator-store"
import { playWeaponSound } from "@/lib/pigchicken/sfx"
import { getChickenConfig } from "@/lib/chicken/config"

// how far from the bomb, at the middle of its block, her body may be to use it (world units)
const BOMB_REACH = 130
// ms after a player is first seen in a round in which being on the closed side still counts as starting there
const BORN_MS = 3000
// how far from an open block she may be to install a bomb in it: across the gap and the wall of her own block
const INSTALL_REACH = 56
// a block's bomb going off: its radius in blocks, what it does to the enemies in it and how hard it pushes
const BOOM = { radius: 1.35, contained: 0.55, damage: 160, push: 1100 }
// what Usar would do at the bomb, in the words of the hint over it
export const BOMB_USE_LABELS: Record<MineBombUse, string> = { disarm: "desarmar", detonator: "detonar", take: "pegar", arm: "rearmar" }

// what each local player could do right now, for the layer to show: the bomb Usar would act on, the open block a
// bomb would be installed in
export type MineHint = { use?: { at: MineSpot; use: MineBombUse }; install?: MineSpot }
export const mineHints = new Map<string, MineHint>()
// a locked Ativador de grid with a player of this screen by it: the bind of Usar and whether she has a Chave de ouro
// (by the activator's id; a player with a key wins the hint)
export const activatorHints = new Map<string, { key: string; has: boolean }>()

// where a chicken is for the grid: just off her feet, up her body (the same point her side is read at)
export const FEET_UP = 3
export function mineSpotOf(e: ChickenEngine) {
  const st = e.getMotionState()
  return { x: st.x + liveCamera.x + Math.sin(st.angle) * FEET_UP, y: st.y - liveCamera.y - Math.cos(st.angle) * FEET_UP, body: 100 * st.scale, angle: st.angle }
}

// a Filhote plays its instruments and uses the bombs, and nothing else (Personagem → Filhote: “Campo minado: só
// instrumentos e bombas” off lets it do everything; its Golpe rápido follows “Sem Golpe rápido”)
function childHands(combat: Combat, input: FrameInput) {
  const p = getChickenConfig().params
  if (!p.babyMineHands || (combat.held && combat.def().instrument)) return
  input.fire = false; input.firePressed = false; input.throwHeld = false; input.throwReleased = false
  if (p.babyNoMelee) input.melee = false
}

export function bindMinePlay(combat: Combat, o: { engines: () => [string, ChickenEngine][]; color?: (who: string) => string | undefined }) {
  // the Ativadores de grid de campo minado come first: they stand anywhere, with or without the grid
  combat.setMine({
    note(px, py, x, y, by) {
      const act = mineActivatorNote(px, py, x, y, by, mineStore.params?.blue ?? "#4d9bff")
      if (act) return act
      const round = mineStore.round, p = mineStore.params
      if (!round || !p) return null
      const hit = mineWallHit(round.grid, px, py, x, y)
      if (!hit) return null
      const cell = mineCell(round.grid, hit.c, hit.r)!
      // a note that goes on through the blocks counts once, on its way in
      if (by && (p.blockNotes || hit.inward)) { mineAct({ k: "note", c: hit.c, r: hit.r, side: mineStore.side(by), by, face: hit.face }); mineTouched() }
      return { flipX: hit.flipX, bounce: p.blockNotes, color: cell.flag ? p.orange : p.blue }
    },
    shot(px, py, x, y, damage, by) {
      const act = mineActivatorShot(px, py, x, y, damage, by)
      if (act) return act
      const round = mineStore.round, p = mineStore.params
      if (!round || !p) return null
      const hit = mineWallHit(round.grid, px, py, x, y)
      if (!hit) return null
      if (by && damage > 0) { mineAct({ k: "shot", c: hit.c, r: hit.r, d: damage, by, face: hit.face, side: mineStore.side(by) }); mineTouched() }
      return { flipX: hit.flipX }
    },
    blast(x, y, r, damage, by) {
      mineActivatorBlastHit(x, y, r, damage)
      const round = mineStore.round, p = mineStore.params
      if (!round || !p) return
      for (const k of mineBlastCells(round.grid, x, y, r)) mineAct({ k: "shot", c: k.c, r: k.r, d: damage * k.part, by, side: mineStore.side(by) })
      mineTouched()
    },
    shock(x1, y1, x2, y2) {
      const round = mineStore.round, p = mineStore.params
      if (!round || !p) return
      const g = round.grid.geo, hit = mineWallHit(round.grid, x1, y1, x2, y2) ?? mineCellAt(g, x2, y2) ?? mineCellAt(g, x1, y1)
      if (hit) { mineAct({ k: "shock", c: hit.c, r: hit.r }); mineTouched() }
    },
    blow(x, y, angle, arc, reach, damage, music, by) {
      mineActivatorBlowHit(x, y, angle, arc, reach, damage, music)
      const round = mineStore.round, p = mineStore.params
      if (!round || !p) return
      const hits = mineBlowHits(round.grid, x, y, angle, arc, reach)
      for (const hit of hits) {
        // an instrument's blow counts as notes (the open side's only, like the ones it plays), any other as a shot
        mineAct(music ? { k: "note", c: hit.c, r: hit.r, side: mineStore.side(by), by, face: hit.face, n: mineBlowNotes(p, damage) } : { k: "shot", c: hit.c, r: hit.r, d: damage, by, face: hit.face, side: mineStore.side(by) })
      }
      if (hits.length) mineTouched()
    },
  })

  const grow = (who: string) => { if (mineStore.isChick(who)) { setMineChick(who, false); playWeaponSound("chestLegend", null) } }
  const centre = (round: MineRound, at: MineSpot) => { const k = mineCellRect(round.grid.geo, at.c, at.r); return { x: k.x + k.w / 2, y: k.y + k.h / 2 } }
  // the round's prizes, given at the next frame (an end can come in the middle of a player's step)
  let prizes: MineRound | null = null
  // what the round's answer does to an inventory (the key a disarm spends, the bomb taken or installed), also at the
  // next frame: the round may be the lobby's owner's, and its answer comes when it comes
  const local = (who: string) => o.engines().some(([id]) => id === who)
  const later: [who: string, fn: () => void][] = []
  // who asked the owner for something at a bomb and has no answer yet (s left to wait): one thing at a time
  const waiting = new Map<string, number>()
  const ask = (who: string, a: MineAct) => { if (mineStore.mirrored) waiting.set(who, 0.6); mineAct(a) }
  const unwatch = watchMine((events: MineEvent[], round) => {
    const p = mineStore.params
    for (const ev of events) {
      if (ev.kind === "end") { prizes = round; continue }
      if ("by" in ev && ev.by) waiting.delete(ev.by)
      const at = centre(round, ev), size = round.grid.geo.cell
      if (ev.kind === "flag") {
        combat.burst(at.x, at.y, 26, p?.blue ?? "#4d9bff", 300, 4); playWeaponSound("chest", null)
        // a Filhote on the open side is an adult again by raising the flag over a real bomb
        if (ev.bomb) grow(ev.by)
      } else if (ev.kind === "doubt") { combat.burst(at.x, at.y, 22, p?.orange ?? "#ffb366", 260, 4); playWeaponSound("locked", null) }
      else if (ev.kind === "clear") { combat.burst(at.x, at.y, 22, p?.grey ?? "#8f98a3", 260, 4); playWeaponSound("chest", null) }
      else if (ev.kind === "open") { combat.burst(at.x, at.y, 34, p?.grey ?? "#8f98a3", 360, 5); playWeaponSound("button", null) }
      else if (ev.kind === "shock") combat.burst(at.x, at.y, 12, "#cfe9ff", 220, 3)
      else if (ev.kind === "boom") {
        combat.boom(at.x, at.y, size * (ev.contained ? BOOM.contained : BOOM.radius), BOOM.damage, ev.contained ? 0 : BOOM.push)
        // whoever is in the blocks it reaches dies: a Filhote from now on
        for (const [who, eng] of o.engines()) {
          const s = mineSpotOf(eng), cell = mineCellAt(round.grid.geo, s.x, s.y)
          if (!cell || !ev.cells.some(k => k.c === cell.c && k.r === cell.r)) continue
          mineAct({ k: "dead", who, owner: ev.owner })
          setMineChick(who, true)
        }
      } else if (ev.kind === "disarm") {
        combat.burst(at.x, at.y, 14, "#ffd34a", 200, 3); playWeaponSound("equip", null)
        // a Filhote on the closed side is an adult again by disarming a bomb
        grow(ev.by)
        if (local(ev.by)) later.push([ev.by, () => combat.spend("goldkey")])
      } else if (ev.kind === "detonator") playWeaponSound("locked", null)
      else if (ev.kind === "install") {
        playWeaponSound("equip", null)
        if (local(ev.by)) later.push([ev.by, () => combat.spend("minebomb")])
        // the block closed around whoever was in it: someone where its walls now stand is moved just inside them
        const k = mineCellRect(round.grid.geo, ev.c, ev.r), t = mineWallThickness(round.grid.geo) + 4
        for (const [, eng] of o.engines()) {
          const s = mineSpotOf(eng), cell = mineCellAt(round.grid.geo, s.x, s.y)
          if (!cell || cell.c !== ev.c || cell.r !== ev.r) continue
          // (with cut corners, also off the slanted walls)
          const { x, y } = mineRoomClamp(round.grid.geo, ev.c, ev.r, s.x, Math.max(k.y + t + s.body * 2, s.y), t)
          if (x !== s.x || y !== s.y) eng.placeAt(x - liveCamera.x, y + liveCamera.y)
        }
      } else if (ev.kind === "arm" || ev.kind === "take") {
        playWeaponSound("equip", null)
        if (ev.kind === "take" && local(ev.by)) later.push([ev.by, () => combat.grant("minebomb")])
      }
    }
  })

  // what the Filhotes look like: each engine keeps its own art until it grows again
  const small = new Set<ChickenEngine>()
  // when each player was first seen in the round (ms; -1: no longer new to it): whoever starts it on the closed side
  // has bombs in the inventory
  let seenIn: MineRound | null = null
  const seen = new Map<string, number>()
  const dress = () => {
    for (const [who, eng] of o.engines()) {
      const on = mineStore.isChick(who)
      if (on === small.has(eng)) continue
      if (on) { small.add(eng); eng.setSpecies("chick"); eng.setArt(chickArt(playerChickStyle(o.color?.(who)))) }
      else { small.delete(eng); eng.setSpecies(undefined); eng.setArt(null) }
    }
  }

  return {
    // once per frame of the world, before the players
    step(dt: number) {
      activatorHints.clear()
      stepMine(dt); dress()
      // an activator whose bar just filled: a blue burst and a fanfare where it stands
      for (const id of takeMineActivatorFlashes()) {
        const b = mineActivatorStore.boxes.find(o => o.id === id)
        if (b) { combat.burst(b.x + b.w / 2, b.y + b.h * 0.45, 48, mineStore.params?.blue ?? "#4d9bff", 460, 5); playWeaponSound("chestLegend", null) }
      }
      waiting.forEach((t, who) => { if (t <= dt) waiting.delete(who); else waiting.set(who, t - dt) })
      if (later.length) {
        for (const [who, fn] of later.splice(0)) { combat.use(who); fn() }
        combat.use("p1")
      }
      if (!prizes) return
      // the titles' prizes, for the tools of the next round: the Sapador a Chave dourada, the Minador a bomb, the
      // Desbravador and the Guardião something out of a simple Baú
      const titles = mineTitles(prizes.stats)
      prizes = null
      for (const [who] of o.engines()) {
        combat.use(who)
        if (titles.sapper.includes(who)) combat.grant("goldkey")
        if (titles.miner.includes(who)) combat.grant("minebomb")
        for (const t of [titles.explorer, titles.guardian]) if (t.includes(who)) rollLoot(defaultChest("simple").loot).forEach(item => combat.give(item))
      }
      combat.use("p1")
    },
    // a local player's turn, with the combat already on them (combat.use) and before its step: Usar at the bomb of
    // the block they are in, Atirar with a bomb in the wing, and a Filhote's hands
    // a locked activator: by it (on the ground at it or on its top), Usar with a Chave de ouro opens it, spending the
    // key; it is the activator's Usar, not Pegar's
    activator(who: string, eng: ChickenEngine, input: FrameInput & { grabHeld?: boolean }, key: string) {
      if (!mineActivatorStore.armed() || !eng.getMotionState().grounded) return
      const s = mineSpotOf(eng)
      const b = mineActivatorStore.boxes.find(o => o.params.lock && s.x >= o.x && s.x <= o.x + o.w && s.y >= o.y - 8 && s.y <= o.y + o.h + 4)
      if (!b) return
      const has = combat.count("chesskey") > 0
      if (has || !activatorHints.has(b.id)) activatorHints.set(b.id, { key, has })
      if (!has || !input.grab || combat.hover) return
      if (openMineActivator(b.id)) combat.spend("chesskey")
      input.grab = false; input.grabReleased = false
      if (input.grabHeld !== undefined) input.grabHeld = false
    },
    player(who: string, eng: ChickenEngine, input: FrameInput) {
      const round = mineStore.round, p = mineStore.params
      if (!round || !p) { mineHints.delete(who); return }
      const chick = mineStore.isChick(who), side = mineStore.side(who), s = mineSpotOf(eng), hint: MineHint = {}
      if (seenIn !== round) { seenIn = round; seen.clear() }
      // whoever starts the round on the closed side gets its bombs: on that side a moment after she was first seen in
      // the round, out of the portal she arrives through (until then her side is not hers yet)
      const state = eng.getMotionState().state
      if (mineStore.hasSide(who) && state !== "portalArrival" && state !== "portal") {
        const now = performance.now(), since = seen.get(who)
        if (since === undefined) seen.set(who, now)
        else if (since >= 0 && now - since > BORN_MS) seen.set(who, -1)
        if ((seen.get(who) ?? -1) >= 0 && side === "closed") { seen.set(who, -1); combat.grant("minebomb", p.startBombs) }
      }
      const crouch = !!eng.getActions().crouch || !!eng.getActions().down
      if (side === "closed") {
        const at = mineCellAt(round.grid.geo, s.x, s.y), bomb = at && centre(round, at)
        // the middle of her body within reach of the bomb
        const near = !!bomb && Math.hypot(s.x + Math.sin(s.angle) * s.body - bomb.x, s.y - Math.cos(s.angle) * s.body - bomb.y) <= BOMB_REACH
        const use = at && near ? mineBombUse(round.grid, at, { key: combat.count("goldkey") > 0, crouch }) : null
        if (at && use) {
          hint.use = { at, use }
          if (input.grab && !combat.hover) {
            if (!waiting.has(who)) ask(who, { k: "use", c: at.c, r: at.r, use, by: who })
            input.grab = false; input.grabHeld = false; input.grabReleased = false
          }
        }
      }
      if (combat.held?.item === "minebomb") {
        // the bomb is never fired: on the closed side, next to an open block of the frontier, Atirar installs it
        const spot = side === "closed" && !chick ? mineInstallSpot(round.grid, s.x, s.y, INSTALL_REACH + s.body) : null
        if (spot) {
          hint.install = spot
          if (input.firePressed && !waiting.has(who)) ask(who, { k: "install", c: spot.c, r: spot.r, by: who, turn: p.turn === "first" ? null : typeof p.turn === "number" ? p.turn : Math.floor(Math.random() * 8) * 45 })
        }
        input.fire = false; input.firePressed = false
      }
      if (chick) childHands(combat, input)
      if (hint.use || hint.install) mineHints.set(who, hint); else mineHints.delete(who)
    },
    dispose() {
      unwatch(); combat.setMine(null); mineHints.clear(); later.length = 0; waiting.clear()
      small.forEach(eng => { eng.setSpecies(undefined); eng.setArt(null) }); small.clear()
    },
  }
}
