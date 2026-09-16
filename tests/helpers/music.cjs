const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Module = require('node:module')
const moduleCache = new Map()

// Compile the pure domain modules without loading browser/audio dependencies.
function loadTs(relative) {
  const file = path.resolve(__dirname, '..', '..', relative)
  if (moduleCache.has(file)) return moduleCache.get(file).exports
  const mod = new Module(file, module)
  moduleCache.set(file, mod)
  mod.filename = file
  mod.paths = module.paths
  const original = mod.require.bind(mod)
  mod.require = name => name === '../performance' ? { isConstrainedDevice: () => false } : name.startsWith('.') && fs.existsSync(path.resolve(path.dirname(file), name + '.ts')) ? loadTs(path.relative(path.resolve(__dirname, '..', '..'), path.resolve(path.dirname(file), name + '.ts'))) : original(name)
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file)
  return mod.exports
}

let realStrudel
async function strudel() {
  if (!realStrudel) {
    // Only the bundle's DOM event listeners are stubbed. Pattern parsing,
    // composition, timeline selection and event queries use the shipped ESM.
    const previousWindow = globalThis.window, previousDocument = globalThis.document
    globalThis.window = { addEventListener() {}, removeEventListener() {} }
    globalThis.document = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }
    try { realStrudel = await import('@strudel/web/dist/index.mjs'); realStrudel.miniAllStrings() }
    finally {
      if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow
      if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument
    }
  }
  return realStrudel
}

module.exports = { loadTs, strudel }

