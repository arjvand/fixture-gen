#!/usr/bin/env node
/**
 * Renders the Open Graph / social card (1200x630) for the docs site.
 *
 * Requires ImageMagick 7 (`magick`). Run from the repo root:
 *
 *   node scripts/generate-og-card.mjs
 *
 * Fonts can be overridden with FIXTURE_GEN_CARD_FONT and FIXTURE_GEN_CARD_FONT_BOLD
 * if DejaVu Sans is not installed.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const logo = path.join(root, 'website', 'public', 'logo.png')
const out = path.join(root, 'website', 'public', 'og-card.png')
const font = process.env.FIXTURE_GEN_CARD_FONT ?? '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
const fontBold =
  process.env.FIXTURE_GEN_CARD_FONT_BOLD ?? '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

const width = 1200
const height = 630

execFileSync(
  'magick',
  [
    '-size',
    `${width}x${height}`,
    'gradient:#f0fdfa-#b2f5ea',
    '-font',
    fontBold,
    '-pointsize',
    '92',
    '-fill',
    '#134e4a',
    '-gravity',
    'northwest',
    '-annotate',
    '+90+120',
    'fixture-gen',
    '-font',
    font,
    '-pointsize',
    '28',
    '-fill',
    '#0f766e',
    '-annotate',
    '+90+245',
    'Test data that always matches your schema',
    '-font',
    font,
    '-pointsize',
    '21',
    '-fill',
    '#115e59',
    '-annotate',
    '+90+315',
    'deterministic · schema-valid · zero runtime dependencies',
    '-font',
    font,
    '-pointsize',
    '21',
    '-fill',
    '#0d9488',
    '-annotate',
    '+90+385',
    'Zod · Valibot · ArkType · TypeBox · JSON Schema · OpenAPI',
    '-font',
    font,
    '-pointsize',
    '20',
    '-fill',
    '#0f766e',
    '-annotate',
    '+90+560',
    'npm i -D fixture-gen',
    '-fill',
    '#0d9488',
    '-draw',
    `rectangle 0,${height - 20} ${width},${height}`,
    '(',
    logo,
    '-resize',
    '400x400',
    ')',
    '-gravity',
    'east',
    '-geometry',
    '+70+0',
    '-composite',
    '-depth',
    '8',
    '-strip',
    out,
  ],
  { stdio: 'inherit' },
)

console.log(`Wrote ${out}`)
