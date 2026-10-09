import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const namesDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export async function latestNamesMigration(root) {
  const directory = join(root, 'supabase/migrations')
  const files = (await readdir(directory)).filter(file => /_baptism_catalog_json\.sql$/.test(file)).sort()
  const file = files.at(-1)
  return file ? { path: `supabase/migrations/${file}`, sql: await readFile(join(directory, file), 'utf8') } : null
}

async function generateNamesMigrationUnlocked(root, validate) {
  const value = JSON.parse(await readFile(join(root, 'data/ui/baptism-names.json'), 'utf8'))
  validate(value)
  const digest = namesDigest(value)
  const previous = await latestNamesMigration(root)
  if (previous?.sql.includes(`source-sha256: ${digest}`)) return { path: previous.path, unchanged: true }
  const directory = join(root, 'supabase/migrations')
  const files = (await readdir(directory)).filter(file => /^\d+.*\.sql$/.test(file)).sort()
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()).replaceAll('-', '')
  const last = files.at(-1)?.match(/^\d+/)?.[0] ?? `${today}0000`
  const number = (BigInt(last) >= BigInt(`${today}0001`) ? BigInt(last) + 1n : BigInt(`${today}0001`)).toString()
  const filename = `${number}_baptism_catalog_json.sql`
  const quote = text => `'${text.replaceAll("'", "''")}'`
  const rows = Object.entries(value).flatMap(([category, words]) => words.map(word => `  (${quote(category)}, ${quote(word)})`)).join(',\n')
  const sql = `-- Generated from data/ui/baptism-names.json. Do not edit this snapshot.\n-- source-sha256: ${digest}\n-- Updates future account names; existing baptismal names remain immutable.\ndelete from online_private.baptism_name_words;\ninsert into online_private.baptism_name_words(category, word) values\n${rows};\n`
  await writeFile(join(directory, filename), sql, { flag: 'wx' })
  return { path: `supabase/migrations/${filename}`, unchanged: false }
}

const pending = new Map()
export function generateNamesMigration(root, validate) {
  const previous = pending.get(root) || Promise.resolve()
  const next = previous.catch(() => {}).then(() => generateNamesMigrationUnlocked(root, validate))
  const tracked = next.finally(() => { if (pending.get(root) === tracked) pending.delete(root) })
  tracked.catch(() => {})
  pending.set(root, tracked)
  return next
}
