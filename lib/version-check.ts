import { RELEASE_LABEL } from './changelog'

/* global fetch */

export const VERSION_ENDPOINT = '/version.json'
export const VERSION_CHECK_INTERVAL_MS = 60_000

export interface ReleaseVersionPayload {
  version: string
}

export function parseReleaseVersion(value: unknown): [number, number, number] | null {
  if (typeof value !== 'string') return null
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim())
  if (!match) return null
  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) return null
  return [major, minor, patch]
}

export function compareReleaseVersions(left: unknown, right: unknown): number | null {
  const a = parseReleaseVersion(left)
  const b = parseReleaseVersion(right)
  if (!a || !b) return null
  if (a[0] !== b[0]) return a[0] > b[0] ? 1 : -1
  if (a[1] !== b[1]) return a[1] > b[1] ? 1 : -1
  if (a[2] !== b[2]) return a[2] > b[2] ? 1 : -1
  return 0
}

export function isNewVersionAvailable(currentVersion: unknown, remoteVersion: unknown): boolean {
  const comparison = compareReleaseVersions(remoteVersion, currentVersion)
  return comparison !== null && comparison > 0
}

export async function fetchPublishedReleaseVersion(
  fetchImpl: typeof fetch = fetch,
  endpoint: string = VERSION_ENDPOINT,
): Promise<string | null> {
  try {
    const separator = endpoint.includes('?') ? '&' : '?'
    const response = await fetchImpl(`${endpoint}${separator}t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
    if (!response.ok) return null
    const payload = (await response.json()) as Partial<ReleaseVersionPayload> | null
    if (!payload || typeof payload.version !== 'string') return null
    const parsed = parseReleaseVersion(payload.version)
    if (!parsed) return null
    return `v${parsed[0]}.${parsed[1]}.${parsed[2]}`
  } catch {
    return null
  }
}

export async function checkForNewReleaseVersion(
  currentVersion: string = RELEASE_LABEL,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const remoteVersion = await fetchPublishedReleaseVersion(fetchImpl)
  if (!remoteVersion) return null
  return isNewVersionAvailable(currentVersion, remoteVersion) ? remoteVersion : null
}
