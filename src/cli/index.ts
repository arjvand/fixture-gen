import { runGenerate } from './commands/generate'
import { runSnapshot } from './commands/snapshot'
import { runDiff } from './commands/diff'
import { runWatch } from './commands/watch'

const [, , command, ...rest] = process.argv

async function main(): Promise<void> {
  switch (command) {
    case 'generate': {
      const { output, exitCode } = await runGenerate(rest)
      if (output) process.stdout.write(output + '\n')
      process.exit(exitCode)
    }
    case 'snapshot': {
      const { output, exitCode } = await runSnapshot(rest)
      if (output) process.stdout.write(output + '\n')
      process.exit(exitCode)
    }
    case 'diff': {
      const { output, exitCode } = await runDiff(rest)
      if (output) process.stdout.write(output + '\n')
      process.exit(exitCode)
    }
    case 'watch': {
      await runWatch(rest)
      break
    }
    default: {
      process.stderr.write(
        'Usage: fixture-gen <generate|snapshot|diff|watch> <schema-file> [options]\n',
      )
      process.exit(1)
    }
  }
}

main().catch((err: unknown) => {
  process.stderr.write(String(err instanceof Error ? err.message : err) + '\n')
  process.exit(1)
})
