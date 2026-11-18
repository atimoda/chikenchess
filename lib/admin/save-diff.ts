// What a "Salvar no game" changes: every leaf that differs between what the game has now and what will be saved.
// Objects are walked key by key; arrays and other values are compared whole (a combo, a list of scales). Pure.

export type SaveChange = { path: string[]; label: string; before: unknown; after: unknown }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** The changes from `before` to `after`, labelled by `label` (a path's words; the keys joined by default). */
export function diffValues(before: unknown, after: unknown, label: (path: string[]) => string = p => p.join(' › '), path: string[] = []): SaveChange[] {
  if (isObj(before) && isObj(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    return keys.flatMap(k => diffValues(before[k], after[k], label, [...path, k]))
  }
  if (isObj(after) && before === undefined) return diffValues({}, after, label, path)
  if (JSON.stringify(before) === JSON.stringify(after)) return []
  return [{ path, label: label(path), before, after }]
}

/** A value as the confirmation shows it: short, one line. */
export function showValue(v: unknown): string {
  if (v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  if (typeof v === 'number') return String(Math.round(v * 1000) / 1000)
  const s = typeof v === 'string' ? v || '(vazio)' : JSON.stringify(v)
  return s.length > 60 ? `${s.slice(0, 57)}…` : s
}
