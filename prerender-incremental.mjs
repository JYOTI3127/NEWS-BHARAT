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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_BASE = String(
  process.env.VITE_API_TARGET ||
  process.env.API_BASE ||
  'https://news4bharat.cloud/api'
).replace(/\/+$/, '')
const ARTICLE_SLUG = process.env.ARTICLE_SLUG || ''
const FETCH_TIMEOUT_MS = Number(process.env.PRERENDER_FETCH_TIMEOUT_MS || 30000)
const PRERENDER_DATA_SCRIPT_PATTERN =
  /<script>window\.__N4B_PRERENDER_DATA__=[\s\S]*?<\/script>\s*/g

if (!ARTICLE_SLUG) {
  console.error('ERROR: ARTICLE_SLUG env variable is required')
  process.exit(1)
}

console.log(`Incremental prerender for slug: ${ARTICLE_SLUG}`)

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchWithRetry(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (i === retries - 1) throw e
      const delay = Math.min(15000, 2000 * (i + 1))
      console.log(`  Retry ${i + 1}/${retries} after ${delay}ms for ${url}`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}

const normalizeSlug = (value) =>
  String(value || '').trim().replace(/^\/+|\/+$/g, '')

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const getListFromApiResponse = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []

const getArticleCategorySlug = (article) => {
  const candidates = [
    article?.category_slug,
    article?.primary_category_slug,
    article?.category?.slug,
    article?.primary_category?.slug,
  ]
  return candidates.map((v) => normalizeSlug(v)).find(Boolean) || ''
}

const normalizeNextApiUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw, `${API_BASE}/`)
    const apiOrigin = new URL(API_BASE).origin
    if (parsed.origin !== apiOrigin) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

// ─── Fetch article + related data ───────────────────────────────────────────

async function fetchArticleBySlug(slug) {
  const cacheBust = `_=${Date.now()}`
  const detail = await fetchWithRetry(`${API_BASE}/articles/slug/${encodeURIComponent(slug)}/?${cacheBust}`)
  const seoEndpoint = await fetchWithRetry(`${API_BASE}/seo/article/${encodeURIComponent(slug)}/?${cacheBust}`)
    .catch((error) => {
      console.log(`  SEO endpoint skipped: ${error?.message || error}`)
      return null
    })

  const article = Array.isArray(detail) ? detail[0] : detail
  if (!article) throw new Error(`Article not found for slug: ${slug}`)

  return seoEndpoint
    ? { ...article, seo_endpoint: seoEndpoint, seo_meta: isPlainObject(seoEndpoint?.meta) ? seoEndpoint.meta : {} }
    : article
}

async function fetchRecentArticles(limit = 50) {
  const cacheBust = `_=${Date.now()}`
  const data = await fetchWithRetry(`${API_BASE}/articles/?page=1&limit=${limit}&${cacheBust}`)
  return getListFromApiResponse(data)
}

async function fetchCategories() {
  const cacheBust = `_=${Date.now()}`
  const data = await fetchWithRetry(`${API_BASE}/categories/?${cacheBust}`)
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
}

const pickCategoryPrerenderSeed = (category) => {
  if (!category || typeof category !== 'object') return null
  return {
    id: category.id ?? null,
    name: category.name || '',
    slug: category.slug || '',
    description: category.description || '',
    meta_title: category.meta_title || '',
    meta_description: category.meta_description || '',
    status: category.status || '',
    sub_categories: category.sub_categories || {},
  }
}

const pickCategoryPrerenderSeeds = (categories) =>
  (Array.isArray(categories) ? categories : [])
    .map(pickCategoryPrerenderSeed)
    .filter(Boolean)

// ─── Build route list ────────────────────────────────────────────────────────

function getRoutesForIncremental(article) {
  const routes = new Set()

  // Article route
  const articlePath = getArticlePath(article)
  if (articlePath) routes.add(articlePath)

  // Category route
  const catSlug = getArticleCategorySlug(article)
  if (catSlug) routes.add(`/category/${catSlug}`)

  // Homepage always
  routes.add('/')

  return [...routes]
}

// ─── Prerender data injection ────────────────────────────────────────────────

const buildRoutePrerenderPayload = (route, article, allArticles, categories) => {
  const categorySeeds = pickCategoryPrerenderSeeds(categories)

  if (route === '/') {
    return { articles: allArticles, categories: categorySeeds }
  }
  if (isArticlePath(route)) {
    return { articles: article ? [article] : [], categories: categorySeeds }
  }
  if (route.startsWith('/category/')) {
    const slug = route.replace('/category/', '').replace(/\/+$/, '').trim().toLowerCase()
    const catArticles = allArticles.filter((a) => getArticleCategorySlug(a) === slug)
    const seen = new Set()
    const unique = [...catArticles, ...allArticles.slice(0, 18)].filter((a) => {
      const key = String(a?.id || a?.slug || '').trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    return { articles: unique, categories: categorySeeds }
  }
  return { articles: allArticles.slice(0, 18), categories: categorySeeds }
}

const replacePrerenderDataScript = (html, route, article, allArticles, categories) => {
  const payload = buildRoutePrerenderPayload(route, article, allArticles, categories)
  const json = JSON.stringify(payload).replace(/</g, '\\u003c')
  const dataScript = `<script>window.__N4B_PRERENDER_DATA__=${json};</script>`
  const cleaned = String(html || '').replace(PRERENDER_DATA_SCRIPT_PATTERN, '')

  if (/<script\b[^>]*type=["']module["'][^>]*>/i.test(cleaned)) {
    return cleaned.replace(/<script\b[^>]*type=["']module["'][^>]*>/i, `${dataScript}\n$&`)
  }
  return cleaned.replace('</head>', `${dataScript}\n</head>`)
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('Fetching article data...')
let article = null

try {
  article = await fetchArticleBySlug(ARTICLE_SLUG)
} catch (error) {
  console.error(`Unable to fetch article "${ARTICLE_SLUG}" from ${API_BASE}.`)
  console.error(error?.message || error)
  console.log('Incremental prerender skipped because the API is unreachable from GitHub Actions.')
  console.log('The next successful full deploy will still rebuild the page.')
  process.exit(0)
}

const [recentResult, categoriesResult] = await Promise.allSettled([
  fetchRecentArticles(30),
  fetchCategories(),
])

const allArticles =
  recentResult.status === 'fulfilled' && Array.isArray(recentResult.value)
    ? recentResult.value
    : [article]
const categories =
  categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)
    ? categoriesResult.value
    : []

if (recentResult.status !== 'fulfilled') {
  console.log(`Recent articles skipped: ${recentResult.reason?.message || recentResult.reason}`)
}
if (categoriesResult.status !== 'fulfilled') {
  console.log(`Categories skipped: ${categoriesResult.reason?.message || categoriesResult.reason}`)
}

const routes = getRoutesForIncremental(article)
console.log(`Routes to prerender: ${routes.join(', ')}`)

// Use existing build as static dir
const BUILD_DIR = path.join(__dirname, 'build')
const OUT_DIR = path.join(__dirname, 'build-incremental')

// Copy build shell to incremental dir
fs.mkdirSync(OUT_DIR, { recursive: true })
const shellHtml = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf8')
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), shellHtml, 'utf8')

// Copy assets folder
const assetsDir = path.join(BUILD_DIR, 'assets')
if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, path.join(OUT_DIR, 'assets'), { recursive: true })
}

const prerenderer = new Prerenderer({
  staticDir: OUT_DIR,
  server: {
    host: '127.0.0.1',
    listenHost: '127.0.0.1',
    port: 0,
  },
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
console.log('Prerenderer ready\n')

let success = 0
let failed = 0

for (const route of routes) {
  try {
    const rendered = await prerenderer.renderRoutes([route])

    rendered.forEach(({ route: r, html }) => {
      // Inject fresh prerender data
      const cleanHtml = replacePrerenderDataScript(html, r, article, allArticles, categories)

      const outDir = path.join(OUT_DIR, r)
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, 'index.html'), cleanHtml, 'utf8')
      console.log(`  OK ${r}`)
      success++
    })
  } catch (e) {
    console.log(`  FAIL ${route} — ${e.message}`)
    failed++
  }
}

await prerenderer.destroy()

console.log(`\nDone! Success: ${success}, Failed: ${failed}`)
console.log(`Output: build-incremental/`)
