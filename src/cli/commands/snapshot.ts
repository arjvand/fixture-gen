import { parseArgs } from 'node:util'
import { generate } from '../../generate'
import { loadSchema } from '../loader'
import { snapshotPath, writeSnapshot } from '../snapshots'
import type { ScenarioName } from '../../scenario'
import type { CommandResult } from './generate'

export async function runSnapshot(argv: string[]): Promise<CommandResult> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      scenario: { type: 'string' },
      seed: { type: 'string' },
      dir: { type: 'string', default: 'fixtures' },
    },
  })

  const schemaFile = positionals[0]
  if (!schemaFile) {
    process.stderr.write(
      'Usage: fixture-gen snapshot <schema-file> [--scenario <name>] [--seed <n>] [--dir fixtures/]\n',
    )
    return { output: '', exitCode: 1 }
  }

  const schema = await loadSchema(schemaFile)
  const seed = values.seed !== undefined ? Number(values.seed) : 0
  const scenario = values.scenario as ScenarioName | undefined
  const dir = values.dir ?? 'fixtures'

  const result = generate(schema, { seed, scenario })
  const filePath = snapshotPath(dir, schemaFile, scenario, seed)
  writeSnapshot(filePath, result)

  return { output: `Wrote snapshot to ${filePath}`, exitCode: 0 }
}
