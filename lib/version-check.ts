import { RELEASE_LABEL } from './release'
import { BUILD_ID } from './build-id'

/* global fetch */

export const VERSION_ENDPOINT = '/version.json'
export const VERSION_CHECK_INTERVAL_MS = 60_000

export interface ReleaseVersionPayload {
  version: string
  // the deploy (lib/build-id.ts); absent on deploys made before it existed
  build?: string
}
export interface PublishedRelease {
  version: string
  build: string
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

// A newer version number, or the same number from another deploy (both builds known). An older number never is.
export function isNewReleaseAvailable(currentVersion: unknown, currentBuild: string, remote: PublishedRelease): boolean {
  const comparison = compareReleaseVersions(remote.version, currentVersion)
  if (comparison === null) return false
  if (comparison > 0) return true
  return comparison === 0 && !!currentBuild && !!remote.build && remote.build !== currentBuild
}

export async function fetchPublishedRelease(
  fetchImpl: typeof fetch = fetch,
  endpoint: string = VERSION_ENDPOINT,
): Promise<PublishedRelease | null> {
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
    return { version: `v${parsed[0]}.${parsed[1]}.${parsed[2]}`, build: typeof payload.build === 'string' ? payload.build : '' }
  } catch {
    return null
  }
}

export async function fetchPublishedReleaseVersion(
  fetchImpl: typeof fetch = fetch,
  endpoint: string = VERSION_ENDPOINT,
): Promise<string | null> {
  return (await fetchPublishedRelease(fetchImpl, endpoint))?.version ?? null
}

// the published version when there is a newer release (or another deploy of the same version), else null
export async function checkForNewReleaseVersion(
  currentVersion: string = RELEASE_LABEL,
  fetchImpl: typeof fetch = fetch,
  currentBuild: string = BUILD_ID,
): Promise<string | null> {
  const remote = await fetchPublishedRelease(fetchImpl)
  if (!remote) return null
  return isNewReleaseAvailable(currentVersion, currentBuild, remote) ? remote.version : null
}
