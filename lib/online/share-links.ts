// The Invite a friend panel of the match header: the link to a 1v1 lobby and where each app button sends it.
// Docs: docs/mechanics/online/lobby.md (Invite a friend na partida).
import { msg } from "../i18n"

export type ShareApp = 'whatsapp' | 'discord' | 'instagram' | 'tiktok' | 'facebook' | 'x'

export const SHARE_APPS: readonly { id: ShareApp; label: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'discord', label: 'Discord' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X' },
]

export const LOBBY_INVITE_TEXT: string = msg('Bora jogar ChickenChess comigo?')

/** The link that admits a visitor straight into the lobby (the same as Copy invite in the lobby itself). */
export function lobbyInviteLink(code: string, origin = ''): string {
  return `${origin}/?room=${encodeURIComponent(code)}`
}

/** Where an app's button leads. The apps with a share page on the web receive the link in it; the others have none,
 * so the link is copied first and the button opens the app's messages, where it is pasted. */
export function shareAppTarget(app: ShareApp, link: string, text = LOBBY_INVITE_TEXT): { href: string; copyFirst: boolean } {
  const enc = encodeURIComponent
  switch (app) {
    case 'whatsapp': return { href: `https://wa.me/?text=${enc(`${text} ${link}`)}`, copyFirst: false }
    case 'facebook': return { href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`, copyFirst: false }
    case 'x': return { href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}`, copyFirst: false }
    case 'discord': return { href: 'https://discord.com/channels/@me', copyFirst: true }
    case 'instagram': return { href: 'https://www.instagram.com/direct/inbox/', copyFirst: true }
    case 'tiktok': return { href: 'https://www.tiktok.com/messages', copyFirst: true }
  }
}
