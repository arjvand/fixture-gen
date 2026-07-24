import { factoryFixture, fixtureFactory } from '@fixture-gen/playwright'
import { z } from 'zod'

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().min(18).max(99),
})

// Usage in a Playwright test file:
//
// import { test as base, expect } from '@playwright/test'
//
// export const test = base.extend({
//   user: fixtureFactory(User, { seed: 42 }),
//   // or multi-value:
//   // makeUser: factoryFixture(User, { seed: 1 }),
// })
//
// test('shows profile', async ({ user, page }) => {
//   await page.goto(`/users/${user.id}`)
//   await expect(page.getByText(user.name)).toBeVisible()
// })
//
// test('creates two users', async ({ makeUser }) => {
//   const admin = makeUser({ name: 'Admin' })
//   const guest = makeUser({ name: 'Guest' })
// })

// Export factories so the example typechecks as a module.
export const userFixture = fixtureFactory(User, { seed: 42 })
export const userFactoryFixture = factoryFixture(User, { seed: 1 })
