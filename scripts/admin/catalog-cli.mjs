import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAdminCatalog } from './load-catalog.mjs'
import { generateNamesMigration, latestNamesMigration, namesDigest } from './names-migration.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const { ADMIN_ENTRIES, validateAdminValue, adminValidationMessage } = await loadAdminCatalog(root)
const namesEntry = ADMIN_ENTRIES.find(entry => entry.kind === 'names')
try {
  if (process.argv.includes('--names')) {
    console.log(await generateNamesMigration(root, value => validateAdminValue(namesEntry, value)))
  } else {
    for (const entry of ADMIN_ENTRIES) {
      try { validateAdminValue(entry, JSON.parse(await readFile(resolve(root, entry.path), 'utf8'))) }
      catch (error) { throw new Error(`${entry.path}: ${adminValidationMessage(error)}`) }
    }
    const names = JSON.parse(await readFile(resolve(root, namesEntry.path), 'utf8'))
    const migration = await latestNamesMigration(root)
    if (!migration?.sql.includes(`source-sha256: ${namesDigest(names)}`)) throw new Error('O catálogo de nomes mudou. Execute npm run admin:names antes de publicar.')
    console.log(`${ADMIN_ENTRIES.length} catálogos válidos; nomes sincronizados com a migração.`)
  }
} catch (error) {
  console.error(adminValidationMessage(error))
  process.exitCode = 1
}
