import type { IntrospectedNode } from './introspect'
import type { Prng } from './prng'

const DATE_ANCHOR = 946684800000
const DATE_SPREAD = 315360000000

export function generateValue(node: IntrospectedNode, prng: Prng): unknown {
  switch (node.kind) {
    case 'string':
      return generateString(node.constraints, prng)
    case 'number':
      return generateNumber(node.constraints, prng)
    case 'integer':
      return generateInteger(node.constraints, prng)
    case 'boolean':
      return prng.bool()
    case 'date':
      return new Date(DATE_ANCHOR + prng.int(0, DATE_SPREAD))
    case 'object': {
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(node.entries)) {
        const child = node.entries[key]
        if (child) result[key] = generateValue(child, prng)
      }
      return result
    }
    case 'array': {
      const min = node.constraints?.minLength ?? 1
      const max = node.constraints?.maxLength ?? Math.max(min, 3)
      const length = prng.int(min, max)
      return Array.from({ length }, () => generateValue(node.element, prng))
    }
    case 'tuple': {
      const values = node.elements.map((el) => generateValue(el, prng))
      if (node.rest) {
        const extra = prng.int(0, 2)
        for (let i = 0; i < extra; i++) values.push(generateValue(node.rest, prng))
      }
      return values
    }
    case 'record': {
      const count = prng.int(1, 3)
      const result: Record<string, unknown> = {}
      for (let i = 0; i < count; i++) {
        const key = String(generateValue(node.key, prng))
        result[key] = generateValue(node.value, prng)
      }
      return result
    }
    case 'optional':
    case 'nullable':
    case 'default':
    case 'catch':
      return generateValue(node.inner, prng)
    case 'union':
      return generateValue(prng.pick(node.members), prng)
    case 'enum':
      return prng.pick(node.values)
    case 'literal':
      return node.value
    default:
      return undefined
  }
}

// ── String ───────────────────────────────────────────────────────────────────

type StringConstraints = NonNullable<Extract<IntrospectedNode, { kind: 'string' }>['constraints']>
type NumberConstraints = NonNullable<Extract<IntrospectedNode, { kind: 'number' }>['constraints']>

function generateString(constraints: StringConstraints | undefined, prng: Prng): string {
  if (constraints?.format) {
    switch (constraints.format) {
      case 'uuid':
        return generateUuid(prng)
      case 'email':
        return generateEmail(prng)
      case 'url':
      case 'uri':
        return generateUrl(prng)
      case 'datetime':
        return generateDatetime(prng)
      case 'date':
        return generateDateOnly(prng)
      case 'time':
        return generateTime(prng)
      case 'ip':
      case 'ipv4':
        return generateIpv4(prng)
      case 'ipv6':
        return generateIpv6(prng)
      case 'cuid':
        return `c${prng.string(24)}`
      case 'cuid2':
        return prng.string(24)
      case 'nanoid':
        return prng.string(21)
      case 'base64': {
        const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        const len = prng.int(4, 16)
        let out = ''
        for (let i = 0; i < len; i++) out += b64[prng.int(0, b64.length - 1)] ?? 'A'
        const pad = (4 - (out.length % 4)) % 4
        return out + '='.repeat(pad)
      }
      case 'emoji':
        return (['😀', '🎉', '🔥', '✨', '🌟'] as const)[prng.int(0, 4)] ?? '😀'
    }
  }
  const min = constraints?.minLength ?? 4
  const max = constraints?.maxLength ?? Math.max(min, 12)
  return prng.string(prng.int(min, max))
}

function generateUuid(prng: Prng): string {
  const h = () => prng.int(0, 15).toString(16)
  const hn = (n: number) => Array.from({ length: n }, h).join('')
  const variant = (['8', '9', 'a', 'b'] as const)[prng.int(0, 3)] ?? '8'
  return `${hn(8)}-${hn(4)}-4${hn(3)}-${variant}${hn(3)}-${hn(12)}`
}

function generateEmail(prng: Prng): string {
  const domains = ['example.com', 'test.org', 'mail.net'] as const
  return `${prng.string(prng.int(4, 8))}@${prng.pick(domains)}`
}

function generateUrl(prng: Prng): string {
  const tlds = ['com', 'org', 'net'] as const
  return `https://${prng.string(prng.int(4, 8))}.${prng.pick(tlds)}`
}

function generateDatetime(prng: Prng): string {
  const year = prng.int(2000, 2030)
  const month = String(prng.int(1, 12)).padStart(2, '0')
  const day = String(prng.int(1, 28)).padStart(2, '0')
  const hour = String(prng.int(0, 23)).padStart(2, '0')
  const min = String(prng.int(0, 59)).padStart(2, '0')
  const sec = String(prng.int(0, 59)).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`
}

function generateDateOnly(prng: Prng): string {
  const year = prng.int(2000, 2030)
  const month = String(prng.int(1, 12)).padStart(2, '0')
  const day = String(prng.int(1, 28)).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function generateTime(prng: Prng): string {
  const hour = String(prng.int(0, 23)).padStart(2, '0')
  const min = String(prng.int(0, 59)).padStart(2, '0')
  const sec = String(prng.int(0, 59)).padStart(2, '0')
  return `${hour}:${min}:${sec}`
}

function generateIpv4(prng: Prng): string {
  return `${prng.int(1, 254)}.${prng.int(0, 255)}.${prng.int(0, 255)}.${prng.int(1, 254)}`
}

function generateIpv6(prng: Prng): string {
  const p = () => prng.int(0, 65535).toString(16).padStart(4, '0')
  return `${p()}:${p()}:${p()}:${p()}:${p()}:${p()}:${p()}:${p()}`
}

// ── Number ───────────────────────────────────────────────────────────────────

function generateNumber(constraints: NumberConstraints | undefined, prng: Prng): number {
  const lo =
    constraints?.min !== undefined
      ? constraints.minInclusive === false
        ? constraints.min + 1e-9
        : constraints.min
      : 0
  const hi =
    constraints?.max !== undefined
      ? constraints.maxInclusive === false
        ? constraints.max - 1e-9
        : constraints.max
      : lo + 1000
  return lo + prng.next() * (hi - lo)
}

function generateInteger(constraints: NumberConstraints | undefined, prng: Prng): number {
  const lo =
    constraints?.min !== undefined
      ? constraints.minInclusive === false
        ? Math.floor(constraints.min) + 1
        : Math.ceil(constraints.min)
      : 0
  const hi =
    constraints?.max !== undefined
      ? constraints.maxInclusive === false
        ? Math.ceil(constraints.max) - 1
        : Math.floor(constraints.max)
      : lo + 1000
  return prng.int(lo, hi)
}
