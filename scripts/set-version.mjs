#!/usr/bin/env node
// Sets the release version everywhere it lives, in one step:
//   package.json, package-lock.json (root and main package), lib/release.ts and the top entry of lib/changelog.ts.
// Usage: npm run version:set -- 2.3.0 [--date 08/11/2026]
// If the changelog's top entry already has that date, its number is replaced (same-day rule in AGENTS.md).
// Otherwise a new top entry is added with an empty title and group, to be written by hand.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const version = args.find(a => /^\d+\.\d+\.\d+$/.test(a))
const di = args.indexOf('--date')
const now = new Date()
const date = di >= 0 ? args[di + 1] : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
if (!version || !/^\d{2}\/\d{2}\/\d{4}$/.test(date || '')) {
  console.error('Usage: npm run version:set -- <major.minor.patch> [--date DD/MM/YYYY]')
  process.exit(1)
}

const file = rel => path.join(root, rel)
const editJson = (rel, edit) => {
  const data = JSON.parse(fs.readFileSync(file(rel), 'utf8'))
  edit(data)
  fs.writeFileSync(file(rel), JSON.stringify(data, null, 2) + '\n')
}
editJson('package.json', p => { p.version = version })
editJson('package-lock.json', p => { p.version = version; if (p.packages?.['']) p.packages[''].version = version })

const release = file('lib/release.ts')
fs.writeFileSync(release, fs.readFileSync(release, 'utf8').replace(/RELEASE_LABEL = '[^']*'/, `RELEASE_LABEL = 'v${version}'`))

const changelog = file('lib/changelog.ts')
let src = fs.readFileSync(changelog, 'utf8')
const top = src.match(/const RECENT = \[\n  \{\n    version: '([^']*)',\n    date: '([^']*)',/)
if (!top) { console.error('Could not find the top entry of lib/changelog.ts'); process.exit(1) }
if (top[2] === date) {
  src = src.replace(top[0], top[0].replace(`version: '${top[1]}'`, `version: '${version}'`))
  console.log(`Top changelog entry (${date}) renumbered ${top[1]} -> ${version}`)
} else {
  src = src.replace('const RECENT = [\n', `const RECENT = [\n  {\n    version: '${version}',\n    date: '${date}',\n    title: '',\n    groups: [\n      { title: '', items: [\n      ] },\n    ],\n  },\n`)
  console.log(`New changelog entry ${version} (${date}) added at the top: fill in its title and items`)
}
fs.writeFileSync(changelog, src)
console.log(`Version set to ${version} in package.json, package-lock.json and lib/release.ts`)
