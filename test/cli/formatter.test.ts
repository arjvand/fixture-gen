import { describe, expect, it } from 'vitest'
import { formatOutput } from '../../src/cli/formatter'

describe('formatOutput', () => {
  const value = { id: 'abc-123', count: 42 }

  it('json: pretty-prints with 2-space indent', () => {
    const out = formatOutput(value, 'json')
    expect(out).toBe(JSON.stringify(value, null, 2))
    expect(out).toContain('\n')
  })

  it('jsonl: single line, no indent', () => {
    const out = formatOutput(value, 'jsonl')
    expect(out).toBe(JSON.stringify(value))
    expect(out).not.toContain('\n')
  })

  it('ts: wraps in export const with as const', () => {
    const out = formatOutput(value, 'ts')
    expect(out).toContain('export const fixture =')
    expect(out).toContain('as const')
    const body = out.replace('export const fixture = ', '').replace(' as const\n', '')
    expect(JSON.parse(body)).toEqual(value)
  })
})
