import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generateRelational } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

const Post = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
})

describe('generateRelational', () => {
  it('links child records to real parent keys', () => {
    const result = generateRelational(
      { users: User, posts: Post },
      {
        seed: 42,
        counts: { users: 3, posts: 10 },
        relations: {
          'posts.userId': 'users.id',
        },
      },
    )

    expect(result.users).toHaveLength(3)
    expect(result.posts).toHaveLength(10)

    const userIds = new Set(result.users.map((user) => user.id))
    for (const user of result.users) {
      expect(validates(User, user)).toBe(true)
    }
    for (const post of result.posts) {
      expect(validates(Post, post)).toBe(true)
      expect(userIds.has(post.userId)).toBe(true)
    }
  })

  it('is deterministic for a fixed seed', () => {
    const schema = {
      users: User,
      posts: Post,
    }
    const options = {
      seed: 7,
      counts: { users: 3, posts: 5 },
      relations: {
        'posts.userId': 'users.id',
      },
    }

    expect(generateRelational(schema, options)).toEqual(generateRelational(schema, options))
  })

  it('defaults omitted counts to 1', () => {
    const result = generateRelational(
      { users: User, posts: Post },
      {
        seed: 99,
        counts: { posts: 2 },
        relations: {
          'posts.userId': 'users.id',
        },
      },
    )

    expect(result.users).toHaveLength(1)
    expect(result.posts).toHaveLength(2)
    expect(result.posts.every((post) => result.users.some((user) => user.id === post.userId))).toBe(
      true,
    )
  })

  it('throws on invalid relation references', () => {
    expect(() =>
      generateRelational(
        { users: User, posts: Post },
        {
          seed: 1,
          counts: { users: 1, posts: 1 },
          relations: {
            'posts.userId': 'users.missing',
          },
        },
      ),
    ).toThrow(/unknown parent field/i)
  })

  it('throws on cyclic table dependencies', () => {
    const A = z.object({
      id: z.string().uuid(),
      bId: z.string().uuid(),
    })
    const B = z.object({
      id: z.string().uuid(),
      aId: z.string().uuid(),
    })

    expect(() =>
      generateRelational(
        { a: A, b: B },
        {
          seed: 1,
          counts: { a: 1, b: 1 },
          relations: {
            'a.bId': 'b.id',
            'b.aId': 'a.id',
          },
        },
      ),
    ).toThrow(/cycle/i)
  })
})
