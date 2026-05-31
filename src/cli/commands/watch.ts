import { watch } from 'node:fs'
import { parseArgs } from 'node:util'
import { generate } from '../../generate'
import { loadSchema } from '../loader'
import { computeDiff, formatDiffHuman, hasDrift } from '../diff'
import type { ScenarioName } from '../../scenario'

export async function runWatch(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      scenario: { type: 'string' },
      seed: { type: 'string' },
    },
  })

  const schemaFile = positionals[0]
  if (!schemaFile) {
    process.stderr.write(
      'Usage: fixture-gen watch <schema-file> [--scenario <name>] [--seed <n>]\n',
    )
    process.exit(1)
  }

  const opts = {
    seed: values.seed !== undefined ? Number(values.seed) : 0,
    scenario: values.scenario as ScenarioName | undefined,
  }

  let schema = await loadSchema(schemaFile)
  let previous = generate(schema, opts)
  process.stdout.write(`Watching ${schemaFile} for changes...\n`)

  watch(schemaFile, async () => {
    try {
      schema = await loadSchema(schemaFile, true)
      const current = generate(schema, opts)
      const diff = computeDiff(previous, current)
      if (hasDrift(diff)) {
        process.stdout.write(formatDiffHuman(diff) + '\n')
        previous = current
      }
    } catch (err) {
      process.stderr.write(String(err instanceof Error ? err.message : err) + '\n')
    }
  })
}
