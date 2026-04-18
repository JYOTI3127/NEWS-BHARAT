import Prerenderer from '@prerenderer/prerenderer'
import PuppeteerRenderer from '@prerenderer/renderer-puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import {
  getArticlePath,
  getCanonicalArticleUrl,
  isArticlePath,
} from './src/lib/articleUrl.js'
import { STATIC_PAGE_SEO as SHARED_STATIC_PAGE_SEO } from './src/lib/staticPageSeo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_BASE = 'https://news4bharat.cloud/api'
const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH || ''

const STATIC_PAGE_META = {
  '/about-us': {
    title: 'About News4Bharat | Independent Digital News Portal India',
    description: 'Learn about News4Bharat, our mission, editorial values, and commitment to delivering accurate, unbiased, and timely news across India & the World.',
    keywords: 'about News4Bharat, Indian news platform, news mission India',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | News4Bharat Data Protection & User Privacy',
    description: 'Read News4Bharat’s privacy policy to understand how we collect, use, and protect your personal data while you use our platform.',
    keywords: 'privacy policy News4Bharat, data protection India website, user privacy policy',
  },
  '/editorial-policy': {
    title: 'Editorial Policy | News4Bharat Journalism Standards & Ethics',
    description: 'Explore News4Bharat’s editorial policy, covering our fact-checking process, content guidelines, and commitment to ethical journalism.',
    keywords: 'editorial policy news website, journalism ethics India, fact-checking policy',
  },
  '/contact-us': {
    title: 'Contact News4Bharat | Get in Touch with Our Team',
    description: 'Reach out to News4Bharat for feedback, partnerships, press inquiries, or support. We’re here to assist you.',
    keywords: 'contact News4Bharat, news website contact India, media inquiries',
  },
  '/founders-note': {
    title: 'Founder’s Note | Vision Behind News4Bharat',
    description: 'Read the founder’s note to understand the vision, purpose, and inspiration behind launching News4Bharat.',
    keywords: 'founder message news website, News4Bharat vision, founder story India media',
  },
  '/disclaimer': {
    title: 'Disclaimer | News4Bharat Content & Liability Information',
    description: 'Review the News4Bharat disclaimer regarding content accuracy, external links, and limitations of liability.',
    keywords: 'news disclaimer India, website liability disclaimer, News4Bharat terms',
  },
  '/terms-and-conditions': {
    title: 'Terms & Conditions | News4Bharat User Agreement',
    description: 'Read the terms and conditions for using News4Bharat, including user responsibilities, content usage, and legal terms.',
    keywords: 'terms and conditions news website, user agreement India website',
  },
  '/careers': {
    title: 'Careers at News4Bharat | Jobs in Media & Journalism India',
    description: 'Explore career opportunities at News4Bharat. Join our team of journalists, editors, and content creators shaping the future of news in India.',
  },
}

Object.assign(STATIC_PAGE_META, SHARED_STATIC_PAGE_SEO)

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

const getArticleSlugFromRoute = (route) =>
  getCleanPathSegments(route).pop() || ''

const getRobotsContent = (article) => {
  const parts = [
    article?.noindex ? 'noindex' : 'index',
    article?.nofollow ? 'nofollow' : 'follow',
  ]

  if (!article?.noindex) {
    parts.push('max-snippet:-1', 'max-image-preview:large')
  }

  return parts.join(',')
}

const getArticleRoutes = (article) => {
  const routes = new Set()
  const primaryPath = getArticlePath(article)
  if (primaryPath) {
    routes.add(primaryPath)
  }
  return [...routes]
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

const getListFromApiResponse = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : data?.results || []

const getGithubDispatchPayload = () => {
  if (!GITHUB_EVENT_PATH || !fs.existsSync(GITHUB_EVENT_PATH)) return null

  try {
    const event = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, 'utf8'))
    const payload = event?.client_payload

    if (!payload || typeof payload !== 'object') return null

    const slug = String(
      payload.slug ||
      payload.article_slug ||
      payload.articleSlug ||
      ''
    ).trim()

    return {
      eventType: String(event?.action || '').trim(),
      slug,
      title: String(payload.title || payload.article_title || '').trim(),
      raw: payload,
    }
  } catch (error) {
    console.log(`Could not read GitHub event payload: ${error.message}`)
    return null
  }
}

const stripLazyChunkPreloads = (html) =>
  html.replace(
    /<link\b(?=[^>]*\brel=["']modulepreload["'])(?=[^>]*\bas=["']script["'])[^>]*>\s*/gi,
    ''
  )

// Main fix: build titles and meta directly from API data.
function buildMetaForRoute(route, articleMap, categoryMap, siteData = {}) {
  const SITE_NAME = 'News4Bharat'
  const DEFAULT_IMAGE = 'https://news4bharat.com/news4bharat-share.png'
  const BASE_URL = 'https://news4bharat.com'
  const TWITTER_HANDLE = '@news4_bharat'
  const normalizeText = (value) =>
    String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const truncateText = (value, maxLength) => {
    const text = normalizeText(value)
    if (!text || text.length <= maxLength) return text
    return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
  }
  const toAbsoluteUrl = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized) return ''

    try {
      return new URL(normalized, BASE_URL).toString()
    } catch {
      return ''
    }
  }

  // Homepage
  if (route === '/') {
    return {
      title: 'News4Bharat - India News, Economy, Politics & Explainers',
      description: 'News4Bharat covers breaking India news, economy, politics, startups, and explainers with verified reporting and clear analysis for Bharat-first readers.',
      canonical: `${BASE_URL}/`,
      ogImage: DEFAULT_IMAGE,
      ogType: 'website',
      lcpImage: siteData.homepageHeroImage || DEFAULT_IMAGE,
      robots: 'index,follow,max-image-preview:large',
      twitterSite: TWITTER_HANDLE,
    }
  }

  // Static policy/company pages
  if (STATIC_PAGE_META[route]) {
    const page = STATIC_PAGE_META[route]

    return {
      title: page.title,
      description: page.description,
      keywords: page.keywords || '',
      canonical: `${BASE_URL}${route}`,
      ogImage: DEFAULT_IMAGE,
      ogType: 'website',
      robots: 'index,follow,max-image-preview:large',
      twitterSite: TWITTER_HANDLE,
    }
  }

  // Article page
  if (isArticlePath(route)) {
    const article = articleMap.get(route)

    if (article) {
      const rawTitle = (article.title || '').trim()
      const title = rawTitle
        ? `${rawTitle} | ${SITE_NAME}`
        : `${SITE_NAME} - News As It Is`

      const description = (
        article.meta_description ||
        article.subtitle ||
        article.summary ||
        article.excerpt ||
        article.description ||
        rawTitle ||
        `${SITE_NAME} - News As It Is`
      ).trim()

      const image = toAbsoluteUrl(article.image_url || article.image) || DEFAULT_IMAGE
      const canonical = getCanonicalArticleUrl(article) || `${BASE_URL}${route}`
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
      const robots = getRobotsContent(article)
      const publishedAt = article.published_at || article.created_at || ''
      const modifiedAt = article.updated_at || article.published_at || article.created_at || ''
      const primaryCategory = Array.isArray(article.category_details)
        ? article.category_details[0]
        : article.category_details || article.category || null
      const categoryName = String(primaryCategory?.name || '').trim()
      const authorName = String(
        article.display_author_name ||
          article.author_display_name ||
          article.author_name ||
          article.posted_by_fullname ||
          SITE_NAME
      ).trim()
      const articleTags = Array.from(new Set(tagKeywords))

      return {
        title,
        description,
        canonical,
        ogImage: image,
        ogImageAlt: String(article.image_alt || rawTitle || SITE_NAME).trim(),
        ogType: 'article',
        robots,
        author: authorName,
        articleSection: categoryName,
        articleTags,
        keywords: keywords.join(', '),
        newsKeywords: articleTags.join(', '),
        focusKeyword: String(article.focus_keyword || '').trim(),
        secondaryKeywords: secondaryKeywords.join(', '),
        publishedAt,
        modifiedAt,
        twitterSite: TWITTER_HANDLE,
      }
    }

    return {
      title: `${SITE_NAME} - News As It Is`,
      description: `Read the latest news on ${SITE_NAME}.`,
      canonical: `${BASE_URL}${route}`,
      ogImage: DEFAULT_IMAGE,
      ogType: 'article',
      robots: 'index,follow,max-image-preview:large',
      twitterSite: TWITTER_HANDLE,
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
      twitterSite: TWITTER_HANDLE,
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
    twitterSite: TWITTER_HANDLE,
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
  const safeAuthor = String(meta.author || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeArticleSection = String(meta.articleSection || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeOgImageAlt = String(meta.ogImageAlt || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeTwitterSite = String(meta.twitterSite || '').replace(/"/g, '&quot;').trim()
  const articleTags = Array.isArray(meta.articleTags) ? meta.articleTags : []
  const safeArticleTags = articleTags
    .map((tag) => String(tag || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim())
    .filter(Boolean)

  let cleaned = stripLazyChunkPreloads(html)
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']author["'][^>]*>\s*/gi, '')
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
  ${safeAuthor ? `<meta name="author" content="${safeAuthor}">` : ''}
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
  ${safeOgImageAlt ? `<meta property="og:image:alt" content="${safeOgImageAlt}">` : ''}
  <meta property="og:site_name" content="News4Bharat">
  <meta property="og:locale" content="en_IN">
  ${safeAuthor ? `<meta property="article:author" content="${safeAuthor}">` : ''}
  ${safeArticleSection ? `<meta property="article:section" content="${safeArticleSection}">` : ''}
  ${safeArticleTags.map((tag) => `<meta property="article:tag" content="${tag}">`).join('\n  ')}
  <meta name="twitter:card" content="summary_large_image">
  ${safeTwitterSite ? `<meta name="twitter:site" content="${safeTwitterSite}">` : ''}
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:url" content="${meta.canonical}">
  <meta name="twitter:image" content="${meta.ogImage}">
  ${safeOgImageAlt ? `<meta name="twitter:image:alt" content="${safeOgImageAlt}">` : ''}
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
  const dispatchPayload = getGithubDispatchPayload()
  const siteData = {
    homepageHeroImage: '',
  }

  Object.keys(STATIC_PAGE_META).forEach((route) => routeSet.add(route))

  // Articles
  try {
    const cacheBust = `_=${Date.now()}`
    const data = await fetchWithRetry(`${API_BASE}/articles/?limit=100&${cacheBust}`)
    const articles = getListFromApiResponse(data)
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
        articleRoutes.forEach((route) => {
          routeSet.add(route)
          articleMap.set(route, a)
        })
        if (articleSlug) {
          detailTasks.push(
            fetchWithRetry(`${API_BASE}/articles/slug/${encodeURIComponent(articleSlug)}/?${cacheBust}`)
              .then((detail) => {
                const finalDetail = Array.isArray(detail) ? detail[0] : detail
                if (finalDetail) {
                  articleRoutes.forEach((route) => {
                    articleMap.set(route, finalDetail)
                  })
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

    if (dispatchPayload?.slug) {
      try {
        const forcedDetail = await fetchWithRetry(
          `${API_BASE}/articles/slug/${encodeURIComponent(dispatchPayload.slug)}?${cacheBust}`
        )
        const forcedArticle = Array.isArray(forcedDetail) ? forcedDetail[0] : forcedDetail

        if (forcedArticle && (forcedArticle.slug || forcedArticle.id)) {
          const forcedRoutes = getArticleRoutes(forcedArticle)

          forcedRoutes.forEach((route) => routeSet.add(route))
          forcedRoutes.forEach((route) => {
            articleMap.set(route, forcedArticle)
          })

          console.log(
            `Forced prerender article from dispatch payload: ${dispatchPayload.slug} (${forcedRoutes.join(', ')})`
          )
        }
      } catch (error) {
        console.log(`Dispatch payload article fetch failed for ${dispatchPayload.slug}: ${error.message}`)
      }
    }
  } catch (e) {
    console.log('Articles fetch error:', e.message)
  }

  // Categories
  try {
    const data = await fetchWithRetry(`${API_BASE}/categories/?_=${Date.now()}`)
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

function ensureStaticPageHtml(articleMap, categoryMap, siteData) {
  const shellPath = path.join(__dirname, 'build', 'index.html')

  if (!fs.existsSync(shellPath)) {
    console.log('Static page fallback skipped because build/index.html was not found')
    return
  }

  const shellHtml = fs.readFileSync(shellPath, 'utf8')

  Object.keys(STATIC_PAGE_META).forEach((route) => {
    const outputDir = path.join(__dirname, 'build', route)
    const outputPath = path.join(outputDir, 'index.html')
    const staticHtml = cleanupPrerenderedHtml(
      shellHtml,
      route,
      articleMap,
      categoryMap,
      siteData
    )

    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(outputPath, staticHtml, 'utf8')
    console.log(`  STATIC SEO ${route}`)
  })
}

function generateSitemap(routes, articleMap, categoryMap) {
  const urls = Array.from(
    new Set(
      routes
        .map((route) => buildMetaForRoute(route, articleMap, categoryMap).canonical)
        .filter(Boolean)
    )
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`)
  .join('\n')}
</urlset>
`

  fs.writeFileSync(path.join(__dirname, 'build', 'sitemap.xml'), xml, 'utf8')
  console.log(`Generated sitemap.xml with ${urls.length} URLs`)
}

console.log('Fetching routes and API data...')
const { routes, articleMap, categoryMap, siteData } = await getRoutesAndData()
console.log(`\nTotal ${routes.length} routes will be prerendered\n`)

const prerenderer = new Prerenderer({
  staticDir: path.join(__dirname, 'build'),
  renderer: new PuppeteerRenderer({
    renderAfterTime: 1200,
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

ensureStaticPageHtml(articleMap, categoryMap, siteData)

generateSitemap(routes, articleMap, categoryMap)

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
