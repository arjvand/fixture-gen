import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'fixture-gen',
  description:
    'Schema-agnostic, deterministic test fixtures for any Standard Schema validator — Zod, Valibot, ArkType, TypeBox, and more.',
  base: '/fixture-gen/',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,

  // Include base path in hostname: VitePress does not prepend `base` to sitemap URLs.
  // Trailing slash is required so relative page paths resolve under /fixture-gen/.
  sitemap: {
    hostname: 'https://arjvand.github.io/fixture-gen/',
  },

  head: [
    ['link', { rel: 'icon', href: '/fixture-gen/logo.png', type: 'image/png' }],
    ['meta', { name: 'theme-color', content: '#0d9488' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'fixture-gen' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Schema-agnostic, deterministic test fixtures for any Standard Schema validator.',
      },
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://arjvand.github.io/fixture-gen/logo.png',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],

  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'fixture-gen',

    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: 'Ecosystem', link: '/ecosystem/', activeMatch: '/ecosystem/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'FAQ', link: '/faq' },
      {
        text: 'v1.4',
        items: [
          { text: 'Changelog', link: 'https://github.com/arjvand/fixture-gen/releases' },
          { text: 'Roadmap', link: '/roadmap' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Install', link: '/guide/install' },
          ],
        },
        {
          text: 'Core concepts',
          items: [
            { text: 'Deterministic generation', link: '/guide/determinism' },
            { text: 'Overrides & generators', link: '/guide/overrides-generators' },
            { text: 'Scenarios', link: '/guide/scenarios' },
            { text: 'Relational generation', link: '/guide/relational' },
            { text: 'Advanced constraints', link: '/guide/advanced-constraints' },
          ],
        },
        {
          text: 'Tooling',
          items: [
            { text: 'CLI', link: '/guide/cli' },
            { text: 'JSON Schema & OpenAPI', link: '/guide/json-schema-openapi' },
            { text: 'Comparison', link: '/guide/comparison' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [{ text: 'Overview', link: '/api/' }],
        },
      ],
      '/ecosystem/': [
        {
          text: 'Ecosystem',
          items: [
            { text: 'Overview', link: '/ecosystem/' },
            { text: '@fixture-gen/vitest', link: '/ecosystem/vitest' },
            { text: '@fixture-gen/jest', link: '/ecosystem/jest' },
            { text: '@fixture-gen/playwright', link: '/ecosystem/playwright' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/arjvand/fixture-gen' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/fixture-gen' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/arjvand/fixture-gen/edit/master/website/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © fixture-gen contributors',
    },

    outline: {
      level: [2, 3],
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
})
