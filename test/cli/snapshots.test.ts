import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotPath, readSnapshot, writeSnapshot } from '../../src/cli/snapshots'

describe('snapshotPath', () => {
  it('uses schema basename without extension', () => {
    const p = snapshotPath('fixtures', 'test/schemas/user.ts', undefined, 0)
    expect(p).toContain('user')
    expect(p).not.toContain('.ts')
  })

  it('defaults scenario to "default"', () => {
    const p = snapshotPath('fixtures', 'user.js', undefined, 0)
    expect(p).toContain('default')
  })

  it('includes seed in filename', () => {
    const p = snapshotPath('fixtures', 'user.js', undefined, 42)
    expect(p).toContain('seed42')
  })

  it('includes scenario name in filename', () => {
    const p = snapshotPath('fixtures', 'user.js', 'boundary-min', 0)
    expect(p).toContain('boundary-min')
  })
})

describe('writeSnapshot / readSnapshot', () => {
  let dir: string

  beforeEach(() => {
    dir = join(tmpdir(), `fg-snap-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('round-trips an object through write/read', () => {
    const value = { id: 'abc', count: 7 }
    const filePath = join(dir, 'snap.json')
    writeSnapshot(filePath, value)
    expect(readSnapshot(filePath)).toEqual(value)
  })

  it('returns undefined when snapshot file does not exist', () => {
    expect(readSnapshot(join(dir, 'nonexistent.json'))).toBeUndefined()
  })

  it('creates intermediate directories', () => {
    const nestedPath = join(dir, 'a', 'b', 'snap.json')
    writeSnapshot(nestedPath, { x: 1 })
    expect(readSnapshot(nestedPath)).toEqual({ x: 1 })
  })
})
