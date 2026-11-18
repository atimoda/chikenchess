// The round of the Grade de blocos in the online Pátio, on this browser: the lobby's owner sends its round and does
// what the others' players ask; the others mirror it and send what their players do. The data and who decides what
// are in lib/pigchicken/net-mine.ts, the round in mine-grid-store.ts. lib/pigchicken/net-world-sync.ts calls it
// with its role, what arrived and once a frame.
import type { MineAct, MineEvent, MineRound } from './mine-round'
import { mineAct, mineMirrorIn, mineStore, setMineMirror, setMineNetChicks, watchMine } from './mine-grid-store'
import {
  batchMineActs, cleanMineActs, cleanMineState, exportMineCells, exportMineStats, importMineCells, importMineStats, mapActIds, mapEventIds, mineIdIn, mineIdOut, mineSameShape,
  NET_MINE_ACTS, type NetMineActs, type NetMineState, type NetMineWord,
} from './net-mine'
import { cleanNetMineActivator, cleanNetMineActivatorHits } from './mine-activator'
import { mineActivatorIn, mineActivatorOut, mineActivatorRemote, setMineActivatorMirror } from './mine-activator-store'

const STATE_MS = 100 // the owner's round: what changed, at most 10 times a second
const FULL_MS = 5000 // and all of it (also when someone joins and when a round starts)
const ACTS_MS = 50 // what the players here did leaves in batches, 20 times a second
const CHICKS_MS = 2000 // which of them are a Filhote: when it changes and this often

export type NetMineRole = 'off' | 'owner' | 'follower'

// locals: this browser's players in their slots' order ('p1' first); send: to the game server. With a server that
// does not relay the round the caller keeps this 'off', and every browser plays its own.
// The Ativadores de grid de campo minado ride the same messages (g): the owner's word on them, even with no round
// (NetMineWord), and what the others' players poured into them, or a hide asked by their admin.
export function createNetMineSync(o: { locals: () => string[]; send: (m: NetMineState | NetMineActs | NetMineWord) => void }) {
  let role: NetMineRole = 'off', myPid = -1
  // the owner: what the others know of each block, of the stats and of the Filhotes; what happened since it last said
  const sent = new Map<number, string>()
  let sentNo = -1, sentStats = '', sentChicks = '', sentOver = false, othersKey = '', lastState = 0, lastFull = 0
  const eventsOut: MineEvent[] = []
  // the Filhotes of the other browsers, as each one said (the owner tells everyone)
  const chicksOf = new Map<number, number[]>()
  // a follower: what its players did, on its way to the owner; the round it mirrors and its number
  const actsOut: MineAct[] = []
  let mirrored: MineRound | null = null, mirroredNo = -1, lastActs = 0, lastChicks = 0, chicksKey = ''
  // the Ativadores: a follower's pours on their way (id → notes, damage) and its hide; what the owner said of them last
  const hitsOut = new Map<string, [number, number]>()
  let hideOut = false, sentG = '', gOthers = '', lastG = 0
  const fields = (raw: unknown) => (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {})

  const out = (who: string) => mineIdOut(who, o.locals(), myPid)
  const back = (id: string) => mineIdIn(id, o.locals(), myPid)
  const unwatch = watchMine(events => { if (role === 'owner') { eventsOut.push(...events); if (eventsOut.length > 64) eventsOut.splice(0, eventsOut.length - 64) } })
  const myChicks = () => o.locals().map((who, slot) => (mineStore.isChick(who) ? slot : -1)).filter(slot => slot >= 0)

  return {
    get role() { return role },
    /** this browser's part changed (or its place in the lobby) */
    become(next: NetMineRole, pid: number) {
      if (next === role && pid === myPid) return
      role = next; myPid = pid
      setMineMirror(next === 'follower' ? a => { if (actsOut.length < 512) actsOut.push(a) } : null)
      setMineActivatorMirror(next === 'follower' ? a => {
        if ('hide' in a) { hideOut = true; return }
        const [id, n, d] = a.hit, was = hitsOut.get(id)
        if (was || hitsOut.size < 64) hitsOut.set(id, [(was?.[0] ?? 0) + n, (was?.[1] ?? 0) + d])
      } : null)
      hitsOut.clear(); hideOut = false; sentG = ''; gOthers = ''; lastG = 0
      sent.clear(); sentNo = -1; sentStats = ''; sentChicks = ''; sentOver = false; othersKey = ''; lastFull = 0
      eventsOut.length = 0; actsOut.length = 0; chicksOf.clear()
      mirrored = null; chicksKey = ''
      setMineNetChicks([])
    },
    /** a "mine" message of another browser (ownerPid: the lobby's owner) */
    receive(pid: number, raw: unknown, ownerPid: number) {
      if (role === 'owner') {
        for (const hit of cleanNetMineActivatorHits(fields(raw).g) ?? []) mineActivatorRemote({ hit })
        if (fields(raw).h === 1) mineActivatorRemote({ hide: true })
        const m = cleanMineActs(raw, pid)
        if (!m) return
        if (m.k) chicksOf.set(pid, m.k)
        for (const a of m.a ?? []) mineAct(mapActIds(a, back))
      } else if (role === 'follower' && pid === ownerPid) {
        const g = cleanNetMineActivator(fields(raw).g)
        if (g) mineActivatorIn(g)
        const m = cleanMineState(raw), round = mineStore.round
        if (!m || !round || !mineSameShape(round, m)) return
        // another round (or this browser's own started again meanwhile): only from all of its blocks
        const fresh = mirrored !== round || mirroredNo !== m.n
        if (fresh && !m.f) return
        mineMirrorIn({
          fresh: fresh ? m.n : undefined,
          change: r => {
            mirrored = r; mirroredNo = m.n
            importMineCells(r, m.l, back)
            if (m.st) r.stats = importMineStats(m.st, back)
            r.over = m.o === 1
          },
          events: (m.e ?? []).map(e => mapEventIds(e, back)),
        })
        if (m.k) setMineNetChicks(m.k.filter(id => !id.startsWith(`${myPid}:`)))
      }
    },
    /** once a frame. others: the other browsers' pids */
    frame(now: number, others: number[]) {
      if (role === 'off') return
      const round = mineStore.round
      if (role === 'follower') {
        if (now - lastActs < ACTS_MS) return
        const k = myChicks(), key = k.join(',')
        const tell = key !== chicksKey || now - lastChicks >= CHICKS_MS
        if (!actsOut.length && !tell && !hitsOut.size && !hideOut) return
        lastActs = now
        const a = batchMineActs(actsOut.splice(0, 256)).slice(0, NET_MINE_ACTS).map(x => mapActIds(x, out))
        const g = [...hitsOut].map(([id, [n, d]]): [string, number, number] => [id, n, d])
        o.send({ ...(a.length ? { a } : {}), ...(tell ? { k } : {}), ...(g.length ? { g } : {}), ...(hideOut ? { h: 1 as const } : {}) })
        hitsOut.clear(); hideOut = false
        if (tell) { chicksKey = key; lastChicks = now }
        return
      }
      // the owner
      for (const pid of [...chicksOf.keys()]) if (!others.includes(pid)) chicksOf.delete(pid)
      const chicks = [...myChicks().map(slot => `${myPid}:${slot}`), ...[...chicksOf].flatMap(([pid, slots]) => slots.map(slot => `${pid}:${slot}`))]
      setMineNetChicks(chicks.filter(id => !id.startsWith(`${myPid}:`)))
      // the Ativadores: when they change, to whoever joins and every few seconds (nothing while there are none)
      const g = mineActivatorOut(), gKey = !g.b.length && !g.v ? '' : JSON.stringify(g), key = others.join(',')
      const gDue = gKey !== sentG || (!!gKey && (key !== gOthers || now - lastG >= FULL_MS))
      const saidG = () => { sentG = gKey; gOthers = key; lastG = now }
      if (!round || !others.length) {
        eventsOut.length = 0; othersKey = ''
        if (!others.length) { sentG = ''; gOthers = ''; return }
        if (gDue && now - lastState >= STATE_MS) { o.send({ g }); saidG(); lastState = now }
        return
      }
      if (now - lastState < STATE_MS) return
      const no = mineStore.roundNo
      const full = key !== othersKey || no !== sentNo || now - lastFull >= FULL_MS
      if (full) sent.clear()
      const l = exportMineCells(round, sent, out)
      const stats = JSON.stringify(exportMineStats(round.stats, out)), chicksNow = chicks.join(',')
      if (!full && !l.length && !eventsOut.length && stats === sentStats && chicksNow === sentChicks && round.over === sentOver && !gDue) return
      const msg: NetMineState = {
        n: no, c: round.grid.geo.cols, r: round.grid.geo.rows, l,
        ...(full ? { f: 1 as const } : {}),
        ...(full || stats !== sentStats ? { st: JSON.parse(stats) } : {}),
        ...(round.over ? { o: 1 as const } : {}),
        ...(eventsOut.length ? { e: eventsOut.map(e => mapEventIds(e, out)) } : {}),
        ...(full || chicksNow !== sentChicks ? { k: chicks } : {}),
        ...(full || gDue ? { g } : {}),
      }
      o.send(msg)
      if (full || gDue) saidG()
      lastState = now
      if (full) { othersKey = key; sentNo = no; lastFull = now }
      sentStats = stats; sentChicks = chicksNow; sentOver = round.over
      eventsOut.length = 0
    },
    dispose() { unwatch(); setMineMirror(null); setMineActivatorMirror(null); setMineNetChicks([]) },
  }
}
export type NetMineSync = ReturnType<typeof createNetMineSync>
