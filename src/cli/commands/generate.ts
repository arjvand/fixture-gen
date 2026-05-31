export interface CommandResult {
  output: string
  exitCode: number
}

export async function runGenerate(_argv: string[]): Promise<CommandResult> {
  throw new Error('not implemented')
}
