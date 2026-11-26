#!/usr/bin/env node
// Game languages: validates lib/locales/messages/*.json against the texts the code marks with t(), tx(), t.x() or msg(),
// then writes one catalog per language in lib/locales/generated/ (only the keys whose translation differs from the key).
//
//   node scripts/i18n-build.mjs                 validate and write the catalogs
//   node scripts/i18n-build.mjs --check         validate and fail if the catalogs are out of date (used by the tests)
//   node scripts/i18n-build.mjs --check --only components/online,lib/online
//                                               only the keys used under these paths must have entries (no orphan/up-to-date check)
//   node scripts/i18n-build.mjs --missing --only components/online   lists the missing keys as a JSON object to fill
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const LOCALES = ["pt", "en", "es", "zh", "hi", "ja", "ru", "fr"]
const MESSAGES = path.join(ROOT, "lib/locales/messages")
const GENERATED = path.join(ROOT, "lib/locales/generated")
const SCAN_DIRS = ["app", "components", "hooks", "lib"]
const CALLS = new Set(["t", "tr", "tx", "msg"])
// Texts kept in data files and shown with t(value): every string value is a key (except these fields).
const DATA_SOURCES = ["data/ui/city-descriptions.json", "data/ui/city-intros.json", "data/ui/campaigns.json", "data/ui/match-tips.json",
  "data/ui/move-messages.json", "data/ui/opening-phrases.json", "data/ui/rank-titles.json"]
const DATA_SKIP_FIELDS = new Set(["id", "kind"])

const args = process.argv.slice(2)
const check = args.includes("--check")
const missingMode = args.includes("--missing")
const onlyArg = args.indexOf("--only")
// --only a,b or --only @list.txt (one path per line)
const onlyValue = onlyArg >= 0 ? args[onlyArg + 1] ?? "" : null
const only = onlyValue === null ? null
  : (onlyValue.startsWith("@") ? fs.readFileSync(onlyValue.slice(1), "utf8").split(/\r?\n/) : onlyValue.split(",")).map(s => s.trim().replace(/\/$/, "")).filter(Boolean)

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(full)
  }
  return out
}

/** The literal texts an argument can be: "a", cond ? "a" : "b", x ?? "a", ({ k: "a" })[key], ["a", "b"][i]. */
function literals(node) {
  if (!node) return []
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node]
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return literals(node.expression)
  if (ts.isConditionalExpression(node)) return [...literals(node.whenTrue), ...literals(node.whenFalse)]
  if (ts.isBinaryExpression(node) && ["??", "||", "&&"].includes(node.operatorToken.getText())) return [...literals(node.left), ...literals(node.right)]
  if (ts.isElementAccessExpression(node)) {
    const table = ts.isParenthesizedExpression(node.expression) ? node.expression.expression : node.expression
    if (ts.isObjectLiteralExpression(table)) return table.properties.flatMap(p => ts.isPropertyAssignment(p) ? literals(p.initializer) : [])
    if (ts.isArrayLiteralExpression(table)) return table.elements.flatMap(literals)
  }
  return []
}

/** Every literal key the code translates, with where it is used. */
export function scanKeys() {
  const keys = new Map()
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir)
    if (!fs.existsSync(abs)) continue
    for (const file of walk(abs)) {
      const rel = path.relative(ROOT, file)
      if (rel.startsWith("lib/locales/") || rel === "lib/i18n.ts") continue
      const text = fs.readFileSync(file, "utf8")
      if (!/\b(t|tr|tx|msg)\s*\(|\bt\.x\s*\(/.test(text)) continue
      const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      const visit = node => {
        if (ts.isCallExpression(node) && node.arguments.length) {
          const callee = node.expression
          const named = ts.isIdentifier(callee) ? CALLS.has(callee.text)
            : ts.isPropertyAccessExpression(callee) && callee.name.text === "x" && ts.isIdentifier(callee.expression) && callee.expression.text === "t"
          if (named) for (const lit of literals(node.arguments[0]).filter(l => l.text.trim())) {
            const line = sf.getLineAndCharacterOfPosition(lit.getStart()).line + 1
            if (!keys.has(lit.text)) keys.set(lit.text, [])
            keys.get(lit.text).push(`${rel}:${line}`)
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(sf)
    }
  }
  for (const rel of DATA_SOURCES) {
    const file = path.join(ROOT, rel)
    if (!fs.existsSync(file)) continue
    const add = (value, field) => {
      if (typeof value === "string") {
        if (DATA_SKIP_FIELDS.has(field) || !value.trim()) return
        if (!keys.has(value)) keys.set(value, [])
        keys.get(value).push(rel)
      } else if (Array.isArray(value)) value.forEach(v => add(v, field))
      else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) add(v, k)
    }
    add(JSON.parse(fs.readFileSync(file, "utf8")), "")
  }
  return keys
}

const placeholders = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(",")

function loadMessages(errors, conflicts) {
  const merged = new Map()
  const owner = new Map()
  if (!fs.existsSync(MESSAGES)) return merged
  for (const name of fs.readdirSync(MESSAGES).filter(n => n.endsWith(".json")).sort()) {
    let data
    try { data = JSON.parse(fs.readFileSync(path.join(MESSAGES, name), "utf8")) }
    catch (error) { errors.push(`${name}: invalid JSON (${error.message})`); continue }
    for (const [key, entry] of Object.entries(data)) {
      const where = `${name} ${JSON.stringify(key).slice(0, 80)}`
      if (!entry || typeof entry !== "object") { errors.push(`${where}: entry must be an object with the 8 languages`); continue }
      const want = placeholders(key)
      for (const locale of LOCALES) {
        const value = entry[locale]
        if (typeof value !== "string" || (!value.trim() && key.trim())) errors.push(`${where}: missing "${locale}"`)
        else if (placeholders(value) !== want) errors.push(`${where}: "${locale}" placeholders {${placeholders(value)}} differ from {${want}}`)
      }
      for (const extra of Object.keys(entry)) if (!LOCALES.includes(extra)) errors.push(`${where}: unknown language "${extra}"`)
      if (merged.has(key)) {
        const prev = merged.get(key)
        if (LOCALES.some(l => prev[l] !== entry[l])) conflicts.push(`${where}: also in ${owner.get(key)} with other translations (keep one)`)
        continue
      }
      merged.set(key, entry)
      owner.set(key, name)
    }
  }
  return merged
}

function catalogs(messages) {
  const out = {}
  for (const locale of LOCALES) {
    const catalog = {}
    for (const key of [...messages.keys()].sort()) {
      const value = messages.get(key)[locale]
      if (typeof value === "string" && value !== key) catalog[key] = value
    }
    out[locale] = JSON.stringify(catalog, null, 0) + "\n"
  }
  return out
}

const inScope = where => !only || where.some(w => only.some(prefix => w === prefix || w.startsWith(prefix + "/") || w.startsWith(prefix + ":")))

function main() {
  const errors = []
  const conflicts = []
  const keys = scanKeys()
  const messages = loadMessages(errors, conflicts)
  // the same text in two areas must be translated the same way (while working on one area, only a warning)
  if (only) { if (conflicts.length) console.warn(`i18n: ${conflicts.length} text(s) also in another area with other translations (ignored with --only)`) }
  else errors.push(...conflicts)

  const missing = [...keys].filter(([key, where]) => !messages.has(key) && inScope(where))
  if (missingMode) {
    const todo = Object.fromEntries(missing.map(([key, where]) => [key, where.slice(0, 3).join(" ")]))
    process.stdout.write(JSON.stringify(todo, null, 2) + "\n")
    process.exit(0)
  }
  for (const [key, where] of missing) errors.push(`missing translation: ${JSON.stringify(key)} (${where.slice(0, 2).join(", ")})`)
  if (!only) for (const key of messages.keys()) if (!keys.has(key)) errors.push(`unused entry (no t/msg in the code): ${JSON.stringify(key).slice(0, 100)}`)

  if (errors.length) {
    console.error(errors.slice(0, 200).join("\n"))
    if (errors.length > 200) console.error(`… and ${errors.length - 200} more`)
    console.error(`\ni18n: ${errors.length} problem(s)`)
    process.exit(1)
  }

  const out = catalogs(messages)
  if (check) {
    if (!only) {
      const stale = LOCALES.filter(l => {
        const file = path.join(GENERATED, `${l}.json`)
        return !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== out[l]
      })
      if (stale.length) { console.error(`i18n: lib/locales/generated is out of date (${stale.join(", ")}); run npm run i18n:build`); process.exit(1) }
    }
    console.log(`i18n: ${messages.size} texts, ${keys.size} keys in the code${only ? ` (checked under ${only.join(", ")})` : ""}`)
    return
  }
  fs.mkdirSync(GENERATED, { recursive: true })
  for (const locale of LOCALES) fs.writeFileSync(path.join(GENERATED, `${locale}.json`), out[locale])
  console.log(`i18n: ${messages.size} texts written for ${LOCALES.length} languages`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main()
