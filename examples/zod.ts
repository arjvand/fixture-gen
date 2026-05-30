import { z } from 'zod'
import { generate } from '../src/index'

export const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().min(18).max(99),
})

export const user = generate(User, { seed: 42 })
