import { autoReset, fixtureFactory } from '@fixture-gen/vitest'
import { z } from 'zod'

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().min(18).max(99),
})

const user = fixtureFactory(User, { seed: 42 })
autoReset(user)

// Usage in a Vitest test file:
//
// describe('User', () => {
//   it('creates a user', () => {
//     const u = user()
//     console.log(u)
//     // { id: '...', name: '...', age: ... }
//   })
//
//   it('supports overrides', () => {
//     const u = user({ name: 'Alice' })
//     console.log(u)
//     // { id: '...', name: 'Alice', age: ... }
//   })
// })
