export interface DiffEntry {
  path: string
  from: unknown
  to: unknown
}

export interface DiffResult {
  changed: DiffEntry[]
  added: DiffEntry[]
  removed: DiffEntry[]
}

export function computeDiff(a: unknown, b: unknown): DiffResult {
  const result: DiffResult = { changed: [], added: [], removed: [] }
  walk(a, b, '', result)
  return result
}

function walk(a: unknown, b: unknown, path: string, result: DiffResult): void {
  if (a === b) return
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) {
      const p = path ? `${path}.${key}` : key
      if (!(key in a)) {
        result.added.push({ path: p, from: undefined, to: b[key] })
      } else if (!(key in b)) {
        result.removed.push({ path: p, from: a[key], to: undefined })
      } else {
        walk(a[key], b[key], p, result)
      }
    }
  } else {
    result.changed.push({ path, from: a, to: b })
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function hasDrift(result: DiffResult): boolean {
  return result.changed.length > 0 || result.added.length > 0 || result.removed.length > 0
}

export function formatDiffHuman(result: DiffResult): string {
  const lines: string[] = []
  for (const { path, from, to } of result.changed) {
    lines.push(`~ ${path}: ${JSON.stringify(from)} → ${JSON.stringify(to)}`)
  }
  for (const { path, to } of result.added) {
    lines.push(`+ ${path}: ${JSON.stringify(to)}`)
  }
  for (const { path, from } of result.removed) {
    lines.push(`- ${path}: ${JSON.stringify(from)}`)
  }
  return lines.join('\n')
}
