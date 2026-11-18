// Profile code: 9 numeric digits in registration order (000000001 is the admin account "jéjé").
// Accounts from before the numbering keep their old 16-character code as an alternative for adding friends.

export const PROFILE_CODE_DIGITS = 9

/** What the person typed, in the stored form when it is a profile code: "1" becomes 000000001. */
export function normalizeProfileCodeQuery(query: string): string {
  const trimmed = query.trim()
  if (/^[0-9]{1,9}$/.test(trimmed)) return trimmed.padStart(PROFILE_CODE_DIGITS, '0')
  return trimmed.toUpperCase()
}

/** Whether a typed query names this profile code ("12" finds 000000012). */
export function profileCodeMatches(code: string, query: string): boolean {
  return code.toUpperCase() === normalizeProfileCodeQuery(query)
}

/** Hidden friends are stored by account id. Lists from before that stored the profile code: an entry that still
 * matches a friend's code becomes that friend's id. Returns the same set when nothing changed. */
export function migrateHiddenFriendKeys(hidden: Set<string>, profiles: { id: string; code: string }[]): Set<string> {
  let next = hidden
  for (const profile of profiles) {
    const code = profile.code.toUpperCase()
    if (!hidden.has(code)) continue
    if (next === hidden) next = new Set(hidden)
    next.delete(code)
    next.add(profile.id)
  }
  return next
}

/** A friend is hidden by account id, or by a code entry not yet migrated. */
export function isHiddenFriend(hidden: Set<string>, profile: { id: string; code: string }): boolean {
  return hidden.has(profile.id) || hidden.has(profile.code.toUpperCase())
}
