import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export async function loadAdminCatalog(root) {
  const directory = resolve(root, '.artifacts/admin')
  await mkdir(directory, { recursive: true })
  const outfile = resolve(directory, 'catalog.cjs')
  await build({ stdin: { contents: "export { ADMIN_ENTRIES } from './lib/admin/catalog'; export { validateAdminValue, adminValidationMessage, validateOfficialKit } from './lib/admin/validation'; export { isAdminUser } from './lib/admin/access';", resolveDir: root, sourcefile: 'admin-catalog.ts' }, outfile, bundle: true, platform: 'node', format: 'cjs', target: 'node20', logLevel: 'silent', packages: 'external' })
  const imported = await import(pathToFileURL(outfile).href)
  return imported.default
}
