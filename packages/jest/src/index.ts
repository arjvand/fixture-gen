import { beforeEach } from '@jest/globals'
import { generate } from 'fixture-gen'
import type { GenerateOptions, InferOutput, StandardSchemaV1 } from 'fixture-gen'

export interface FixtureFactory<T> {
  (overrides?: Partial<T>): T
  generate(overrides?: Partial<T>): T
  reset(): void
}

export function fixtureFactory<S extends StandardSchemaV1>(
  schema: S,
  options?: GenerateOptions<InferOutput<S>>,
): FixtureFactory<InferOutput<S>>
export function fixtureFactory(schema: object, options?: GenerateOptions): FixtureFactory<unknown>
export function fixtureFactory(schema: object, options?: GenerateOptions): FixtureFactory<unknown> {
  const baseSeed = options?.seed ?? 0
  let counter = 0

  const mergeOverrides = (callOverrides: unknown) => {
    if (callOverrides === undefined)
      return options?.overrides as Record<string, unknown> | undefined
    if (!options?.overrides) return callOverrides as Record<string, unknown>
    return {
      ...(options.overrides as Record<string, unknown>),
      ...(callOverrides as Record<string, unknown>),
    }
  }

  const factory = ((overrides?: Record<string, unknown>): unknown => {
    const result = generate(schema, {
      ...options,
      seed: baseSeed + counter,
      overrides: mergeOverrides(overrides),
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

export function autoReset(factory: { reset(): void }): void {
  beforeEach(() => factory.reset())
}
