import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = resolve(root, 'docs/API.md')

const content = `# API Reference

Generated from the public TypeScript surface of \`fixture-gen\`.

## Exports

### \`generate(schema, options?)\`

Generate a single fixture from a Standard Schema or supported schema object.

\`\`\`ts
function generate<T>(schema: StandardSchemaV1<unknown, T>, options?: GenerateOptions<T>): T
\`\`\`

### \`generateMany(schema, count, options?)\`

Generate \`count\` fixtures with derived deterministic seeds.

\`\`\`ts
function generateMany<T>(
  schema: StandardSchemaV1<unknown, T>,
  count: number,
  options?: GenerateOptions<T>,
): T[]
\`\`\`

### \`generateRelational(schemas, options)\`

Generate multiple named record sets and resolve foreign-key relationships between them.

\`\`\`ts
function generateRelational<S extends Record<string, StandardSchemaV1>>(
  schemas: S,
  options: RelationalOptions<S>,
): { [K in keyof S]: InferOutput<S[K]>[] }
\`\`\`

### Custom generation

\`\`\`ts
interface GenerateContext {
  path: readonly string[]
  pathKey: string
  node: IntrospectedNode
  seed: number
  prng: Prng
}

type CustomGenerator = (context: GenerateContext) => unknown
\`\`\`

- \`generators\` is a field-path keyed map of custom generator functions.
- \`generator\` is a schema-wide hook that runs on every node.
- \`overrides\` still applies after generation and remains the highest-priority top-level pin.

### Generate options

\`\`\`ts
interface GenerateOptions<T> {
  seed?: number
  overrides?: Partial<T>
  generators?: Record<string, CustomGenerator>
  generator?: CustomGenerator
}
\`\`\`

### Relational options

\`\`\`ts
interface RelationalOptions<S> {
  seed?: number
  counts: { [K in keyof S]?: number }
  relations?: Record<string, string>
}
\`\`\`

### Supporting types

- \`InferOutput<S>\` infers the validated output type for a Standard Schema.
- \`StandardSchemaV1\` is the minimal internal declaration of the Standard Schema interface.
- \`VERSION\` tracks the package release marker.
`

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, `${content}\n`)
