/** Piece edits travel between players as changed keys only. */

/** Changed keys only; a removed key travels as null. */
export function diffObject(base: object, next: object): Record<string, unknown> {
  const before = base as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) patch[key] = after[key] ?? null;
  }
  return patch;
}

export function mergeObject<T extends object>(base: T, patch: Record<string, unknown>): T {
  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged as T;
}
