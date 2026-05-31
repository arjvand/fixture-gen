import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'

export function snapshotPath(dir: string, schemaFile: string, scenario?: string, seed = 0): string {
  const base = basename(schemaFile, extname(schemaFile))
  const scenarioSlug = scenario ?? 'default'
  return join(dir, `${base}-${scenarioSlug}-seed${seed}.json`)
}

export function readSnapshot(filePath: string): unknown {
  if (!existsSync(filePath)) return undefined
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown
}

export function writeSnapshot(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
