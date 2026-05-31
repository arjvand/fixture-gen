import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

export async function loadSchema(filePath: string, cacheBust = false): Promise<object> {
  const absolute = resolve(filePath)
  let url = pathToFileURL(absolute).href
  if (cacheBust) url += `?t=${Date.now()}`
  const mod = (await import(url)) as Record<string, unknown>
  const schema = mod['default'] ?? mod['schema']
  if (schema == null || typeof schema !== 'object') {
    throw new Error(`No default or named 'schema' export found in ${filePath}`)
  }
  return schema
}
