import { runDiff } from './commands/diff'
import { runGenerate } from './commands/generate'
import { runSnapshot } from './commands/snapshot'
import { runWatch } from './commands/watch'

const [, , command, ...rest] = process.argv

async function main(): Promise<void> {
  if (command === 'watch') {
    await runWatch(rest)
    return
  }

  if (command !== 'generate' && command !== 'snapshot' && command !== 'diff') {
    process.stderr.write(
      'Usage: fixture-gen <generate|snapshot|diff|watch> <schema-file> [options]\n',
    )
    process.exit(1)
  }

  const handler =
    command === 'generate' ? runGenerate : command === 'snapshot' ? runSnapshot : runDiff
  const { output, exitCode } = await handler(rest)
  if (output) process.stdout.write(`${output}\n`)
  process.exit(exitCode)
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
