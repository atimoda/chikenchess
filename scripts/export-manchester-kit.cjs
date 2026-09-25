// Rebuild the portable kit and its Strudel score from the game's source of truth.
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..'), cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const mod = new Module(file, module)
  cache.set(file, mod)
  mod.filename = file
  mod.paths = module.paths
  const original = mod.require.bind(mod)
  mod.require = name => {
    const relative = path.resolve(path.dirname(file), `${name}.ts`)
    return name.startsWith('.') && fs.existsSync(relative) ? load(relative) : original(name)
  }
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file)
  return mod.exports
}
const kit = load(path.join(root, 'lib/music/city-kits.ts')).defaultCityKit('manchester-1999')
const snapshot = load(path.join(root, 'lib/music/creative.ts')).creativeSnapshot(kit, true)
const code = load(path.join(root, 'lib/music/runtime.ts')).renderMusicCode(snapshot, null)
const dest = path.join(root, 'public/presets')
fs.mkdirSync(dest, { recursive: true })
fs.writeFileSync(path.join(dest, 'manchester-1999.json'), JSON.stringify(kit, null, 2) + '\n')
fs.writeFileSync(path.join(dest, 'manchester-1999.strudel'), '// Northern Jazz Breaks — original ChickenChess arrangement inspired by Get a Move On!\n// Samples are original synthesis. Serve /samples from this project when running this score.\n// 16 white voices; 123 BPM; G Dorian; A4 / B6 / C3 / D6 bars.\n' + code + '\n')
