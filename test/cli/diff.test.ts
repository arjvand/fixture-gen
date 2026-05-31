import { describe, it, expect } from 'vitest'
import { computeDiff, formatDiffHuman, hasDrift } from '../../src/cli/diff'

describe('computeDiff', () => {
  it('returns empty diff for identical objects', () => {
    const d = computeDiff({ a: 1 }, { a: 1 })
    expect(d.changed).toHaveLength(0)
    expect(d.added).toHaveLength(0)
    expect(d.removed).toHaveLength(0)
  })

  it('detects changed leaf value', () => {
    const d = computeDiff({ name: 'Alice' }, { name: 'Bob' })
    expect(d.changed).toEqual([{ path: 'name', from: 'Alice', to: 'Bob' }])
  })

  it('detects added key', () => {
    const d = computeDiff({ a: 1 }, { a: 1, b: 2 })
    expect(d.added).toEqual([{ path: 'b', from: undefined, to: 2 }])
  })

  it('detects removed key', () => {
    const d = computeDiff({ a: 1, b: 2 }, { a: 1 })
    expect(d.removed).toEqual([{ path: 'b', from: 2, to: undefined }])
  })

  it('uses dot-notation for nested paths', () => {
    const d = computeDiff({ user: { name: 'Alice' } }, { user: { name: 'Bob' } })
    expect(d.changed[0]?.path).toBe('user.name')
  })
})

describe('hasDrift', () => {
  it('returns false when no changes', () => {
    expect(hasDrift({ changed: [], added: [], removed: [] })).toBe(false)
  })

  it('returns true when there are changes', () => {
    expect(hasDrift({ changed: [{ path: 'x', from: 1, to: 2 }], added: [], removed: [] })).toBe(
      true,
    )
  })
})

describe('formatDiffHuman', () => {
  it('formats changed entries with ~', () => {
    const out = formatDiffHuman({
      changed: [{ path: 'id', from: 'a', to: 'b' }],
      added: [],
      removed: [],
    })
    expect(out).toContain('~ id:')
    expect(out).toContain('"a"')
    expect(out).toContain('"b"')
  })

  it('formats added entries with +', () => {
    const out = formatDiffHuman({
      changed: [],
      added: [{ path: 'email', from: undefined, to: 'x@y.com' }],
      removed: [],
    })
    expect(out).toContain('+ email:')
  })

  it('formats removed entries with -', () => {
    const out = formatDiffHuman({
      changed: [],
      added: [],
      removed: [{ path: 'phone', from: '555', to: undefined }],
    })
    expect(out).toContain('- phone:')
  })
})
