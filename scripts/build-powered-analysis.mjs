import { build } from 'esbuild'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await build({
  entryPoints: [resolve(root, 'lib/powered-analysis.worker.ts')],
  outfile: resolve(root, 'public/engine/powered-analysis.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
})
process.stdout.write('Built public/engine/powered-analysis.js\n')
