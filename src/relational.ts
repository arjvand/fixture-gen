import { generateMany } from './generate'
import { deriveSeed, hashString } from './hash'
import { type IntrospectedNode, introspect } from './introspect'
import type { ScenarioName } from './scenario'
import type { InferOutput, StandardSchemaV1 } from './standard'

export interface RelationalOptions<S extends Record<string, object> = Record<string, object>> {
  /** Seed for deterministic output. Same seed -> same linked record sets. */
  seed?: number
  /** How many records to generate per schema key. Missing keys default to `1`. */
  counts: Partial<Record<keyof S, number>>
  /** Map `"childTable.field"` to `"parentTable.field"` to link foreign keys. */
  relations?: Record<string, string>
  /** Named scenario applied to all tables during generation. */
  scenario?: ScenarioName
}

export type RelationalResult<S extends Record<string, StandardSchemaV1>> = {
  [K in keyof S]: Array<InferOutput<S[K]>>
}

type TableMap = Record<string, object>
type RowsByTable = Record<string, unknown[]>

interface ParsedRelation {
  childTable: string
  childField: string
  parentTable: string
  parentField: string
  rawChild: string
  rawParent: string
}

interface ResolvedRelation extends ParsedRelation {}

function parseTableField(
  input: string,
  role: 'child' | 'parent',
): { table: string; field: string } {
  const separator = input.indexOf('.')
  if (
    separator <= 0 ||
    separator === input.length - 1 ||
    input.indexOf('.', separator + 1) !== -1
  ) {
    throw new Error(
      `generateRelational: invalid ${role} reference "${input}". Expected "table.field".`,
    )
  }

  return {
    table: input.slice(0, separator),
    field: input.slice(separator + 1),
  }
}

function parseRelations(relations: Record<string, string> | undefined): ParsedRelation[] {
  const entries = Object.entries(relations ?? {}).sort(([aChild, aParent], [bChild, bParent]) => {
    const childCompare = aChild.localeCompare(bChild)
    if (childCompare !== 0) return childCompare
    return aParent.localeCompare(bParent)
  })

  return entries.map(([child, parent]) => {
    const parsedChild = parseTableField(child, 'child')
    const parsedParent = parseTableField(parent, 'parent')
    return {
      childTable: parsedChild.table,
      childField: parsedChild.field,
      parentTable: parsedParent.table,
      parentField: parsedParent.field,
      rawChild: child,
      rawParent: parent,
    }
  })
}

function validateCount(value: number | undefined, table: string): number {
  const count = value ?? 1
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`generateRelational: count for "${table}" must be a non-negative integer`)
  }
  return count
}

function validateObjectSchema(
  schema: object,
  table: string,
): IntrospectedNode & { kind: 'object' } {
  const node = introspect(schema)
  if (node.kind !== 'object') {
    throw new Error(`generateRelational: schema "${table}" must be an object schema`)
  }
  return node
}

function topologicalOrder(tables: string[], relations: ResolvedRelation[]): string[] {
  const orderIndex = new Map(tables.map((table, index) => [table, index]))
  const adjacency = new Map<string, Set<string>>()
  const indegree = new Map<string, number>(tables.map((table) => [table, 0]))
  const edgeKeys = new Set<string>()

  for (const relation of relations) {
    if (relation.childTable === relation.parentTable) continue

    const edgeKey = `${relation.parentTable}\0${relation.childTable}`
    if (edgeKeys.has(edgeKey)) continue
    edgeKeys.add(edgeKey)

    let children = adjacency.get(relation.parentTable)
    if (!children) {
      children = new Set<string>()
      adjacency.set(relation.parentTable, children)
    }
    children.add(relation.childTable)
    indegree.set(relation.childTable, (indegree.get(relation.childTable) ?? 0) + 1)
  }

  const ready = tables.filter((table) => (indegree.get(table) ?? 0) === 0)
  const ordered: string[] = []

  while (ready.length > 0) {
    ready.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))
    const table = ready.shift()
    if (table === undefined) break

    ordered.push(table)

    const children = adjacency.get(table)
    if (!children) continue
    for (const child of children) {
      const next = (indegree.get(child) ?? 0) - 1
      indegree.set(child, next)
      if (next === 0) ready.push(child)
    }
  }

  if (ordered.length !== tables.length) {
    throw new Error('generateRelational: relation graph contains a cycle')
  }

  return ordered
}

function collectParentCandidates(rows: unknown[], parentField: string): unknown[] {
  const candidates: unknown[] = []
  for (const row of rows) {
    if (row && typeof row === 'object') {
      const value = (row as Record<string, unknown>)[parentField]
      if (value !== undefined && value !== null) candidates.push(value)
    }
  }
  return candidates
}

function applyRelation(rowsByTable: RowsByTable, relation: ResolvedRelation, seed: number): void {
  const parentRows = rowsByTable[relation.parentTable]
  const childRows = rowsByTable[relation.childTable]

  if (!parentRows) {
    throw new Error(`generateRelational: unknown parent table "${relation.parentTable}"`)
  }
  if (!childRows) {
    throw new Error(`generateRelational: unknown child table "${relation.childTable}"`)
  }

  const candidates = collectParentCandidates(parentRows, relation.parentField)
  if (candidates.length === 0) {
    throw new Error(
      `generateRelational: relation "${relation.rawChild}" -> "${relation.rawParent}" has no usable parent values`,
    )
  }

  const start =
    hashString(`${seed >>> 0}:${relation.rawChild}->${relation.rawParent}`) % candidates.length
  for (let i = 0; i < childRows.length; i++) {
    const row = childRows[i]
    if (!row || typeof row !== 'object') continue

    const value = candidates[(start + i) % candidates.length]
    ;(row as Record<string, unknown>)[relation.childField] = value
  }
}

function resolveRelations(schemas: TableMap, relations: ParsedRelation[]): ResolvedRelation[] {
  const resolved: ResolvedRelation[] = []
  const seenChildFields = new Set<string>()

  for (const relation of relations) {
    if (!Object.prototype.hasOwnProperty.call(schemas, relation.childTable)) {
      throw new Error(`generateRelational: unknown child table "${relation.childTable}"`)
    }
    if (!Object.prototype.hasOwnProperty.call(schemas, relation.parentTable)) {
      throw new Error(`generateRelational: unknown parent table "${relation.parentTable}"`)
    }

    const childSchema = validateObjectSchema(
      schemas[relation.childTable] as object,
      relation.childTable,
    )
    const parentSchema = validateObjectSchema(
      schemas[relation.parentTable] as object,
      relation.parentTable,
    )

    if (!Object.prototype.hasOwnProperty.call(childSchema.entries, relation.childField)) {
      throw new Error(
        `generateRelational: unknown child field "${relation.childTable}.${relation.childField}"`,
      )
    }
    if (!Object.prototype.hasOwnProperty.call(parentSchema.entries, relation.parentField)) {
      throw new Error(
        `generateRelational: unknown parent field "${relation.parentTable}.${relation.parentField}"`,
      )
    }

    const childFieldKey = `${relation.childTable}.${relation.childField}`
    if (seenChildFields.has(childFieldKey)) {
      throw new Error(`generateRelational: duplicate relation for "${childFieldKey}"`)
    }
    seenChildFields.add(childFieldKey)
    resolved.push(relation)
  }

  return resolved
}

/** Generate multiple named record sets with foreign-key relationships resolved between them. */
export function generateRelational<S extends Record<string, StandardSchemaV1>>(
  schemas: S,
  options: RelationalOptions<S>,
): RelationalResult<S>
/** Generate multiple named record sets for object schemas or other supported schema objects. */
export function generateRelational(
  schemas: TableMap,
  options: RelationalOptions<TableMap>,
): RowsByTable
export function generateRelational(
  schemas: TableMap,
  options: RelationalOptions<TableMap> = { counts: {} } as RelationalOptions<TableMap>,
): RowsByTable {
  const tableNames = Object.keys(schemas)
  if (tableNames.length === 0) return {}

  const baseSeed = options.seed ?? 0

  for (const table of tableNames) {
    if (!Object.prototype.hasOwnProperty.call(options.counts, table)) {
      continue
    }
    validateCount(options.counts[table], table)
  }

  for (const table of Object.keys(options.counts)) {
    if (!Object.prototype.hasOwnProperty.call(schemas, table)) {
      throw new Error(`generateRelational: unknown table in counts "${table}"`)
    }
  }

  const parsedRelations = parseRelations(options.relations)
  const resolvedRelations = resolveRelations(schemas, parsedRelations)
  const order = topologicalOrder(tableNames, resolvedRelations)

  const rowsByTable: RowsByTable = {}
  for (const table of tableNames) {
    const count = validateCount(options.counts[table], table)
    const tableSeed = deriveSeed(baseSeed, table)
    const schema = schemas[table]
    if (schema === undefined) {
      throw new Error(`generateRelational: unknown table "${table}"`)
    }
    rowsByTable[table] = generateMany(schema, count, {
      seed: tableSeed,
      scenario: options.scenario,
    })
  }

  for (const table of order) {
    for (const relation of resolvedRelations) {
      if (relation.parentTable !== table) continue
      applyRelation(rowsByTable, relation, baseSeed)
    }
  }

  return rowsByTable
}
