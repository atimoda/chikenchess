const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')
const packageJson = require('../../package.json')
const packageLock = require('../../package-lock.json')
const { RELEASE_LABEL, CHANGELOG } = loadTs('lib/changelog.ts')
const {
  parseReleaseVersion,
  compareReleaseVersions,
  isNewVersionAvailable,
  fetchPublishedReleaseVersion,
  checkForNewReleaseVersion,
} = loadTs('lib/version-check.ts')
const { GET: getVersionRoute } = loadTs('app/version.json/route.ts')

test('package, lockfile and visible changelog publish the same current version', () => {
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/)
  assert.equal(packageLock.version, packageJson.version)
  assert.equal(packageLock.packages[''].version, packageJson.version)
  assert.equal(RELEASE_LABEL, `v${packageJson.version}`)
  assert.equal(CHANGELOG[0].version, packageJson.version)
  assert.match(CHANGELOG[0].date, /^\d{2}\/\d{2}\/\d{4}$/)
  assert.ok(CHANGELOG[0].groups.some(group => group.items.length > 0))
})

test('release history contains at most one version entry per date', () => {
  const dates = CHANGELOG.map(entry => entry.date || 'undated')
  assert.equal(new Set(dates).size, dates.length)
  const versions = CHANGELOG.map(entry => entry.version)
  assert.equal(new Set(versions).size, versions.length)
})

test('version.json route publishes current RELEASE_LABEL with no-store cache headers', async () => {
  const response = getVersionRoute()
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control') || '', /no-store/)
  const payload = await response.json()
  assert.deepEqual(payload, { version: RELEASE_LABEL })
})

test('version check detects only newer semantic versions and handles fetch errors gracefully', async () => {
  assert.deepEqual(parseReleaseVersion('v1.6.4'), [1, 6, 4])
  assert.deepEqual(parseReleaseVersion('1.6.4'), [1, 6, 4])
  assert.equal(parseReleaseVersion('invalid'), null)

  assert.equal(compareReleaseVersions('v1.6.4', 'v1.6.3'), 1)
  assert.equal(compareReleaseVersions('v1.6.3', 'v1.6.3'), 0)
  assert.equal(compareReleaseVersions('v1.6.2', 'v1.6.3'), -1)
  assert.equal(isNewVersionAvailable('v1.6.3', 'v1.6.4'), true)
  assert.equal(isNewVersionAvailable('v1.6.4', 'v1.6.4'), false)
  assert.equal(isNewVersionAvailable('v1.6.4', 'v1.6.3'), false)

  const newer = await checkForNewReleaseVersion('v1.6.3', async () => ({
    ok: true,
    json: async () => ({ version: 'v1.6.4' }),
  }))
  assert.equal(newer, 'v1.6.4')

  const same = await checkForNewReleaseVersion('v1.6.4', async () => ({
    ok: true,
    json: async () => ({ version: 'v1.6.4' }),
  }))
  assert.equal(same, null)

  const failed = await fetchPublishedReleaseVersion(async () => {
    throw new Error('network error')
  })
  assert.equal(failed, null)
})
