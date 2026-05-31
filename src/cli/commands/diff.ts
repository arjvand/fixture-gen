import { parseArgs } from 'node:util'
import { generate } from '../../generate'
import { loadSchema } from '../loader'
import { snapshotPath, readSnapshot } from '../snapshots'
import { computeDiff, formatDiffHuman, hasDrift } from '../diff'
import type { ScenarioName } from '../../scenario'
import type { CommandResult } from './generate'

export async function runDiff(argv: string[]): Promise<CommandResult> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      scenario: { type: 'string' },
      seed: { type: 'string' },
      dir: { type: 'string', default: 'fixtures' },
      format: { type: 'string' },
    },
  })

  const schemaFile = positionals[0]
  if (!schemaFile) {
    process.stderr.write(
      'Usage: fixture-gen diff <schema-file> [--scenario <name>] [--seed <n>] [--dir fixtures/] [--format json]\n',
    )
    return { output: '', exitCode: 1 }
  }

  const schema = await loadSchema(schemaFile)
  const seed = values.seed !== undefined ? Number(values.seed) : 0
  const scenario = values.scenario as ScenarioName | undefined
  const dir = values.dir ?? 'fixtures'

  const current = generate(schema, { seed, scenario })
  const snapshotFile = snapshotPath(dir, schemaFile, scenario, seed)
  const stored = readSnapshot(snapshotFile)

  if (stored === undefined) {
    process.stderr.write(
      `No snapshot found at ${snapshotFile}. Run 'fixture-gen snapshot ${schemaFile}' first.\n`,
    )
    return { output: '', exitCode: 1 }
  }

  const diff = computeDiff(stored, current)
  if (!hasDrift(diff)) {
    return { output: 'No drift detected.', exitCode: 0 }
  }

  if (values.format === 'json') {
    return { output: JSON.stringify(diff, null, 2), exitCode: 1 }
  }

  return { output: formatDiffHuman(diff), exitCode: 1 }
}
