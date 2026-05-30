export type BuiltinScenario =
  | 'happy-path'
  | 'empty-state'
  | 'boundary-min'
  | 'boundary-max'
  | 'invalid'
  | 'missing-subtree'

// Widen to string but preserve autocomplete for built-in names
export type ScenarioName = BuiltinScenario | (string & {})

const BUILTIN_SCENARIOS = new Set<string>([
  'happy-path',
  'empty-state',
  'boundary-min',
  'boundary-max',
  'invalid',
  'missing-subtree',
])

export function isBuiltinScenario(name: string): name is BuiltinScenario {
  return BUILTIN_SCENARIOS.has(name)
}

interface ScenarioEntry {
  extends?: string
  factory?: (value: unknown) => unknown
  overrides?: Record<string, unknown>
}

const registry = new Map<string, ScenarioEntry>()

export function resolveUserScenario(name: string): ScenarioEntry | undefined {
  return registry.get(name)
}

export function registerScenario(name: string, entry: ScenarioEntry): void {
  if (BUILTIN_SCENARIOS.has(name)) {
    throw new Error(`fixture-gen: cannot redefine built-in scenario "${name}"`)
  }
  registry.set(name, entry)
}

/** Remove all user-defined scenarios. Useful in tests. */
export function clearScenarios(): void {
  registry.clear()
}
