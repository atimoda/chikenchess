const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { loadTs } = require('./helpers/music.cjs')

const root = path.resolve(__dirname, '..')

test('every translated text has the eight languages and the catalogs are up to date', () => {
  const run = spawnSync(process.execPath, ['scripts/i18n-build.mjs', '--check'], { cwd: root, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr || run.stdout)
})

test('t fills values and falls back to the source text', () => {
  const i18n = loadTs('lib/i18n.ts')
  const state = { locale: 'en', catalog: { 'Limitar a {n} FPS': 'Limit to {n} FPS' } }
  assert.equal(i18n.translate(state, 'Limitar a {n} FPS', { n: 30 }), 'Limit to 30 FPS')
  assert.equal(i18n.translate(state, 'Sem tradução'), 'Sem tradução')
  assert.equal(i18n.t('Idioma'), 'Idioma')
  assert.equal(i18n.msg('Pulo'), 'Pulo')
})

test('the browser language picks one of the eight, English otherwise', () => {
  const { detectLocale, LOCALE_IDS } = loadTs('lib/i18n.ts')
  assert.deepEqual([...LOCALE_IDS].sort(), ['en', 'es', 'fr', 'hi', 'ja', 'pt', 'ru', 'zh'])
  assert.equal(detectLocale(['pt-BR', 'en']), 'pt')
  assert.equal(detectLocale(['zh-CN']), 'zh')
  assert.equal(detectLocale(['de-DE', 'ja']), 'ja')
  assert.equal(detectLocale(['de-DE']), 'en')
})
