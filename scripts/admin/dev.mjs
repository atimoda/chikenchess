import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadAdminCatalog } from './load-catalog.mjs'
import { createAdminFileService } from './file-service.mjs'
import { generateNamesMigration } from './names-migration.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
nextEnv.loadEnvConfig(root, true)
const arguments_ = process.argv.slice(2)
const portIndex = arguments_.findIndex(argument => argument === '--port' || argument === '-p')
const port = Number(portIndex >= 0 ? arguments_[portIndex + 1] : 3010)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Porta inválida. Use --port 3010.')
const origin = `http://localhost:${port}`
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Configure as variáveis públicas do Supabase em .env.local para verificar o acesso admin.')
const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const { ADMIN_ENTRIES, validateAdminValue, adminValidationMessage, isAdminUser } = await loadAdminCatalog(root)
const service = createAdminFileService({
  root, origin, entries: ADMIN_ENTRIES,
  authenticate: async bearer => {
    const { data, error } = await auth.auth.getUser(bearer)
    return !error && isAdminUser(data.user)
  },
  validate: (entry, value) => {
    try { validateAdminValue(entry, value) }
    catch (cause) { const error = new Error('Invalid catalog'); error.status = 422; error.publicMessage = adminValidationMessage(cause); throw error }
  },
  operations: {
    '/names-migration': () => generateNamesMigration(root, value => validateAdminValue(ADMIN_ENTRIES.find(entry => entry.kind === 'names'), value)),
    '/validate': ({ id, value }) => {
      const entry = ADMIN_ENTRIES.find(item => item.id === id)
      if (!entry) throw new Error('Unknown catalog')
      try { validateAdminValue(entry, value); return { valid: true } }
      catch (error) { return { valid: false, error: adminValidationMessage(error) } }
    },
  },
})
await new Promise((resolveListen, reject) => { service.once('error', reject); service.listen(0, '127.0.0.1', resolveListen) })
const address = service.address()
const nextPackage = JSON.parse(await readFile(resolve(root, 'node_modules/next/package.json'), 'utf8'))
const next = spawn(process.execPath, [resolve(root, 'node_modules/next', nextPackage.bin.next), 'dev', '--hostname', 'localhost', '--port', String(port)], {
  cwd: root, stdio: 'inherit', env: { ...process.env, CHICKENCHESS_ADMIN_SERVICE_URL: `http://127.0.0.1:${address.port}`, CHICKENCHESS_NEXT_BUILD_DIR: '.artifacts/admin/next' },
})
console.log(`Admin local: ${origin}/admin · salvamento no projeto habilitado.`)
let stopping = false
function stop() { if (stopping) return; stopping = true; next.kill('SIGTERM'); service.close(); service.closeAllConnections() }
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
next.once('error', error => { console.error(error.message); stop(); process.exitCode = 1 })
next.once('exit', code => { service.close(); service.closeAllConnections(); process.exitCode = code || 0 })
