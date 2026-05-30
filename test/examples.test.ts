import { Value } from '@sinclair/typebox/value'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { User as ArktypeUser, user as arktypeUser } from '../examples/arktype'
import { User as CustomUser, user as customUser } from '../examples/custom-generators'
import { relational } from '../examples/relational'
import {
  User as TypeboxUser,
  user as typeboxUser,
  isValid as typeboxValid,
} from '../examples/typebox'
import { User as ValibotUser, user as valibotUser } from '../examples/valibot'
import { User as ZodUser, user as zodUser } from '../examples/zod'

const validates = (schema: z.ZodTypeAny, value: unknown): boolean => schema.safeParse(value).success

describe('examples', () => {
  it('runs the Zod example', () => {
    expect(validates(ZodUser, zodUser)).toBe(true)
  })

  it('runs the Valibot example', () => {
    const value = valibotUser as Record<string, unknown>
    expect(value).toBeDefined()
    expect(typeof value.id).toBe('string')
  })

  it('runs the ArkType example', () => {
    const value = arktypeUser as Record<string, unknown>
    expect(value).toBeDefined()
    expect(typeof value.name).toBe('string')
  })

  it('runs the TypeBox example', () => {
    const value = typeboxUser as Record<string, unknown>
    expect(Value.Check(TypeboxUser, value)).toBe(true)
    expect(typeboxValid).toBe(true)
  })

  it('runs the relational example', () => {
    const value = relational as {
      users: Array<Record<string, unknown>>
      posts: Array<Record<string, unknown>>
    }
    expect(value.users).toHaveLength(2)
    expect(value.posts).toHaveLength(4)
    expect(value.posts.every((post) => value.users.some((user) => user.id === post.userId))).toBe(
      true,
    )
  })

  it('runs the custom generator example', () => {
    const value = customUser as {
      profile: { name: string; slug: string }
      tag: string
    }
    expect(value.profile.name).toBe('computed:profile.name')
    expect(value.profile.slug.startsWith('slug-')).toBe(true)
    expect(value.tag).toBe('schema-wide')
    expect(validates(CustomUser, customUser)).toBe(true)
  })
})
