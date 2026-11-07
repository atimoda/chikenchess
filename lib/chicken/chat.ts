// Chat over the chickens (Pátio): Enter opens a text field, the message shows as a speech bubble above the
// sender's chicken for a reading time that grows with its length. One bubble per player: a new message
// replaces the previous one. Online sending goes through a transport that the multiplayer layer plugs in
// (setChickenChatTransport); with none, messages stay on this screen.

export const CHAT_MAX = 140
// the player who speaks from this screen; with several local players, chat always goes through Player 1
export const LOCAL_CHAT_PLAYER = 'p1'

export type ChickenChatMessage = { id: string; player: string; text: string; at: number; until: number; name?: string }
// the chat history panel: every message of this visit, oldest first, with who sent it
export type ChickenChatLine = { id: string; player: string; name: string; text: string; at: number }
export const CHAT_HISTORY_MAX = 200

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// time on screen: 2.5 s plus 60 ms per character, between 3 and 11 s (140 characters ≈ 10.9 s)
export function chatReadingMs(text: string) {
  return clamp(2500 + 60 * [...text].length, 3000, 11000)
}

// one line, no repeated spaces, at most CHAT_MAX characters (counting emoji as one)
export function cleanChatText(raw: string) {
  return [...raw.replace(/\s+/g, ' ').trim()].slice(0, CHAT_MAX).join('')
}

let messages: ChickenChatMessage[] = []
let history: ChickenChatLine[] = []
const listeners = new Set<() => void>()
let transport: ((msg: ChickenChatMessage) => void) | null = null
let seq = 0

const emit = () => listeners.forEach(fn => fn())

export function subscribeChickenChat(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// the bubbles still on screen at `now`, the latest of each player
export function getChickenChats(now = Date.now()) {
  return messages.filter(m => m.until > now)
}

function put(msg: ChickenChatMessage) {
  messages = [...messages.filter(m => m.player !== msg.player && m.until > msg.at), msg]
  history = [...history, { id: msg.id, player: msg.player, name: msg.name || msg.player, text: msg.text, at: msg.at }].slice(-CHAT_HISTORY_MAX)
  emit()
}

export const getChickenChatHistory = () => history

// sends a message from a player on this screen; returns it, or null when there is nothing to say
export function sendChickenChat(text: string, player = LOCAL_CHAT_PLAYER, name?: string): ChickenChatMessage | null {
  const clean = cleanChatText(text)
  if (!clean) return null
  const at = Date.now()
  const msg = { id: `${player}-${at}-${++seq}`, player, text: clean, at, until: at + chatReadingMs(clean), name }
  put(msg)
  try { transport?.(msg) } catch { /* online is optional */ }
  return msg
}

// a message that arrived from another screen (online); the reading time is counted from its arrival here
export function receiveChickenChat(msg: { player: string; text: string; name?: string }) {
  const clean = cleanChatText(msg.text)
  if (!clean || !msg.player) return
  const at = Date.now()
  put({ id: `${msg.player}-${at}-${++seq}`, player: msg.player, text: clean, at, until: at + chatReadingMs(clean), name: msg.name })
}

// the online layer sends each local message through this (null: offline, messages stay on this screen)
export function setChickenChatTransport(fn: ((msg: ChickenChatMessage) => void) | null) {
  transport = fn
}

export function clearChickenChat() {
  messages = []
  history = []
  emit()
}
