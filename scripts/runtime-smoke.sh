#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
consumer_root="$(mktemp -d -t fixture-gen-runtime-XXXXXX)"
consumer_dir="$consumer_root/consumer"

cleanup() {
  rm -rf "$consumer_root"
}

trap cleanup EXIT

mkdir -p "$consumer_dir/node_modules"
ln -sfn "$repo_root" "$consumer_dir/node_modules/fixture-gen"

cat >"$consumer_dir/package.json" <<'EOF'
{
  "name": "fixture-gen-runtime-smoke",
  "private": true,
  "type": "module"
}
EOF

cat >"$consumer_dir/smoke.mjs" <<'EOF'
import { generate } from 'fixture-gen'

const kind = Symbol('TypeBox.Kind')
const optional = Symbol('TypeBox.Optional')

const schema = {
  [kind]: 'Object',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 4, maxLength: 12 },
    score: { type: 'integer', minimum: 10, maximum: 20 },
    nickname: { [optional]: true, type: 'string', minLength: 2, maxLength: 8 },
  },
  required: ['id', 'name', 'score'],
}

const first = generate(schema, { seed: 42 })
const second = generate(schema, { seed: 42 })

if (JSON.stringify(first) !== JSON.stringify(second)) {
  throw new Error('generate() is not deterministic for a fixed seed')
}

if (!first || typeof first !== 'object' || Array.isArray(first)) {
  throw new Error('expected an object fixture')
}

const { id, name, score, nickname } = first

if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
  throw new Error('expected a generated uuid')
}

if (typeof name !== 'string' || name.length < 4 || name.length > 12) {
  throw new Error('expected a constrained string name')
}

if (!Number.isInteger(score) || score < 10 || score > 20) {
  throw new Error('expected a constrained integer score')
}

if (typeof nickname !== 'string' || nickname.length < 2 || nickname.length > 8) {
  throw new Error('expected a generated optional string field')
}

globalThis.__fixtureGenSmoke = first
EOF

cat >"$consumer_dir/smoke.ts" <<'EOF'
import { VERSION, generate, generateMany, generateRelational } from 'fixture-gen'
import type { StandardSchemaV1 } from 'fixture-gen'

const schema: StandardSchemaV1<unknown, { id: string; name: string }> = {
  '~standard': {
    version: 1,
    vendor: 'runtime-smoke',
    validate: (value) => ({ value: value as { id: string; name: string } }),
  },
}

const single: { id: string; name: string } = generate(schema, { seed: 42 })
const batch: Array<{ id: string; name: string }> = generateMany(schema, 2, { seed: 1 })
const relational = generateRelational(
  { users: schema },
  {
    counts: { users: 1 },
  },
)

const version: string = VERSION
const users: Array<{ id: string; name: string }> = relational.users

void single
void batch
void version
void users
EOF

assert_packaging() {
  node -e "
    const fs = require('node:fs')
    const pkg = JSON.parse(fs.readFileSync('$repo_root/package.json', 'utf8'))
    if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
      throw new Error('runtime dependencies must stay empty')
    }
  "
}

run_typecheck() {
  "$repo_root/node_modules/typescript/bin/tsc" \
    --noEmit \
    --strict \
    --noUncheckedIndexedAccess \
    --module nodenext \
    --moduleResolution nodenext \
    --target es2022 \
    --skipLibCheck \
    smoke.ts
}

cd "$consumer_dir"

run_node_smoke() {
  node smoke.mjs
}

run_bun_smoke() {
  bun smoke.mjs
}

run_deno_smoke() {
  deno run --node-modules-dir=auto smoke.mjs
}

run_edge_smoke() {
  REPO_ROOT="$repo_root" CONSUMER_DIR="$consumer_dir" node <<'NODE'
const { join } = require('node:path')
const { build } = require(join(process.env.REPO_ROOT, 'node_modules', 'esbuild'))
const { EdgeVM } = require(join(process.env.REPO_ROOT, 'node_modules', '@edge-runtime', 'vm'))

;(async () => {
  const consumerDir = process.env.CONSUMER_DIR
  const smokePath = join(consumerDir, 'smoke.mjs')
  const bundled = await build({
    entryPoints: [smokePath],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    write: false,
  })
  const code = bundled.outputFiles[0] && bundled.outputFiles[0].text
  if (!code) throw new Error('edge bundle did not produce output')

  const vm = new EdgeVM()
  vm.evaluate(code)
  const value = vm.context.__fixtureGenSmoke
  if (!value || typeof value !== 'object') {
    throw new Error('edge smoke did not produce an object')
  }
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
NODE
}

assert_packaging
run_typecheck

if [[ -n "${RUNTIME_SMOKE_TARGET:-}" ]]; then
  case "${RUNTIME_SMOKE_TARGET,,}" in
    node)
      run_node_smoke
      ;;
    bun)
      run_bun_smoke
      ;;
    deno)
      run_deno_smoke
      ;;
    edge)
      run_edge_smoke
      ;;
    *)
      echo "Unknown RUNTIME_SMOKE_TARGET: ${RUNTIME_SMOKE_TARGET}" >&2
      exit 1
      ;;
  esac
else
  run_node_smoke
  if command -v bun >/dev/null 2>&1; then
    run_bun_smoke
  fi
  if command -v deno >/dev/null 2>&1; then
    run_deno_smoke
  fi
  run_edge_smoke
fi
