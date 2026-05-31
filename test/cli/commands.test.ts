import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runDiff } from '../../src/cli/commands/diff'
import { runGenerate } from '../../src/cli/commands/generate'
import { runSnapshot } from '../../src/cli/commands/snapshot'
import { runWatch } from '../../src/cli/commands/watch'
import { snapshotPath, writeSnapshot } from '../../src/cli/snapshots'

const SIMPLE_SCHEMA = resolve('test/cli/fixtures/simple.js')

describe('generate command', () => {
  it('returns JSON output for a valid schema', async () => {
    const { output, exitCode } = await runGenerate([SIMPLE_SCHEMA, '--seed', '1'])
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(output)
    expect(parsed).toHaveProperty('id')
    expect(parsed).toHaveProperty('name')
    expect(parsed).toHaveProperty('age')
  })

  it('output is deterministic for the same seed', async () => {
    const { output: a } = await runGenerate([SIMPLE_SCHEMA, '--seed', '99'])
    const { output: b } = await runGenerate([SIMPLE_SCHEMA, '--seed', '99'])
    expect(a).toBe(b)
  })

  it('output differs across seeds', async () => {
    const { output: a } = await runGenerate([SIMPLE_SCHEMA, '--seed', '1'])
    const { output: b } = await runGenerate([SIMPLE_SCHEMA, '--seed', '2'])
    expect(a).not.toBe(b)
  })

  it('jsonl format produces single-line JSON', async () => {
    const { output } = await runGenerate([SIMPLE_SCHEMA, '--format', 'jsonl'])
    expect(output.trim()).not.toContain('\n')
    JSON.parse(output)
  })

  it('ts format produces TypeScript export', async () => {
    const { output } = await runGenerate([SIMPLE_SCHEMA, '--format', 'ts'])
    expect(output).toContain('export const fixture =')
    expect(output).toContain('as const')
  })

  it('writes to file when --out is specified', async () => {
    const outDir = join(tmpdir(), `fg-out-${Date.now()}`)
    mkdirSync(outDir, { recursive: true })
    const outFile = join(outDir, 'result.json')
    try {
      const { output, exitCode } = await runGenerate([SIMPLE_SCHEMA, '--out', outFile])
      expect(exitCode).toBe(0)
      expect(output).toBe('')
      expect(existsSync(outFile)).toBe(true)
      JSON.parse(readFileSync(outFile, 'utf8'))
    } finally {
      rmSync(outDir, { recursive: true, force: true })
    }
  })

  it('exits with code 1 when no schema file provided', async () => {
    const { exitCode } = await runGenerate([])
    expect(exitCode).toBe(1)
  })
})

describe('snapshot command', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `fg-snap-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes a snapshot JSON file', async () => {
    const { output, exitCode } = await runSnapshot([SIMPLE_SCHEMA, '--dir', tmpDir, '--seed', '5'])
    expect(exitCode).toBe(0)
    expect(output).toContain('Wrote snapshot')
    const files = readdirSync(tmpDir)
    expect(files.length).toBe(1)
    expect(files[0]).toMatch(/simple-default-seed5\.json/)
  })

  it('snapshot file contains valid JSON matching generate output', async () => {
    await runSnapshot([SIMPLE_SCHEMA, '--dir', tmpDir, '--seed', '7'])
    const files = readdirSync(tmpDir)
    const firstFile = files[0] ?? ''
    const content = JSON.parse(readFileSync(join(tmpDir, firstFile), 'utf8'))
    const { output } = await runGenerate([SIMPLE_SCHEMA, '--seed', '7'])
    expect(content).toEqual(JSON.parse(output))
  })

  it('exits with code 1 when no schema file provided', async () => {
    const { exitCode } = await runSnapshot(['--dir', tmpDir])
    expect(exitCode).toBe(1)
  })
})

describe('diff command', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `fg-diff-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('exits 0 and reports no drift when snapshot matches', async () => {
    await runSnapshot([SIMPLE_SCHEMA, '--dir', tmpDir, '--seed', '1'])
    const { exitCode, output } = await runDiff([SIMPLE_SCHEMA, '--dir', tmpDir, '--seed', '1'])
    expect(exitCode).toBe(0)
    expect(output).toContain('No drift')
  })

  it('exits 1 when no snapshot exists', async () => {
    const { exitCode } = await runDiff([SIMPLE_SCHEMA, '--dir', tmpDir, '--seed', '1'])
    expect(exitCode).toBe(1)
  })

  it('exits 1 and shows diff when snapshot differs from current output', async () => {
    const snapFile = snapshotPath(tmpDir, SIMPLE_SCHEMA, undefined, 1)
    writeSnapshot(snapFile, { id: 'old-id', name: 'Old Name', age: 0 })
    const { exitCode, output } = await runDiff([SIMPLE_SCHEMA, '--dir', tmpDir, '--seed', '1'])
    expect(exitCode).toBe(1)
    expect(output).toContain('~')
  })

  it('--format json produces structured JSON diff', async () => {
    const snapFile = snapshotPath(tmpDir, SIMPLE_SCHEMA, undefined, 1)
    writeSnapshot(snapFile, { id: 'old-id', name: 'Old', age: 0 })
    const { exitCode, output } = await runDiff([
      SIMPLE_SCHEMA,
      '--dir',
      tmpDir,
      '--seed',
      '1',
      '--format',
      'json',
    ])
    expect(exitCode).toBe(1)
    const parsed = JSON.parse(output)
    expect(parsed).toHaveProperty('changed')
    expect(parsed).toHaveProperty('added')
    expect(parsed).toHaveProperty('removed')
  })

  it('exits with code 1 when no schema file provided', async () => {
    const { exitCode } = await runDiff(['--dir', tmpDir])
    expect(exitCode).toBe(1)
  })
})

describe('watch command', () => {
  it('exits with code 1 when no schema file provided', async () => {
    let capturedCode: number | undefined
    const origExit = process.exit
    process.exit = ((code: number) => {
      capturedCode = code
      throw new Error('exit')
    }) as typeof process.exit
    try {
      await runWatch([])
    } catch {
      // expected
    } finally {
      process.exit = origExit
    }
    expect(capturedCode).toBe(1)
  })
})
