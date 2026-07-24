import { generate, mergeOverrides } from 'fixture-gen'
import type { GenerateOptions, InferOutput, StandardSchemaV1 } from 'fixture-gen'

/**
 * Minimal Playwright fixture-function shape.
 * Compatible with `@playwright/test`'s `test.extend` without importing Playwright types.
 */
export type PlaywrightFixtureFn<T> = (
  fixtures: Record<string, unknown>,
  use: (value: T) => Promise<void>,
  testInfo?: PlaywrightTestInfoLike,
) => Promise<void>

/** Subset of Playwright `TestInfo` used for optional worker isolation. */
export interface PlaywrightTestInfoLike {
  workerIndex?: number
  parallelIndex?: number
}

export interface PlaywrightGenerateOptions<T = unknown> extends GenerateOptions<T> {
  /**
   * When true, mixes `testInfo.workerIndex` into the seed so parallel Playwright
   * workers produce different but still deterministic fixtures.
   * @default false
   */
  isolateWorkers?: boolean
}

export interface FixtureFactory<T> {
  (overrides?: Partial<T>): T
  generate(overrides?: Partial<T>): T
  reset(): void
}

function resolveSeed(
  baseSeed: number,
  options: PlaywrightGenerateOptions | undefined,
  testInfo: PlaywrightTestInfoLike | undefined,
): number {
  if (!options?.isolateWorkers) return baseSeed
  const workerIndex = testInfo?.workerIndex ?? 0
  // Large stride keeps worker streams non-overlapping for typical test volumes.
  return baseSeed + workerIndex * 1_000_003
}

/**
 * Create a Playwright fixture definition from a Standard Schema.
 *
 * Use with `test.extend`:
 *
 * ```ts
 * import { test as base } from '@playwright/test'
 * import { fixtureFactory } from '@fixture-gen/playwright'
 *
 * export const test = base.extend({
 *   user: fixtureFactory(UserSchema, { seed: 42 }),
 * })
 *
 * test('shows profile', async ({ user, page }) => {
 *   await page.goto(`/users/${user.id}`)
 * })
 * ```
 *
 * Each test receives one freshly generated, schema-valid value. The same `seed`
 * always yields the same value (across runs and machines).
 */
export function fixtureFactory<S extends StandardSchemaV1>(
  schema: S,
  options?: PlaywrightGenerateOptions<InferOutput<S>>,
): PlaywrightFixtureFn<InferOutput<S>>
export function fixtureFactory(
  schema: object,
  options?: PlaywrightGenerateOptions,
): PlaywrightFixtureFn<unknown>
export function fixtureFactory(
  schema: object,
  options?: PlaywrightGenerateOptions,
): PlaywrightFixtureFn<unknown> {
  const baseSeed = options?.seed ?? 0

  return async (_fixtures, use, testInfo) => {
    const seed = resolveSeed(baseSeed, options, testInfo)
    const value = generate(schema, {
      ...options,
      seed,
    })
    await use(value)
  }
}

/**
 * Create a Playwright fixture that injects a callable {@link FixtureFactory}.
 *
 * Prefer this when a test needs multiple fixtures or per-call overrides:
 *
 * ```ts
 * export const test = base.extend({
 *   user: factoryFixture(UserSchema, { seed: 1 }),
 * })
 *
 * test('creates two users', async ({ user }) => {
 *   const admin = user({ role: 'admin' })
 *   const guest = user({ role: 'guest' })
 * })
 * ```
 *
 * The factory counter is reset at the start of every test.
 */
export function factoryFixture<S extends StandardSchemaV1>(
  schema: S,
  options?: PlaywrightGenerateOptions<InferOutput<S>>,
): PlaywrightFixtureFn<FixtureFactory<InferOutput<S>>>
export function factoryFixture(
  schema: object,
  options?: PlaywrightGenerateOptions,
): PlaywrightFixtureFn<FixtureFactory<unknown>>
export function factoryFixture(
  schema: object,
  options?: PlaywrightGenerateOptions,
): PlaywrightFixtureFn<FixtureFactory<unknown>> {
  return async (_fixtures, use, testInfo) => {
    const baseSeed = resolveSeed(options?.seed ?? 0, options, testInfo)
    const factory = createFactory(schema, { ...options, seed: baseSeed })
    await use(factory)
  }
}

/**
 * Standalone callable factory (same model as `@fixture-gen/vitest` / `@fixture-gen/jest`).
 * Useful outside `test.extend`, or when you manage lifecycle yourself.
 *
 * Each call increments an internal counter added to the base seed so consecutive
 * invocations produce different fixtures. Call `.reset()` to restart the sequence.
 */
export function createFactory<S extends StandardSchemaV1>(
  schema: S,
  options?: GenerateOptions<InferOutput<S>>,
): FixtureFactory<InferOutput<S>>
export function createFactory(schema: object, options?: GenerateOptions): FixtureFactory<unknown>
export function createFactory(schema: object, options?: GenerateOptions): FixtureFactory<unknown> {
  const baseSeed = options?.seed ?? 0
  let counter = 0

  const factory = ((overrides?: Record<string, unknown>): unknown => {
    const result = generate(schema, {
      ...options,
      seed: baseSeed + counter,
      overrides: mergeOverrides(
        options?.overrides as Record<string, unknown> | undefined,
        overrides,
      ),
    })
    counter++
    return result
  }) as FixtureFactory<unknown>

  factory.generate = (overrides?: Record<string, unknown>) => factory(overrides)
  factory.reset = () => {
    counter = 0
  }

  return factory
}
