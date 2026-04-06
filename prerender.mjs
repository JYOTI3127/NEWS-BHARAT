import Prerenderer from '@prerenderer/prerenderer'
import PuppeteerRenderer from '@prerenderer/renderer-puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_BASE = 'https://news4bharat.cloud/api'

const isValidSlug = (value) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !value.startsWith('/') &&
  !value.endsWith('/') &&
  !value.includes('\\') &&
  !value.includes('..')

const getCleanPathSegments = (value) =>
  String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

const getArticleSlugFromRoute = (route) => {
  const articlePath = String(route || '').replace(/^\/article\//, '')
  const segments = getCleanPathSegments(articlePath)
  return segments[segments.length - 1] || ''
}

const getArticleRoutes = (article) => {
  const segments = getCleanPathSegments(article?.slug)

  if (segments.length === 0) return []
  if (segments.length === 1) return [`/article/${segments[0]}`]
  if (segments.length === 2) return [`/article/${segments.join('/')}`]

  // Extra nested slug app routes support nahi karte, isliye safe tail route use karo.
  return [`/article/${segments[segments.length - 1]}`]
}

// Retry logic for API calls
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (i === retries - 1) throw e
      console.log(`  Retry ${i + 1}/${retries} for ${url}`)
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
    }
  }
}

// Main fix: build titles and meta directly from API data.
function buildMetaForRoute(route, articleMap, categoryMap, siteData = {}) {
  const SITE_NAME = 'News4Bharat'
  const DEFAULT_IMAGE = 'https://news4bharat.com/news4bharat-share.png'
  const BASE_URL = 'https://news4bharat.com'
  const normalizeText = (value) =>
    String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  // Homepage
  if (route === '/') {
    return {
      title: 'News4Bharat: N4B - Breaking News, India News, Perspectives, Politics, Education & Business Updates Explained',
      description: "Breaking news, explained simply. News4Bharat Bharat Explainers covers India's politics, policy, economy, and education with clear, insightful updates.",
      canonical: `${BASE_URL}/`,
      ogImage: DEFAULT_IMAGE,
      ogType: 'website',
      lcpImage: siteData.homepageHeroImage || DEFAULT_IMAGE,
      robots: 'index,follow,max-image-preview:large',
    }
  }

  // Article page
  if (route.startsWith('/article/')) {
    const slug = getArticleSlugFromRoute(route)
    const article = articleMap.get(slug)

    if (article) {
      const rawTitle = (article.title || '').trim()
      const title = rawTitle
        ? `${rawTitle} | ${SITE_NAME}`
        : `${SITE_NAME} - News As It Is`

      const description = (
        article.meta_description ||
        article.subtitle ||
        normalizeText(article.content).slice(0, 155) ||
        rawTitle ||
        `${SITE_NAME} - News As It Is`
      ).trim()

      const image = article.image_url || article.image || DEFAULT_IMAGE
      const canonical = `${BASE_URL}${route}`
      const secondaryKeywords = Array.isArray(article.secondary_keywords_list)
        ? article.secondary_keywords_list
        : String(article.secondary_keywords || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
      const tagKeywords = Array.isArray(article.tags_list)
        ? article.tags_list
        : String(article.tags || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
      const keywords = Array.from(
        new Set(
          [article.focus_keyword, ...secondaryKeywords, ...tagKeywords]
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        )
      )
      const robots = `${article.noindex ? 'noindex' : 'index'},${article.nofollow ? 'nofollow' : 'follow'},max-image-preview:large`

      return {
        title,
        description,
        canonical,
        ogImage: image,
        ogType: 'article',
        robots,
        keywords: keywords.join(', '),
        newsKeywords: tagKeywords.join(', '),
        focusKeyword: String(article.focus_keyword || '').trim(),
        secondaryKeywords: secondaryKeywords.join(', '),
        publishedAt: article.published_at || '',
        modifiedAt: article.updated_at || article.published_at || article.created_at || '',
      }
    }

    return {
      title: `${SITE_NAME} - News As It Is`,
      description: `Read the latest news on ${SITE_NAME}.`,
      canonical: `${BASE_URL}${route}`,
      ogImage: DEFAULT_IMAGE,
      ogType: 'article',
      robots: 'index,follow,max-image-preview:large',
    }
  }

  // Category page
  if (route.startsWith('/category/')) {
    const slug = route.replace('/category/', '').trim()
    const category = categoryMap.get(slug)
    const catName = category?.name || slug.replace(/-/g, ' ')

    return {
      title: `${catName} News | ${SITE_NAME}`,
      description: `Latest ${catName} news, updates and analysis on ${SITE_NAME} - News As It Is.`,
      canonical: `${BASE_URL}/category/${slug}`,
      ogImage: DEFAULT_IMAGE,
      ogType: 'website',
      robots: 'index,follow,max-image-preview:large',
    }
  }

  // Fallback
  return {
    title: `${SITE_NAME} - News As It Is`,
    description: `${SITE_NAME} - News As It Is. Breaking news from India and the world.`,
    canonical: `${BASE_URL}${route}`,
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    robots: 'index,follow,max-image-preview:large',
  }
}

// Remove old tags and inject fresh tags from API data.
function cleanupPrerenderedHtml(html, route, articleMap, categoryMap, siteData) {
  const meta = buildMetaForRoute(route, articleMap, categoryMap, siteData)

  const safeDesc = meta.description.replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeTitle = meta.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeKeywords = String(meta.keywords || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeNewsKeywords = String(meta.newsKeywords || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeFocusKeyword = String(meta.focusKeyword || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeSecondaryKeywords = String(meta.secondaryKeywords || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeRobots = String(meta.robots || 'index,follow,max-image-preview:large').replace(/"/g, '&quot;').trim()

  let cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']news_keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']focus_keyword["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']secondary_keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']og:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']twitter:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']article:[^"']*["'][^>]*>\s*/gi, '')

  const injectedTags = `
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  ${safeKeywords ? `<meta name="keywords" content="${safeKeywords}">` : ''}
  ${safeNewsKeywords ? `<meta name="news_keywords" content="${safeNewsKeywords}">` : ''}
  ${safeFocusKeyword ? `<meta name="focus_keyword" content="${safeFocusKeyword}">` : ''}
  ${safeSecondaryKeywords ? `<meta name="secondary_keywords" content="${safeSecondaryKeywords}">` : ''}
  <meta name="robots" content="${safeRobots}">
  <link rel="canonical" href="${meta.canonical}">
  <meta property="og:type" content="${meta.ogType}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${meta.canonical}">
  <meta property="og:image" content="${meta.ogImage}">
  <meta property="og:site_name" content="News4Bharat">
  <meta property="og:locale" content="en_IN">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${meta.ogImage}">
  ${meta.publishedAt ? `<meta property="article:published_time" content="${meta.publishedAt}">` : ''}
  ${meta.modifiedAt ? `<meta property="article:modified_time" content="${meta.modifiedAt}">` : ''}`

  const preloadTags =
    route === '/' && meta.lcpImage
      ? `
  <link rel="preconnect" href="https://storage.googleapis.com" crossorigin>
  <link rel="preload" as="image" href="${meta.lcpImage}" fetchpriority="high">`
      : ''

  cleaned = cleaned.replace('</head>', `${preloadTags}${injectedTags}\n</head>`)

  console.log(`    Title: ${meta.title}`)
  console.log(`    Canonical: ${meta.canonical}`)

  return cleaned
}

async function getRoutesAndData() {
  const routeSet = new Set(['/'])
  const articleMap = new Map()
  const categoryMap = new Map()
  const siteData = {
    homepageHeroImage: '',
  }

  // Articles
  try {
    const data = await fetchWithRetry(`${API_BASE}/articles/`)
    const articles = Array.isArray(data) ? data : Array.isArray(data.value) ? data.value : data.results || []
    const sortedArticles = [...articles].sort(
      (a, b) => new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0)
    )
    const homepageHeroArticle = sortedArticles.find((article) => article?.image_url || article?.image)

    siteData.homepageHeroImage =
      homepageHeroArticle?.image_url ||
      homepageHeroArticle?.image ||
      'https://news4bharat.com/news4bharat-share.png'

    let added = 0
    const detailTasks = []
    articles.forEach((a) => {
      const articleRoutes = getArticleRoutes(a)
      if (articleRoutes.length > 0) {
        const articleSlug = getArticleSlugFromRoute(articleRoutes[0])
        articleRoutes.forEach((route) => routeSet.add(route))
        articleMap.set(articleSlug, a)
        if (articleSlug) {
          detailTasks.push(
            fetchWithRetry(`${API_BASE}/articles/slug/${encodeURIComponent(articleSlug)}/`)
              .then((detail) => {
                const finalDetail = Array.isArray(detail) ? detail[0] : detail
                if (finalDetail) {
                  articleMap.set(articleSlug, finalDetail)
                }
              })
              .catch(() => {})
          )
        }
        added++
      }
    })
    await Promise.allSettled(detailTasks)
    console.log(`Added ${added}/${articles.length} article routes`)
  } catch (e) {
    console.log('Articles fetch error:', e.message)
  }

  // Categories
  try {
    const data = await fetchWithRetry(`${API_BASE}/categories/`)
    const categories = Array.isArray(data) ? data : []

    let added = 0
    categories.forEach((c) => {
      if (isValidSlug(c.slug)) {
        const cleanSlug = c.slug.trim()
        routeSet.add(`/category/${cleanSlug}`)
        categoryMap.set(cleanSlug, c)
        added++
      }
    })
    console.log(`Added ${added}/${categories.length} category routes`)
  } catch (e) {
    console.log('Categories fetch error:', e.message)
  }

  return { routes: [...routeSet], articleMap, categoryMap, siteData }
}

async function renderInBatches(prerenderer, routes, articleMap, categoryMap, siteData, batchSize = 5) {
  let success = 0
  let failed = 0
  const failedRoutes = []

  for (let i = 0; i < routes.length; i += batchSize) {
    const batch = routes.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(routes.length / batchSize)

    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} routes)`)

    await Promise.allSettled(
      batch.map(async (route) => {
        try {
          const rendered = await prerenderer.renderRoutes([route])

          rendered.forEach(({ route: r, html }) => {
            const cleanHtml = cleanupPrerenderedHtml(html, r, articleMap, categoryMap, siteData)

            const outputDir = path.join(__dirname, 'build', r)
            fs.mkdirSync(outputDir, { recursive: true })
            fs.writeFileSync(path.join(outputDir, 'index.html'), cleanHtml, 'utf8')

            console.log(`  OK ${r}`)
            success++
          })
        } catch (e) {
          console.log(`  FAIL ${route} - ${e.message}`)
          failed++
          failedRoutes.push(route)
        }
      })
    )

    if (i + batchSize < routes.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return { success, failed, failedRoutes }
}

console.log('Fetching routes and API data...')
const { routes, articleMap, categoryMap, siteData } = await getRoutesAndData()
console.log(`\nTotal ${routes.length} routes will be prerendered\n`)

const prerenderer = new Prerenderer({
  staticDir: path.join(__dirname, 'build'),
  renderer: new PuppeteerRenderer({
    renderAfterDocumentEvent: 'prerender-ready',
    timeout: 60000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    consoleHandler: () => {},
  }),
})

await prerenderer.initialize()
console.log('Prerenderer initialized\n')

const { success, failed, failedRoutes } = await renderInBatches(
  prerenderer, routes, articleMap, categoryMap, siteData, 5
)

await prerenderer.destroy()

console.log('\n' + '-'.repeat(50))
console.log('Prerendering complete!')
console.log(`   Success: ${success}`)
console.log(`   Failed:  ${failed}`)

if (failedRoutes.length > 0) {
  console.log('\nFailed routes:')
  failedRoutes.forEach((r) => console.log(`   ${r}`))
  fs.writeFileSync(
    path.join(__dirname, 'prerender-failed.txt'),
    failedRoutes.join('\n'),
    'utf8'
  )
  console.log('\nFailed routes saved to prerender-failed.txt')
}
