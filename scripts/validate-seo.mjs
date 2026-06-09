import fs from 'node:fs'
import path from 'node:path'

const BUILD_DIR = path.resolve('build')

const defaultPages = [
  '/',
  '/about-us',
  '/privacy-policy',
  '/terms-and-conditions',
  '/contact-us',
]

const args = process.argv.slice(2)
const pages = args.length > 0 ? args : defaultPages

const toHtmlPath = (route) => {
  const cleanRoute = String(route || '/').split('?')[0].replace(/\/+$/, '')
  if (!cleanRoute || cleanRoute === '/') return path.join(BUILD_DIR, 'index.html')
  const routeIndexPath = path.join(BUILD_DIR, cleanRoute.replace(/^\/+/, ''), 'index.html')
  if (fs.existsSync(routeIndexPath)) return routeIndexPath
  return path.join(BUILD_DIR, '__prerender', `${cleanRoute.replace(/^\/+/, '')}.html`)
}

const getAttr = (tag, attr) => {
  const match = String(tag || '').match(new RegExp(`${attr}=["']([^"']*)["']`, 'i'))
  return match ? match[1].trim() : ''
}

const findMeta = (html, selectorName, value) => {
  const attr = selectorName === 'property' ? 'property' : 'name'
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=["']${value}["'])[^>]*>`, 'i')
  const tag = String(html || '').match(pattern)?.[0] || ''
  return getAttr(tag, 'content')
}

const findCanonical = (html) => {
  const tag = String(html || '').match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i)?.[0] || ''
  return getAttr(tag, 'href')
}

const findJsonLdTypes = (html) => {
  const scripts = [...String(html || '').matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)]
  const types = new Set()

  scripts.forEach((match) => {
    try {
      const parsed = JSON.parse(match[1].trim())
      const addType = (value) => {
        if (Array.isArray(value)) value.forEach(addType)
        else if (value) types.add(String(value))
      }
      const visit = (node) => {
        if (!node || typeof node !== 'object') return
        addType(node['@type'])
        Object.values(node).forEach((value) => {
          if (Array.isArray(value)) value.forEach(visit)
          else visit(value)
        })
      }
      visit(parsed)
    } catch {
      types.add('INVALID_JSON_LD')
    }
  })

  return [...types].sort()
}

const validatePage = (route) => {
  const htmlPath = toHtmlPath(route)
  const result = {
    route,
    htmlPath,
    ok: true,
    checks: {},
  }

  if (!fs.existsSync(htmlPath)) {
    result.ok = false
    result.error = 'HTML file missing'
    return result
  }

  const html = fs.readFileSync(htmlPath, 'utf8')
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || ''
  const description = findMeta(html, 'name', 'description')
  const robots = findMeta(html, 'name', 'robots')
  const canonical = findCanonical(html)
  const ogTitle = findMeta(html, 'property', 'og:title')
  const ogDescription = findMeta(html, 'property', 'og:description')
  const twitterTitle = findMeta(html, 'name', 'twitter:title')
  const twitterDescription = findMeta(html, 'name', 'twitter:description')
  const jsonLdTypes = findJsonLdTypes(html)
  const h1Count = (html.match(/<h1\b/gi) || []).length
  const articleContent =
    /data-prerender-article-body|class=["'][^"']*article-content/i.test(html) ||
    /<article\b/i.test(html)

  result.checks = {
    title,
    description,
    robots,
    canonical,
    ogTitle,
    ogDescription,
    twitterTitle,
    twitterDescription,
    jsonLdTypes,
    h1Count,
    articleContent,
  }

  const required = [
    ['title', title],
    ['description', description],
    ['robots', robots],
    ['canonical', canonical],
    ['og:title', ogTitle],
    ['og:description', ogDescription],
    ['twitter:title', twitterTitle],
    ['twitter:description', twitterDescription],
    ['jsonLd', jsonLdTypes.length > 0 && !jsonLdTypes.includes('INVALID_JSON_LD')],
    ['h1', h1Count > 0],
  ]

  required.forEach(([name, pass]) => {
    if (!pass) {
      result.ok = false
      result.checks[`${name}Missing`] = true
    }
  })

  if (/\/[^/]+\/[^/]+\/?$/.test(route) && !route.startsWith('/category/')) {
    const hasNewsArticle = jsonLdTypes.includes('NewsArticle') || jsonLdTypes.includes('Article')
    const hasBreadcrumb = jsonLdTypes.includes('BreadcrumbList')
    if (!hasNewsArticle || !hasBreadcrumb || !articleContent) {
      result.ok = false
      result.checks.articleSeoMissing = {
        hasNewsArticle,
        hasBreadcrumb,
        articleContent,
      }
    }
  }

  if (route.startsWith('/category/') && !jsonLdTypes.includes('BreadcrumbList')) {
    result.ok = false
    result.checks.categoryBreadcrumbMissing = true
  }

  return result
}

const results = pages.map(validatePage)

results.forEach((result) => {
  const status = result.ok ? 'OK' : 'FAIL'
  console.log(`\n${status} ${result.route}`)
  if (result.error) {
    console.log(`  ${result.error}: ${result.htmlPath}`)
    return
  }
  console.log(`  title: ${result.checks.title}`)
  console.log(`  description: ${result.checks.description}`)
  console.log(`  canonical: ${result.checks.canonical}`)
  console.log(`  robots: ${result.checks.robots}`)
  console.log(`  jsonLd: ${result.checks.jsonLdTypes.join(', ') || 'none'}`)
  console.log(`  h1Count: ${result.checks.h1Count}`)
})

const failed = results.filter((result) => !result.ok)
if (failed.length > 0) {
  console.error(`\nSEO validation failed for ${failed.length}/${results.length} page(s).`)
  process.exit(1)
}

console.log(`\nSEO validation passed for ${results.length} page(s).`)
