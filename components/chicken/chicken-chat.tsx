"use client"

import { cancelGameFrame, requestGameFrame } from "@/lib/game-frame"
import { useT } from "@/lib/i18n"

// Chat over the chickens: Enter (or the chat button) opens a text field at the bottom of the screen; Enter sends,
// Esc cancels. The message shows as a speech bubble above the sender's chicken (lib/chicken/chat.ts). While
// the field has the focus, the game keys go to the text and not to the chicken.
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { GripVertical, MessageCircle, Send } from "lucide-react"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { isChickenControlsListening } from "@/lib/chicken/controls"
import { CHAT_MAX, LOCAL_CHAT_PLAYER, getChickenChatHistory, getChickenChats, sendChickenChat, subscribeChickenChat, type ChickenChatMessage } from "@/lib/chicken/chat"
import { cn } from "@/lib/utils"
import { stageHeight, stageWidth } from "@/lib/stage-size"
import { liveCamera } from "@/lib/pigchicken/live-camera"

// the top of her head (with the comb) above her feet, and forward of them, in rig units
const HEAD_TOP = 215, HEAD_FWD = 30
const EDGE = 8

const EMPTY: ChickenChatMessage[] = []
let snapshot: ChickenChatMessage[] = EMPTY
const readChats = () => {
  const next = getChickenChats()
  if (next.length !== snapshot.length || next.some((m, i) => m.id !== snapshot[i]?.id)) snapshot = next.length ? next : EMPTY
  return snapshot
}
function useChickenChats() {
  const list = useSyncExternalStore(subscribeChickenChat, readChats, () => EMPTY)
  // re-read when the next bubble runs out
  const [, tick] = useState(0)
  useEffect(() => {
    if (!list.length) return
    const next = Math.min(...list.map(m => m.until)) - Date.now()
    const t = window.setTimeout(() => tick(n => n + 1), Math.max(0, next) + 30)
    return () => window.clearTimeout(t)
  }, [list])
  return readChats()
}

function isTextField(t: EventTarget | null) {
  const e = t as HTMLElement | null
  if (!e || !e.tagName) return false
  return (e.tagName === "INPUT" && !["range", "checkbox", "radio", "button"].includes((e as HTMLInputElement).type)) || e.tagName === "TEXTAREA" || e.tagName === "SELECT" || e.isContentEditable
}

// The header's chat button (mainly for touch screens, which have no Enter key)
export function ChickenChatButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const tr = useT()
  return (
    <button
      type="button"
      aria-label={tr("Chat")}
      aria-pressed={open}
      title={tr("Chat (Enter)")}
      // keep the focus where it is: the field takes it as it opens
      onPointerDown={e => e.preventDefault()}
      onClick={onToggle}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", open ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}
    >
      <MessageCircle className="h-4 w-4" />
    </button>
  )
}

// players: who has a chicken on this screen, by chat player id (the local one is LOCAL_CHAT_PLAYER);
// myName: the nick shown in front of this screen's messages in the history
export function ChickenChat({ players, open, onOpenChange, bottom, myName }: { players: Record<string, ChickenEngine | null>; open: boolean; onOpenChange: (open: boolean) => void; bottom: number; myName?: string }) {
  const tr = useT()
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const chats = useChickenChats()
  const openRef = useRef(open)
  openRef.current = open

  // Enter opens the field, anywhere except text fields, dialogs and the floating panels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openRef.current || e.repeat || e.isComposing || (e.code !== "Enter" && e.code !== "NumpadEnter")) return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isChickenControlsListening() || isTextField(e.target)) return
      if ((e.target as HTMLElement | null)?.closest?.('[role="dialog"], [role="alertdialog"], aside, [data-chicken-ignore]')) return
      // a focused header button would take the Enter as a click
      e.preventDefault()
      onOpenChange(true)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onOpenChange])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const close = () => {
    onOpenChange(false)
    inputRef.current?.blur()
  }
  const submit = () => {
    if (sendChickenChat(text, LOCAL_CHAT_PLAYER, myName)) setText("")
    close()
  }

  return (
    <>
      <style>{`@keyframes chicken-chat-in { from { opacity: 0; transform: translateY(6px) scale(.9); } } @keyframes chicken-chat-out { to { opacity: 0; } }`}</style>
      {chats.map(m => <ChatBubble key={m.id} msg={m} engine={players[m.player] ?? null} />)}
      <ChatHistory bottom={bottom + (open ? 60 : 0)} open={open} />
      {open && (
        <form
          data-chicken-ignore
          aria-label={tr("Chat")}
          onSubmit={e => { e.preventDefault(); submit() }}
          className="pointer-events-auto fixed left-1/2 z-[240] flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/50 bg-[#101713]/90 p-1.5 pl-3 font-mono text-sm text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur"
          style={{ bottom }}
        >
          <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
          <input
            ref={inputRef}
            type="text"
            aria-label={tr("Mensagem")}
            placeholder={tr("Diga algo…")}
            enterKeyHint="send"
            autoComplete="off"
            maxLength={CHAT_MAX * 2}
            value={text}
            onChange={e => setText([...e.target.value].slice(0, CHAT_MAX).join(""))}
            onKeyDown={e => {
              // the keys stay in the field: nothing reaches the game while typing (key releases still do,
              // so a key held when the field opened lets go)
              e.stopPropagation()
              if (e.key === "Escape") { e.preventDefault(); close() }
            }}
            onBlur={() => onOpenChange(false)}
            className="h-9 min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/40"
          />
          <span className={cn("shrink-0 text-[10px] tabular-nums", [...text].length >= CHAT_MAX ? "text-amber-300" : "text-white/40")}>{[...text].length}/{CHAT_MAX}</span>
          <button type="submit" aria-label="Enviar" onPointerDown={e => e.preventDefault()} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary bg-primary/25 hover:bg-primary/40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </>
  )
}

// The chat history: the last messages of this visit (CHAT_HISTORY_MAX), "nick: text", newest at the bottom, with no
// background (a shadow under the letters keeps them readable). Each line fades away HISTORY_SHOW ms after it arrives;
// all of them come back while the mouse is over the history's place (or the field to write is open). Only its grip
// takes the mouse (a micro icon left of the newest line, shown with it): dragging it moves the history anywhere on
// the screen, kept in this browser; the rest lets the aim and the clicks through to the game, and the hover is found
// by the pointer's position.
const HISTORY_SHOW = 5000
const HISTORY_POS = "chickenchess:chat-history-pos:v1"
type HistoryPos = { left: number; bottom: number }
function loadHistoryPos(): HistoryPos | null {
  try { const p = JSON.parse(window.localStorage.getItem(HISTORY_POS) || "null"); return p && Number.isFinite(p.left) && Number.isFinite(p.bottom) ? p : null } catch { return null }
}
function ChatHistory({ bottom, open }: { bottom: number; open: boolean }) {
  const tr = useT()
  const lines = useSyncExternalStore(subscribeChickenChat, getChickenChatHistory, getChickenChatHistory)
  const ref = useRef<HTMLDivElement>(null)
  // when each line got here, on this computer's clock (another browser's `at` is on its own clock)
  const seen = useRef(new Map<string, number>())
  const now = Date.now()
  for (const l of lines) if (!seen.current.has(l.id)) seen.current.set(l.id, now)
  if (seen.current.size > lines.length * 2) { const keep = new Set(lines.map(l => l.id)); seen.current.forEach((_, id) => { if (!keep.has(id)) seen.current.delete(id) }) }
  const [hover, setHover] = useState(false)
  const [, tick] = useState(0)
  // re-render when the newest shown line is due to fade
  useEffect(() => {
    const due = lines.map(l => (seen.current.get(l.id) ?? 0) + HISTORY_SHOW - Date.now()).filter(t => t > 0)
    if (!due.length) return
    const t = window.setTimeout(() => tick(n => n + 1), Math.min(...due) + 30)
    return () => window.clearTimeout(t)
  })
  useEffect(() => {
    if (!lines.length) return
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect()
      setHover(!!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [lines.length])
  // where it was dragged to (null: its place in the corner, which goes up with the field to write)
  const [pos, setPos] = useState<HistoryPos | null>(null)
  useEffect(() => { setPos(loadHistoryPos()) }, [])
  const drag = useRef<{ id: number; x: number; y: number; start: HistoryPos } | null>(null)
  const [dragging, setDragging] = useState(false)
  const grab = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !ref.current) return
    e.preventDefault(); e.stopPropagation()
    const r = ref.current.getBoundingClientRect()
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: { left: r.left, bottom: window.innerHeight - r.bottom } }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current, el = ref.current
    if (!d || d.id !== e.pointerId || !el) return
    const w = el.offsetWidth, h = el.offsetHeight
    setPos({
      left: Math.round(Math.min(window.innerWidth - 24, Math.max(-w + 40, d.start.left + e.clientX - d.x))),
      bottom: Math.round(Math.min(window.innerHeight - h, Math.max(0, d.start.bottom - (e.clientY - d.y)))),
    })
  }
  const drop = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    setDragging(false)
    setPos(p => { if (p) { try { window.localStorage.setItem(HISTORY_POS, JSON.stringify(p)) } catch { /* ignore */ } } return p })
  }
  if (!lines.length) return null
  const all = hover || open || dragging
  const last = lines[lines.length - 1]
  return (
    <div
      ref={ref}
      aria-label={tr("Histórico do chat")}
      role="log"
      className="pointer-events-none fixed z-[203] w-[min(340px,calc(100vw-1.5rem))] pl-4 pr-1 font-mono text-xs leading-relaxed text-white [overflow-wrap:anywhere] [text-shadow:0_1px_2px_rgba(0,0,0,0.95),0_0_4px_rgba(0,0,0,0.8)]"
      style={pos ? { left: pos.left, bottom: pos.bottom } : { left: 8, bottom }}
    >
      {lines.map(l => {
        const shown = all || now - (seen.current.get(l.id) ?? now) < HISTORY_SHOW
        return (
          <p key={l.id} className={cn("relative transition-opacity", shown ? "opacity-100 duration-150" : "opacity-0 duration-700")}>
            {l === last && (
              <button type="button" data-chicken-ignore aria-label={tr("Mover o chat")} title={tr("Arraste para mover o chat")}
                onPointerDown={grab} onPointerMove={move} onPointerUp={drop} onPointerCancel={drop}
                style={{ cursor: dragging ? "grabbing" : "grab" }}
                className={cn("pointer-events-auto absolute -left-4 top-0.5 inline-flex h-4 w-3.5 touch-none items-center justify-center rounded-sm hover:text-white", shown ? "text-white/60" : "pointer-events-none")}>
                <GripVertical className="h-3 w-3" />
              </button>
            )}
            <span className="font-bold text-primary">{l.name}:</span> {l.text}
          </p>
        )
      })}
    </div>
  )
}

// A speech bubble that follows its chicken every frame (screen coordinates), kept inside the screen
function ChatBubble({ msg, engine }: { msg: ChickenChatMessage; engine: ChickenEngine | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const tailRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!engine) return
    let raf = 0
    const frame = () => {
      raf = requestGameFrame(frame)
      const box = ref.current, tail = tailRef.current
      if (!box || !tail) return
      const s = engine.getMotionState()
      const h = HEAD_TOP * s.scale
      // the head's top, turned with her when she clings to a slope or wall
      const fwd = s.face * HEAD_FWD * s.scale
      const ux = s.x + Math.sin(s.angle) * h + Math.cos(s.angle) * fwd, uy = s.y - Math.cos(s.angle) * h + Math.sin(s.angle) * fwd
      // the Pátio's camera zoom scales her drawing around the stage's centre (the bubble keeps its own size)
      const vw = stageWidth(), z = liveCamera.zoom, cx = vw / 2, cy = stageHeight() / 2
      const hx = cx + (ux - cx) * z, hy = cy + (uy - cy) * z
      const w = box.offsetWidth, bh = box.offsetHeight
      const left = Math.min(vw - EDGE - w, Math.max(EDGE, hx - w / 2))
      const top = Math.max(EDGE + 56, hy - 14 - bh)
      box.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
      tail.style.left = `${Math.min(w - 16, Math.max(16, hx - left))}px`
    }
    frame()
    return () => cancelGameFrame(raf)
  }, [engine])
  if (!engine) return null
  const ms = msg.until - msg.at
  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-0 top-0 z-[204] w-max max-w-[min(260px,calc(100vw-16px))]"
    >
      <div
        style={{ transformOrigin: "50% 100%", animation: `chicken-chat-in 180ms ease-out, chicken-chat-out 300ms ease-in ${Math.max(0, ms - 300)}ms forwards` }}
        className="relative rounded-2xl border-2 border-[#2a1e13] bg-[#fffaf0] px-3 py-1.5 text-center font-sans text-[14px] font-semibold leading-snug text-[#1d1a14] shadow-[0_4px_14px_rgba(0,0,0,0.35)] [overflow-wrap:anywhere]">
        {msg.text}
        <div ref={tailRef} aria-hidden="true" className="absolute top-full -translate-x-1/2" style={{ left: "50%" }}>
          <div className="-mt-[2px] h-0 w-0 border-x-[9px] border-t-[11px] border-x-transparent border-t-[#2a1e13]" />
          <div className="absolute left-[2px] top-[-2px] h-0 w-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-[#fffaf0]" />
        </div>
      </div>
    </div>
  )
}
