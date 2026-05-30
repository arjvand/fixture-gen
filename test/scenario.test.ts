import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from '../src/generate'

describe('scenario option — type acceptance', () => {
  it('accepts a built-in scenario name without error', () => {
    const schema = z.object({ name: z.string() })
    expect(() => generate(schema, { scenario: 'happy-path' })).not.toThrow()
  })

  it('accepts any string as scenario name without error', () => {
    const schema = z.object({ name: z.string() })
    expect(() => generate(schema, { scenario: 'my-custom' })).not.toThrow()
  })
})
