/* global localStorage */
// Friend invites (lib/online/invites.ts): where an invite leads, its notice, which ones are announced and the errors.
// The SQL side (friendship check, one per pair, 10 minutes) is in supabase/tests/invites.test.cjs.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')

const {
  INVITE_TTL_MS, freshInvites, inviteErrorMessage, inviteHref, inviteKey, inviteMessage, inviteMissing,
  loadSeenInvites, patioInviteLink, saveSeenInvites,
} = loadTs('lib/online/invites.ts')

const PATIO = '0f8fad5b-d9cb-469f-a165-70867728950e'
const invite = (over = {}) => ({ sender_id: 'u1', name: 'Titi', kind: 'patio', patio_id: PATIO, patio_name: 'Campo minado', room: 'aB3_x-9', created_at: '2026-11-18T17:00:00.000Z', ...over })

test('a Pátio invite leads to the Pátio and its live room; the default Pátio has no lobby id', () => {
  assert.equal(inviteHref(invite(), 'https://c.app'), `https://c.app/patio?lobby=${PATIO}&room=aB3_x-9`)
  assert.equal(inviteHref(invite({ patio_id: null, room: null })), '/patio')
  assert.equal(patioInviteLink(null, 'r1'), '/patio?room=r1')
  // a room id the server would refuse is left out of the link
  assert.equal(patioInviteLink(PATIO, 'bad room!'), `/patio?lobby=${PATIO}`)
})

test('a chess lobby invite leads to the globe with the room code', () => {
  assert.equal(inviteHref(invite({ kind: 'room', patio_id: null, room: 'ABC123' }), 'https://c.app'), 'https://c.app/?room=ABC123')
})

test('the notice names who called and the Pátio', () => {
  assert.equal(inviteMessage(invite()), 'Titi chamou você para o Pátio “Campo minado”.')
  assert.equal(inviteMessage(invite({ patio_name: null })), 'Titi chamou você para o Pátio.')
  assert.equal(inviteMessage(invite({ kind: 'room' })), 'Titi chamou você para um lobby 1v1.')
  assert.equal(inviteMessage(invite({ name: '  ' })), 'Um amigo chamou você para o Pátio “Campo minado”.')
})

test('only invites not seen on this browser and younger than 10 minutes are announced', () => {
  const now = Date.parse('2026-11-18T17:05:00.000Z')
  const a = invite(), b = invite({ sender_id: 'u2' }), old = invite({ sender_id: 'u3', created_at: new Date(now - INVITE_TTL_MS - 1).toISOString() })
  assert.deepEqual(freshInvites([a, b, old], new Set([inviteKey(a)]), now), [b])
  // the same friend calling again is a new invite (a new created_at)
  const again = invite({ created_at: '2026-11-18T17:04:00.000Z' })
  assert.deepEqual(freshInvites([again], new Set([inviteKey(a)]), now), [again])
  assert.deepEqual(freshInvites([invite({ created_at: 'nope' })], new Set(), now), [])
})

test('the seen invites are kept per account, the latest 50', () => {
  const memory = new Map()
  globalThis.localStorage = { getItem: k => (memory.has(k) ? memory.get(k) : null), setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) }
  try {
    saveSeenInvites('me', new Set(Array.from({ length: 60 }, (_, i) => `k${i}`)))
    const seen = loadSeenInvites('me')
    assert.equal(seen.size, 50)
    assert.ok(seen.has('k59') && !seen.has('k0'))
    assert.equal(loadSeenInvites('other').size, 0)
    localStorage.setItem('chickenchess:online:seen-invites:me', '{broken')
    assert.equal(loadSeenInvites('me').size, 0)
  } finally { delete globalThis.localStorage }
})

test('server errors become the player\'s words; a server without the migration is told apart', () => {
  assert.equal(inviteErrorMessage({ message: 'FRIEND_NOT_FOUND' }), 'Só dá para chamar amigos aceitos.')
  assert.match(inviteErrorMessage({ message: 'INVITE_TOO_SOON' }), /Espere alguns segundos/)
  assert.match(inviteErrorMessage({ message: 'UNAUTHORIZED' }), /Entre na sua conta/)
  assert.ok(inviteMissing({ code: 'PGRST202', message: 'Could not find the function public.online_invite' }))
  assert.ok(!inviteMissing({ code: 'P0002', message: 'FRIEND_NOT_FOUND' }))
  assert.equal(inviteErrorMessage({ code: 'PGRST202' }), 'O convite ainda não chegou a este servidor.')
})

// Invite a friend in the match header (lib/online/share-links.ts): the lobby link and where each app button leads.
const { SHARE_APPS, LOBBY_INVITE_TEXT, lobbyInviteLink, shareAppTarget } = loadTs('lib/online/share-links.ts')

test('the match invite link enters the lobby like Copy invite and the invite notice', () => {
  assert.equal(lobbyInviteLink('12345', 'https://c.app'), 'https://c.app/?room=12345')
  assert.equal(lobbyInviteLink('12345', 'https://c.app'), inviteHref(invite({ kind: 'room', patio_id: null, room: '12345' }), 'https://c.app'))
})

test('apps with a web share page get the link in it; the others copy it and open their messages', () => {
  assert.deepEqual(SHARE_APPS.map(app => app.id), ['whatsapp', 'discord', 'instagram', 'tiktok', 'facebook', 'x'])
  const link = 'https://c.app/?room=12345'
  const whatsapp = shareAppTarget('whatsapp', link)
  assert.equal(whatsapp.copyFirst, false)
  assert.equal(new URL(whatsapp.href).searchParams.get('text'), `${LOBBY_INVITE_TEXT} ${link}`)
  assert.equal(new URL(shareAppTarget('facebook', link).href).searchParams.get('u'), link)
  assert.equal(new URL(shareAppTarget('x', link).href).searchParams.get('url'), link)
  for (const app of ['discord', 'instagram', 'tiktok']) {
    const target = shareAppTarget(app, link)
    assert.equal(target.copyFirst, true)
    assert.ok(!target.href.includes('12345'))
  }
})
