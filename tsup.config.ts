import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    target: 'es2022',
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
  },
  {
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    target: 'node18',
    clean: false,
    sourcemap: false,
    treeshake: true,
    banner: { js: '#!/usr/bin/env node' },
  },
])
