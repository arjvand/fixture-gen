import {
  type CustomGenerator,
  createContext,
  isValidCustomValue,
  resolveCustomGenerator,
} from './custom'
import { generateBuiltinValue } from './generators'
import { introspect } from './introspect'
import type { IntrospectedNode } from './introspect'
import { isBuiltinScenario, resolveUserScenario } from './scenario'
import type { ScenarioName } from './scenario'
import type { InferOutput, StandardSchemaV1 } from './standard'

export interface GenerateOptions<T = unknown> {
  /** Seed for deterministic output. Same seed → same data. Defaults to `0`. */
  seed?: number
  /** Pin specific field values, bypassing generation. */
  overrides?: Partial<T>
  /** Field-path keyed custom generators. `*` matches a single path segment. */
  generators?: Record<string, CustomGenerator>
  /** Schema-wide custom generator hook that can override any node. */
  generator?: CustomGenerator
  /** Named scenario controlling generation behavior. */
  scenario?: ScenarioName
}

/** Generate a single fixture from a Standard Schema. */
export function generate<S extends StandardSchemaV1>(
  schema: S,
  options?: GenerateOptions<InferOutput<S>>,
): InferOutput<S>
/** Generate a single fixture from a TypeBox schema or other supported schema object. */
export function generate(schema: object, options?: GenerateOptions): unknown
export function generate(schema: object, options: GenerateOptions = {}): unknown {
  return generateInternal(schema, options)
}

function generateInternal(
  schema: object,
  options: GenerateOptions = {},
  visited: Set<string> = new Set(),
): unknown {
  const { scenario } = options

  if (scenario && !isBuiltinScenario(scenario)) {
    if (visited.has(scenario)) {
      throw new Error(`fixture-gen: scenario "${scenario}" has a circular extends chain`)
    }
    const def = resolveUserScenario(scenario)
    if (!def) {
      throw new Error(`fixture-gen: unknown scenario "${scenario}"`)
    }
    const next = new Set(visited)
    next.add(scenario)
    const baseOptions: GenerateOptions = { ...options, scenario: def.extends }
    const value = generateInternal(schema, baseOptions, next)

    if (def.factory) return def.factory(value)
    if (def.overrides && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>), ...def.overrides }
    }
    return value
  }

  const node = introspect(schema)
  const seed = options.seed ?? 0
  const value = generateNode(node, seed, [], options)
  if (options.overrides && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>), ...options.overrides }
  }
  return value
}

function generateInvalidValue(node: IntrospectedNode): unknown {
  switch (node.kind) {
    case 'string':
      return 42
    case 'number':
    case 'integer':
      return 'not-a-number'
    case 'boolean':
      return 'not-a-boolean'
    default:
      return null
  }
}

function generateNode(
  node: Parameters<typeof generateBuiltinValue>[0],
  seed: number,
  path: readonly string[],
  options: GenerateOptions,
): unknown {
  if (options.scenario === 'invalid' && path.length === 0) {
    return generateInvalidValue(node)
  }
  const context = createContext(seed, path, node)
  const fieldGenerator = resolveCustomGenerator(path, options.generators)
  if (fieldGenerator) {
    const custom = fieldGenerator(context)
    if (isValidCustomValue(node, custom)) return custom
  }
  if (options.generator) {
    const custom = options.generator(context)
    if (isValidCustomValue(node, custom)) return custom
  }

  return generateBuiltinValue(
    node,
    seed,
    path,
    (child, childPath) => generateNode(child, seed, childPath, options),
    options.scenario,
  )
}

/** Generate an array of `count` fixtures, each with a distinct derived seed. */
export function generateMany<S extends StandardSchemaV1>(
  schema: S,
  count: number,
  options?: GenerateOptions<InferOutput<S>>,
): Array<InferOutput<S>>
/** Generate an array of `count` fixtures for a TypeBox schema or other supported schema object. */
export function generateMany(schema: object, count: number, options?: GenerateOptions): unknown[]
export function generateMany(
  schema: object,
  count: number,
  options: GenerateOptions = {},
): unknown[] {
  return generateManyInternal(schema, count, options)
}

function generateManyInternal(
  schema: object,
  count: number,
  options: GenerateOptions = {},
): unknown[] {
  const base = options.seed ?? 0
  return Array.from({ length: count }, (_, i) => generate(schema, { ...options, seed: base + i }))
}
