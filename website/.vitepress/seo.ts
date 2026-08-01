import type { HeadConfig, TransformContext } from 'vitepress'

const SITE_URL = 'https://arjvand.github.io/fixture-gen'
const SITE_NAME = 'fixture-gen'
const OG_IMAGE = `${SITE_URL}/og-card.png`
const AUTHOR = 'Alireza Arjvand'
const PUBLISHER = 'fixture-gen contributors'

function pageRoute(page: string): string {
  const withoutExt = page.replace(/\.md$/, '')
  if (withoutExt === 'index') return '/'
  if (withoutExt.endsWith('/index')) return `/${withoutExt.slice(0, -'/index'.length)}/`
  return `/${withoutExt}`
}

function breadcrumbName(segment: string): string {
  const lower = segment.toLowerCase()
  if (lower === 'api') return 'API'
  if (lower === 'faq') return 'FAQ'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function dateModified(pageData: TransformContext['pageData']): string | undefined {
  if (typeof pageData.lastUpdated === 'number') {
    return new Date(pageData.lastUpdated).toISOString()
  }
  const date = pageData.frontmatter?.date
  if (typeof date === 'string') return date
  return undefined
}

function homeStructuredData(description: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description,
      inLanguage: 'en-US',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      image: OG_IMAGE,
      description,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Node.js, Bun, Deno, edge runtimes',
      license: 'https://spdx.org/licenses/MIT.html',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Person',
        name: AUTHOR,
      },
    },
  ]
}

function articleStructuredData(title: string, description: string, route: string, pageData: TransformContext['pageData']) {
  const url = `${SITE_URL}${route}`
  const segments = route.split('/').filter(Boolean)
  const breadcrumbs = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` }]
  segments.forEach((segment, index) => {
    breadcrumbs.push({
      '@type': 'ListItem',
      position: index + 2,
      name: index === segments.length - 1 ? title : breadcrumbName(segment),
      item: `${SITE_URL}/${segments.slice(0, index + 1).join('/')}`,
    })
  })
  const modified = dateModified(pageData)
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url,
    image: OG_IMAGE,
    author: { '@type': 'Person', name: AUTHOR },
    publisher: { '@type': 'Organization', name: PUBLISHER },
    inLanguage: 'en-US',
    mainEntityOfPage: url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs,
    },
    ...(modified ? { dateModified: modified } : {}),
  }
}

export function seoHead(context: TransformContext): HeadConfig[] {
  const { page, title, description, pageData } = context
  const route = pageRoute(page)
  const url = `${SITE_URL}${route}`
  const isHome = route === '/'
  const ogTitle = isHome ? SITE_NAME : title
  const pageTitle = isHome ? SITE_NAME : pageData.title
  const structuredData = isHome
    ? homeStructuredData(description)
    : articleStructuredData(pageTitle, description, route, pageData)

  return [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:title', content: ogTitle }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { name: 'twitter:title', content: ogTitle }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(structuredData)],
  ]
}
