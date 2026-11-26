"use client"

// The match of a Mesa de chickenchess over the Pátio (lib/pigchicken/chess-table.ts, chess-table-store.ts): a count
// of big numbers in the middle of the screen, then the chickenchess match itself, the same board, widgets and
// powers as the campaign, see-through over the game and under the Pátio's header. Its music is heard as loud as the
// table's Raio do som says where the first player is (off outside it), and whoever wins gets a Chave de ouro.
import dynamic from "next/dynamic"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { getCityById } from "@/lib/cities-data"
import { CHESS_COUNTDOWN_MS, chessVolume } from "@/lib/pigchicken/chess-table"
import { chessMatchExit, chessMatchResult, chessTableStore } from "@/lib/pigchicken/chess-table-store"

const ChessGame = dynamic(() => import("@/components/chess-game").then(m => m.ChessGame), { ssr: false })

// how long the music stays loaded after its radius was left (ms): walking along the edge does not restart it
const KEEP_AUDIBLE_MS = 2000

export function PatioChess() {
  useSyncExternalStore(chessTableStore.subscribe, chessTableStore.version, chessTableStore.version)
  const match = chessTableStore.match
  if (!match) return null
  return match.phase === "countdown" ? <Countdown key={match.id} since={match.since} /> : <Match key={match.id} />
}

// 3, 2, 1: big, in the middle of the screen, in the grid's numbers' style
function Countdown({ since }: { since: number }) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    let raf = 0
    const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const left = Math.max(0, CHESS_COUNTDOWN_MS - (now - since))
  const n = Math.max(1, Math.ceil(left / 1000)), k = 1 - (left % 1000) / 1000
  return <div aria-live="assertive" className="pointer-events-none fixed inset-0 z-[207] flex items-center justify-center">
    <span key={n} className="font-mono font-bold leading-none text-white" style={{
      fontSize: "min(42vh, 42vw)", opacity: 1 - k * 0.55, transform: `scale(${1.15 - k * 0.25})`,
      textShadow: "0 0 3px #14181d, 0 4px 0 #14181d, 0 0 28px rgba(0,0,0,0.55)",
    }}>{n}</span>
  </div>
}

function Match() {
  const match = chessTableStore.match!
  const params = chessTableStore.params(match.tableId)
  const box = chessTableStore.boxes.find(b => b.id === match.tableId)
  const city = getCityById(match.city) ?? getCityById("dusseldorf")!
  // under the Pátio's header (its buttons stay reachable)
  const [top, setTop] = useState(56)
  useEffect(() => {
    const header = document.querySelector("main header")
    const measure = () => setTop(Math.max(0, header?.getBoundingClientRect().bottom ?? 56))
    measure()
    const ro = header ? new ResizeObserver(measure) : null
    if (header) ro!.observe(header)
    window.addEventListener("resize", measure)
    // the match's menus open over the Pátio (globals.css)
    document.body.classList.add("patio-chess")
    return () => { ro?.disconnect(); window.removeEventListener("resize", measure); document.body.classList.remove("patio-chess") }
  }, [])
  // how loud, from where the first player is
  const [volume, setVolume] = useState(1)
  const [audible, setAudible] = useState(true)
  const heard = useRef(performance.now())
  useEffect(() => {
    const id = window.setInterval(() => {
      const b = chessTableStore.boxes.find(o => o.id === chessTableStore.match?.tableId)
      if (!b) return
      const at = chessTableStore.listener
      const v = chessVolume(chessTableStore.params(b.id).radius, Math.hypot(at.x - (b.x + b.w / 2), at.y - (b.y + b.h)))
      const now = performance.now()
      if (v > 0) heard.current = now
      setVolume(Math.round(v * 100) / 100)
      setAudible(v > 0 || now - heard.current < KEEP_AUDIBLE_MS)
    }, 150)
    return () => window.clearInterval(id)
  }, [])
  if (!box) return null
  return <div className="fixed inset-x-0 bottom-0 z-[207]" style={{ top }}>
    <ChessGame city={city} panelsFollowPlayerTurn={false}
      onBack={() => chessMatchExit(match.id, performance.now())}
      embed={{ hotseat: match.hotseat, volume: params.radius > 0 ? volume : 0, audible: params.radius > 0 && audible, onResult: result => chessMatchResult(match.id, result) }} />
  </div>
}
