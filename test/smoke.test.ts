import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index'

describe('package skeleton', () => {
  it('exposes a VERSION export', () => {
    expect(VERSION).toBe('1.3.2')
  })
})
