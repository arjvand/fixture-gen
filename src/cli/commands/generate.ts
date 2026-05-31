import { parseArgs } from 'node:util'
import { writeFileSync } from 'node:fs'
import { generate } from '../../generate'
import { loadSchema } from '../loader'
import { formatOutput, type Format } from '../formatter'
import type { ScenarioName } from '../../scenario'

export interface CommandResult {
  output: string
  exitCode: number
}

export async function runGenerate(argv: string[]): Promise<CommandResult> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      scenario: { type: 'string' },
      seed: { type: 'string' },
      out: { type: 'string' },
      format: { type: 'string', default: 'json' },
    },
  })

  const schemaFile = positionals[0]
  if (!schemaFile) {
    process.stderr.write(
      'Usage: fixture-gen generate <schema-file> [--scenario <name>] [--seed <n>] [--out <file>] [--format json|jsonl|ts]\n',
    )
    return { output: '', exitCode: 1 }
  }

  const schema = await loadSchema(schemaFile)
  const result = generate(schema, {
    seed: values.seed !== undefined ? Number(values.seed) : 0,
    scenario: values.scenario as ScenarioName | undefined,
  })

  const formatted = formatOutput(result, (values.format ?? 'json') as Format)

  if (values.out) {
    writeFileSync(values.out, formatted)
    return { output: '', exitCode: 0 }
  }

  return { output: formatted, exitCode: 0 }
}
