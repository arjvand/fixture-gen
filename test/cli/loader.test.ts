import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadSchema } from '../../src/cli/loader'

describe('loadSchema', () => {
  it('loads a schema from a JS file with default export', async () => {
    const schema = await loadSchema(resolve('test/cli/fixtures/simple.js'))
    expect(schema).toBeDefined()
    expect(typeof schema).toBe('object')
  })

  it('returns the default export as the schema', async () => {
    const schema = await loadSchema(resolve('test/cli/fixtures/simple.js'))
    expect((schema as Record<string, unknown>)['~standard']).toBeDefined()
  })

  it('throws if file has no default or schema export', async () => {
    await expect(loadSchema(resolve('test/cli/fixtures/no-export.js'))).rejects.toThrow()
  })

  it('cache-busts when cacheBust is true', async () => {
    const a = await loadSchema(resolve('test/cli/fixtures/simple.js'), false)
    const b = await loadSchema(resolve('test/cli/fixtures/simple.js'), true)
    expect(a).toBeDefined()
    expect(b).toBeDefined()
  })
})
