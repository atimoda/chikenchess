// Sets part gains in a stage script: node scripts/brazilian/regain.cjs <stage> a1=.6 c2=.37 ...
// Each value replaces the first `gain:` after the part's P('<slot>' line, so the script stays the one source.
const fs = require('node:fs')
const path = require('node:path')
const [stage, ...pairs] = process.argv.slice(2)
const file = path.join(__dirname, `${stage}.cjs`)
let text = fs.readFileSync(file, 'utf8')
for (const pair of pairs) {
  const [slot, value] = pair.split('=')
  const at = text.indexOf(`P('${slot}'`)
  if (at < 0) throw new Error(`no part ${slot}`)
  const match = /gain: [0-9.]+/.exec(text.slice(at))
  text = text.slice(0, at + match.index) + `gain: ${value}` + text.slice(at + match.index + match[0].length)
}
fs.writeFileSync(file, text)
