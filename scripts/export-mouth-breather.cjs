/* global __dirname */
// Export the score from the migrated MIDI preset; the JSON is the source of truth.
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
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file)
  return mod.exports
}
const { creativeSchema, creativeSnapshot } = load(path.join(root, 'lib/music/creative.ts'))
const { renderMusicCode } = load(path.join(root, 'lib/music/code-export.ts'))
const dest = path.join(root, 'public/presets')
const kit = creativeSchema.parse(JSON.parse(fs.readFileSync(path.join(dest, 'mouth-breather.json'), 'utf8')))
const code = renderMusicCode(creativeSnapshot(kit, true), null)
fs.writeFileSync(path.join(dest, 'mouth-breather.strudel'), '// Mouth Breather — The Jesus Lizard; arrangement study from user-supplied script by eefano.\n// Exported from the schema-7 MIDI preset and global arrangement. Serve /samples from this project when running this score.\n' + code + '\n')
