export type Format = 'json' | 'jsonl' | 'ts'

export function formatOutput(value: unknown, fmt: Format): string {
  switch (fmt) {
    case 'json':
      return JSON.stringify(value, null, 2)
    case 'jsonl':
      return JSON.stringify(value)
    case 'ts':
      return `export const fixture = ${JSON.stringify(value, null, 2)} as const\n`
  }
}
