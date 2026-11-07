"use client"

import { cancelGameFrame, requestGameFrame } from "@/lib/game-frame"

// Chat over the chickens: Enter (or the chat button) opens a text field at the bottom of the screen; Enter sends,
// Esc cancels. The message shows as a speech bubble above the sender's chicken (lib/chicken/chat.ts). While
// the field has the focus, the game keys go to the text and not to the chicken.
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { MessageCircle, Send } from "lucide-react"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { isChickenControlsListening } from "@/lib/chicken/controls"
import { CHAT_MAX, LOCAL_CHAT_PLAYER, getChickenChatHistory, getChickenChats, sendChickenChat, subscribeChickenChat, type ChickenChatMessage } from "@/lib/chicken/chat"
import { cn } from "@/lib/utils"

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
  return (
    <button
      type="button"
      aria-label="Chat"
      aria-pressed={open}
      title="Chat (Enter)"
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
      <ChatHistory bottom={bottom + (open ? 60 : 0)} />
      {open && (
        <form
          data-chicken-ignore
          aria-label="Chat"
          onSubmit={e => { e.preventDefault(); submit() }}
          className="pointer-events-auto fixed left-1/2 z-[215] flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/50 bg-[#101713]/90 p-1.5 pl-3 font-mono text-sm text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur"
          style={{ bottom }}
        >
          <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
          <input
            ref={inputRef}
            type="text"
            aria-label="Mensagem"
            placeholder="Diga algo…"
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

// The chat history: a small see-through panel with every message of this visit, "nick: text", newest at the
// bottom; it scrolls, and follows new messages unless the player scrolled up to read older ones.
function ChatHistory({ bottom }: { bottom: number }) {
  const lines = useSyncExternalStore(subscribeChickenChat, getChickenChatHistory, getChickenChatHistory)
  const ref = useRef<HTMLDivElement>(null)
  const atEnd = useRef(true)
  useEffect(() => {
    const el = ref.current
    if (el && atEnd.current) el.scrollTop = el.scrollHeight
  }, [lines])
  if (!lines.length) return null
  return (
    <div
      ref={ref}
      data-chicken-ignore
      aria-label="Histórico do chat"
      role="log"
      onScroll={e => { const el = e.currentTarget; atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8 }}
      className="pointer-events-auto fixed left-3 z-[203] max-h-40 w-[min(340px,calc(100vw-1.5rem))] overflow-y-auto rounded-lg bg-black/45 px-2.5 py-1.5 font-mono text-xs leading-relaxed text-white [overflow-wrap:anywhere] [scrollbar-width:thin]"
      style={{ bottom }}
    >
      {lines.map(l => <p key={l.id}><span className="font-bold text-primary">{l.name}:</span> {l.text}</p>)}
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
      const hx = s.x + Math.sin(s.angle) * h + Math.cos(s.angle) * fwd, hy = s.y - Math.cos(s.angle) * h + Math.sin(s.angle) * fwd
      const w = box.offsetWidth, bh = box.offsetHeight
      const vw = window.innerWidth
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
