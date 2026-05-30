import { z } from 'zod'
import { generateRelational } from '../src/index'

export const schemas = {
  users: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  posts: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string(),
  }),
}

export const relational = generateRelational(schemas, {
  seed: 42,
  counts: { users: 2, posts: 4 },
  relations: { 'posts.userId': 'users.id' },
})
