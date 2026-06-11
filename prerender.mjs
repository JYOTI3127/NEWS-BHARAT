import Prerenderer from '@prerenderer/prerenderer'
import PuppeteerRenderer from '@prerenderer/renderer-puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import {
  getArticlePath,
  getCanonicalArticleUrl,
  isArticlePath,
  normalizeCanonicalUrl,
} from './src/lib/articleUrl.js'
import { STATIC_PAGE_SEO as SHARED_STATIC_PAGE_SEO } from './src/lib/staticPageSeo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_BASE = 'https://news4bharat.cloud/api'
const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH || ''
const PRERENDER_DATA_SCRIPT_PATTERN =
  /<script>window\.__N4B_PRERENDER_DATA__=[\s\S]*?<\/script>\s*/g

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

const normalizeStaticRoute = (route) => {
  const normalized = String(route || '').trim().split('?')[0].split('#')[0]
  if (!normalized || normalized === '/') return '/'
  return `/${normalized.replace(/^\/+|\/+$/g, '')}`
}

const isStaticPageRoute = (route) =>
  Object.prototype.hasOwnProperty.call(STATIC_PAGE_META, normalizeStaticRoute(route))

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

const isLegacyArticleRoute = (route) => {
  const segments = getCleanPathSegments(route)
  return (
    (segments[0] === 'article' || segments[0] === 'news') &&
    (segments.length === 2 || segments.length === 3) &&
    Boolean(segments[segments.length - 1])
  )
}

const isSeoArticleRoute = (route) => isArticlePath(route) || isLegacyArticleRoute(route)

const getTagRoute = (tag) => {
  const normalized = String(tag || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')

  return normalized ? `/tag/${encodeURIComponent(normalized)}` : ''
}

const getPrerenderOutputPath = (baseDir, route) => {
  const cleanSegments = getCleanPathSegments(route)
  if (cleanSegments.length === 0) return path.join(baseDir, 'index.html')
  return path.join(baseDir, '__prerender', `${cleanSegments.join('/')}.html`)
}

const toArticleRouteFromUrl = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''

  try {
    const parsed = new URL(normalized, 'https://news4bharat.com')
    const cleanPath = `/${getCleanPathSegments(parsed.pathname).join('/')}`
    return isArticlePath(cleanPath) ? cleanPath : ''
  } catch {
    const cleanPath = `/${getCleanPathSegments(normalized).join('/')}`
    return isArticlePath(cleanPath) ? cleanPath : ''
  }
}

const normalizeSlugToken = (value) =>
  String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')

const getArticleCategorySlug = (article) => {
  const directCandidates = [
    article?.category_slug,
    article?.primary_category_slug,
    article?.category?.slug,
  ]
    .map((value) => normalizeSlugToken(value))
    .filter(Boolean)

  if (directCandidates[0]) return directCandidates[0]

  const categoryDetails = Array.isArray(article?.category_details)
    ? article.category_details
    : article?.category_details
      ? [article.category_details]
      : []

  const fromDetails = categoryDetails
    .map((item) => normalizeSlugToken(item?.slug || item?.category_slug || item?.name))
    .find(Boolean)

  return fromDetails || ''
}

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

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const getSeoEndpointMeta = (article) => {
  const endpoint = article?.seo_endpoint || article?.seoEndpoint || null
  if (isPlainObject(endpoint?.meta)) return endpoint.meta
  if (isPlainObject(article?.seo_meta)) return article.seo_meta
  return {}
}

const getArticleRoutes = (article) => {
  const routes = new Set()
  const primaryPath = getArticlePath(article)
  if (primaryPath) {
    routes.add(primaryPath)
  }

  const canonicalPath = toArticleRouteFromUrl(article?.canonical_url)
  if (canonicalPath) {
    routes.add(canonicalPath)
  }

  const publicPath = toArticleRouteFromUrl(article?.public_url)
  if (publicPath) {
    routes.add(publicPath)
  }

  const slug = normalizeSlugToken(article?.slug || article?.article_slug || article?.articleSlug)
  const categorySlug = getArticleCategorySlug(article)
  if (slug && categorySlug) {
    const derivedPath = `/${categorySlug}/${slug}`
    if (isArticlePath(derivedPath)) {
      routes.add(derivedPath)
    }
  }

  return [...routes]
}

const getLegacyArticleRoutes = (article) => {
  const routes = new Set()
  const slug = normalizeSlugToken(article?.slug || article?.article_slug || article?.articleSlug)
  if (!slug) return []
  if (!IMPORTANT_LEGACY_ARTICLE_SLUGS.has(slug)) return []

  routes.add(`/article/${slug}`)

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

const getListFromCategoriesResponse = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.value)) return data.value
  if (Array.isArray(data?.categories)) return data.categories
  if (Array.isArray(data?.data)) return data.data
  if (data?.results && typeof data.results === 'object') {
    return Object.values(data.results).flatMap((value) =>
      Array.isArray(value) ? value : []
    )
  }
  return []
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

const fetchAllArticles = async ({ limit = 100, maxPages = 200 } = {}) => {
  const allArticles = []
  const seen = new Set()
  const cacheBust = `_=${Date.now()}`
  let page = 1
  let nextUrl = `${API_BASE}/articles/?page=1&limit=${limit}&${cacheBust}`

  while (nextUrl && page <= maxPages) {
    const data = await fetchWithRetry(nextUrl)
    const pageItems = getListFromApiResponse(data)

    pageItems.forEach((article) => {
      const key = String(article?.id || article?.slug || article?.public_url || '').trim()
      if (key && seen.has(key)) return
      if (key) seen.add(key)
      allArticles.push(article)
    })

    if (Array.isArray(data)) break

    const normalizedNext = normalizeNextApiUrl(data?.next)
    if (normalizedNext) {
      nextUrl = normalizedNext
      page += 1
      continue
    }

    if (data?.has_next === true) {
      page = Number(data?.page || page) + 1
      nextUrl = `${API_BASE}/articles/?page=${page}&limit=${limit}&${cacheBust}`
      continue
    }

    break
  }

  return allArticles
}

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

const BASE_URL = 'https://news4bharat.com'
const SITE_NAME = 'News4Bharat'
const ENABLE_ARTICLE_BODY_FALLBACK = true 
const MAX_TAG_ROUTES = 200
const IMPORTANT_TAG_ROUTES = ['/tag/Us-Iran%20War']
const IMPORTANT_LEGACY_ARTICLE_SLUGS = new Set([
  'air-india-fuel-surcharge-hike-april-2026',
])

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const stripHtml = (value) =>
  String(value || '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const removeEmptyHeadings = (value) =>
  String(value || '').replace(
    /<h([1-6])\b[^>]*>(?:\s|&nbsp;|&#160;|&#xa0;|<br\s*\/?>|<\/?span\b[^>]*>)*<\/h\1>/gi,
    ''
  )

const normalizeKeywordPhrase = (value) =>
  String(value || '')
    .replace(/^\s*hy(\b)/i, 'why$1')
    .trim()

const toAbsoluteUrl = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  try {
    return new URL(normalized, BASE_URL).toString()
  } catch {
    return ''
  }
}

const toCanonicalSiteUrl = (value) => {
  const absolute = toAbsoluteUrl(value)
  if (!absolute) return ''
  try {
    const parsed = new URL(absolute)
    if (parsed.origin !== BASE_URL) return absolute
    parsed.pathname = `/${getCleanPathSegments(parsed.pathname).join('/')}`
    return normalizeCanonicalUrl(parsed.toString())
  } catch {
    return absolute
  }
}

const getArticleCategory = (article) => {
  if (!article) return { slug: '', name: '' }

  const primaryCategory = Array.isArray(article?.category_details)
    ? article.category_details[0]
    : article?.category_details || article?.primary_category_details || article?.primary_category || article?.category || null

  const slug = String(
    primaryCategory?.slug || primaryCategory?.category_slug || article?.primary_category_slug || article?.category_slug || ''
  ).trim()
  const name = String(primaryCategory?.name || article?.primary_category_name || article?.category_name || '').trim()
  return { slug, name }
}

const getArticleTags = (article) => {
  const values = []

  if (Array.isArray(article?.tags_list)) {
    values.push(...article.tags_list)
  }

  values.push(article?.tags)
  values.push(article?.focus_keyword)
  values.push(article?.secondary_keywords)

  const fromArray = values
    .filter(Boolean)
    .flatMap((value) => String(value || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean))

  return Array.from(
    new Set(fromArray.map((value) => String(value || '').trim()).filter(Boolean))
  )
}

const getFallbackArticleKeywords = (article, title = '', categoryName = '') => {
  const values = []
  const cleanTitle = normalizeText(title || article?.title || '')
  const cleanCategory = normalizeText(categoryName || getArticleCategory(article).name)
  const slugTitle = normalizeText(String(article?.slug || '').replace(/[-_]+/g, ' '))

  if (cleanTitle) values.push(cleanTitle)
  if (slugTitle && slugTitle.toLowerCase() !== cleanTitle.toLowerCase()) values.push(slugTitle)
  if (cleanCategory) {
    values.push(cleanCategory)
    values.push(`${cleanCategory} news`)
    values.push(`${cleanCategory} latest updates`)
  }
  values.push('News4Bharat')

  return Array.from(new Set(values.map(normalizeKeywordPhrase).filter(Boolean))).slice(0, 8)
}

const sanitizeArticleBodyHtml = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  return removeEmptyHeadings(
    raw
      .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
      .replace(/\u00a0/g, ' ')
    .replace(/<\s*\/?\s*(html|head|body)\b[^>]*>/gi, '')
    .replace(/<\s*(script|style|noscript|meta|link|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1>/gi, '')
    .replace(/<\s*(script|style|noscript|meta|link|base)\b[^>]*\/?>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
    .replace(/\s(href|src)=["']\s*javascript:[^"']*["']/gi, '')
    .replace(/(<li\b[^>]*>[\s\S]*?)(?:\s*<br\s*\/?>\s*)+<\/li>/gi, '$1</li>')
    .trim()
  )
}

const buildArticleFallbackHtml = (article, route, meta) => {
  if (!article) return ''

  const title = String(
    article?.title ||
      meta?.articleHeadline ||
      meta?.title ||
      'News4Bharat'
  ).trim()
  const summary = String(
    article?.meta_description ||
      article?.subtitle ||
      article?.summary ||
      article?.excerpt ||
      meta?.description ||
      ''
  ).trim()
  const authorName = String(
    article?.display_author_name ||
      article?.author_display_name ||
      article?.author_name ||
      article?.posted_by_fullname ||
      SITE_NAME
  ).trim()
  const publishedAt = String(
    article?.published_at || article?.created_at || meta?.publishedAt || ''
  ).trim()
  const imageUrl = toAbsoluteUrl(article?.image_url || article?.image || meta?.ogImage || '')
  const imageAlt = String(article?.image_alt || title).trim()
  const bodyHtml = sanitizeArticleBodyHtml(article?.content_html || article?.content || '')
  const bodyTextFallback = stripHtml(article?.content || summary || title)

  const bodyMarkup = bodyHtml || `<p>${escapeHtml(bodyTextFallback)}</p>`
  const articleUrl = meta?.canonical || toCanonicalSiteUrl(`${BASE_URL}${route}`) || `${BASE_URL}${route}`

  return `
  <main data-prerender-article="true" style="max-width:820px;margin:24px auto;padding:0 16px;font-family:Arial,sans-serif;color:#1f2937;line-height:1.7;">
    <article data-prerender-article-body="true">
      <h1 style="font-size:2rem;line-height:1.25;font-weight:700;margin:0 0 12px;">${escapeHtml(title)}</h1>
      ${summary ? `<p style="font-size:1.06rem;color:#4b5563;margin:0 0 16px;">${escapeHtml(summary)}</p>` : ''}
      <p style="font-size:0.88rem;color:#6b7280;margin:0 0 18px;">By ${escapeHtml(authorName)}${publishedAt ? ` | ${escapeHtml(publishedAt)}` : ''}</p>
      ${imageUrl ? `<figure style="margin:0 0 18px;"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" style="width:100%;height:auto;border-radius:10px;"><figcaption style="font-size:0.75rem;color:#6b7280;margin-top:6px;">${escapeHtml(imageAlt)}</figcaption></figure>` : ''}
      <section class="article-content" data-prerender-article-body="true">${bodyMarkup}</section>
      <p style="font-size:0.82rem;color:#6b7280;margin-top:22px;">Source URL: <a href="${escapeHtml(articleUrl)}">${escapeHtml(articleUrl)}</a></p>
    </article>
  </main>`
}

const buildArticleSchemaJson = (article, route, meta) => {
  if (!article) return null

  const canonical = String(meta?.canonical || getCanonicalArticleUrl(article) || toCanonicalSiteUrl(`${BASE_URL}${route}`) || `${BASE_URL}${route}`).trim()
  const title = String(article?.title || meta?.articleHeadline || meta?.title || SITE_NAME).trim()
  const description = String(
    article?.meta_description ||
      article?.subtitle ||
      article?.summary ||
      article?.excerpt ||
      meta?.description ||
      title
  ).trim()
  const authorName = String(
    article?.display_author_name ||
      article?.author_display_name ||
      article?.author_name ||
      article?.posted_by_fullname ||
      SITE_NAME
  ).trim()
  const imageUrl = toAbsoluteUrl(article?.image_url || article?.image || meta?.ogImage || '')
  const imageAlt = String(article?.image_alt || title).trim()
  const bodyText = stripHtml(article?.content_html || article?.content || '')
  const datePublished = String(meta?.publishedAt || article?.published_at || article?.created_at || '').trim()
  const dateModified = String(meta?.modifiedAt || article?.updated_at || article?.published_at || article?.created_at || '').trim()
  const { name: categoryName } = getArticleCategory(article)
  const tags = getArticleTags(article)

return {
  '@context': 'https://schema.org',
  '@type': ['NewsArticle', 'Article'],
  ...(canonical ? { '@id': `${canonical}#article` } : {}),
  headline: title,
  alternativeHeadline: description,
  description,
  ...(bodyText ? { articleBody: bodyText } : {}),
  inLanguage: 'en-IN',
  ...(datePublished ? { datePublished } : {}),
  ...(dateModified ? { dateModified } : {}),
  ...(canonical ? { url: canonical } : {}),
  ...(canonical ? { mainEntityOfPage: { '@type': 'WebPage', '@id': canonical } } : {}),
  author: {
    '@type': authorName === SITE_NAME ? 'Organization' : 'Person',
    name: authorName,
    url: authorName === SITE_NAME ? BASE_URL : `${BASE_URL}/author/${encodeURIComponent(authorName.toLowerCase().replace(/\s+/g, '-'))}`,
  },
  publisher: {
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: SITE_NAME,
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/logo.png`,
    },
  },
  ...(imageUrl
    ? {
        image: {
          '@type': 'ImageObject',
          url: imageUrl,
          ...(imageAlt ? { caption: imageAlt } : {}),
        },
        thumbnailUrl: imageUrl,
      }
    : {}),
  ...(categoryName ? { articleSection: categoryName } : {}),
  ...(tags.length > 0 ? { keywords: tags.join(', ') } : {}),
  isAccessibleForFree: true,
  isPartOf: {
    '@type': 'Product',
    productID: 'CAow6K_GDA:openaccess',
  },
}
}
const buildBreadcrumbSchemaJson = (article, route, meta) => {
  if (!article) return null

  const canonical = String(meta?.canonical || getCanonicalArticleUrl(article) || toCanonicalSiteUrl(`${BASE_URL}${route}`) || `${BASE_URL}${route}`).trim()
  const title = String(article?.title || meta?.articleHeadline || meta?.title || SITE_NAME).trim()
  const { slug: categorySlug, name: categoryName } = getArticleCategory(article)

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${BASE_URL}/`,
      },
      ...(categorySlug
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: categoryName || categorySlug.replace(/-/g, ' '),
              item: `${BASE_URL}/category/${categorySlug}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: categorySlug ? 3 : 2,
        name: title,
        ...(canonical ? { item: canonical } : {}),
      },
    ],
  }
}

const STRUCTURED_DATA_CONTAINER_KEYS = [
  'schemas',
  'schema',
  'schema_list',
  'structured_data',
  'structured_datakey',
  'faq_schema',
  'faq_schemas',
  'faqpage',
  'faq_page',
  'faq',
  'json_ld',
  'jsonld',
  'custom_json_ld',
  'custom_schema',
  'custom_schemas',
  'payload',
  'data',
  'result',
  'results',
  'items',
]

const parseJsonMaybe = (value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const looksLikeSchemaObject = (value) =>
  isPlainObject(value) &&
  (Object.prototype.hasOwnProperty.call(value, '@type') ||
    Object.prototype.hasOwnProperty.call(value, '@context'))

const extractStructuredDataSchemas = (input, depth = 0, seen = new Set()) => {
  if (depth > 10 || input == null) return []

  const parsed = parseJsonMaybe(input)
  if (parsed !== input) {
    return extractStructuredDataSchemas(parsed, depth + 1, seen)
  }

  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => extractStructuredDataSchemas(item, depth + 1, seen))
  }

  if (!isPlainObject(parsed)) return []
  if (seen.has(parsed)) return []
  seen.add(parsed)

  if (looksLikeSchemaObject(parsed)) return [parsed]

  const prioritized = STRUCTURED_DATA_CONTAINER_KEYS.flatMap((key) =>
    Object.prototype.hasOwnProperty.call(parsed, key)
      ? extractStructuredDataSchemas(parsed[key], depth + 1, seen)
      : []
  )
  if (prioritized.length > 0) return prioritized

  return Object.values(parsed).flatMap((value) =>
    extractStructuredDataSchemas(value, depth + 1, seen)
  )
}

const normalizeStructuredSchemaObject = (schema) => {
  if (!looksLikeSchemaObject(schema)) return null
  return {
    ...schema,
    '@context': schema['@context'] || 'https://schema.org',
  }
}

const dedupeStructuredSchemas = (schemas) => {
  const seen = new Set()
  const unique = []

  schemas.forEach((schema) => {
    const normalized = normalizeStructuredSchemaObject(schema)
    if (!normalized) return
    const key = JSON.stringify(normalized)
    if (!key || seen.has(key)) return
    seen.add(key)
    unique.push(normalized)
  })

  return unique
}

const getSchemaTypeTokens = (schema) => {
  const raw = schema?.['@type']
  if (Array.isArray(raw)) return raw.map((item) => String(item || '').trim()).filter(Boolean)
  const one = String(raw || '').trim()
  return one ? [one] : []
}

const schemaHasType = (schema, expectedType) =>
  getSchemaTypeTokens(schema).some(
    (type) => type.toLowerCase() === String(expectedType || '').toLowerCase()
  )

const htmlHasSchemaType = (html, expectedType) => {
  // Only match NewsArticle as a standalone @type, not inside NewsMediaOrganization array
  const safeHtml = String(html || '')
  const expected = String(expectedType || '').toLowerCase()
  
  // Find all ld+json script blocks and check each one
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptPattern.exec(safeHtml)) !== null) {
    try {
      const schema = JSON.parse(match[1])
      const schemas = Array.isArray(schema) ? schema : [schema]
      for (const s of schemas) {
        const types = Array.isArray(s['@type']) 
          ? s['@type'].map(t => String(t).toLowerCase())
          : [String(s['@type'] || '').toLowerCase()]
        
        // Skip if this schema is NewsMediaOrganization type (global org schema)
        if (types.includes('newsmediaorganization') || types.includes('organization')) {
          continue
        }
        
        if (types.includes(expected)) return true
      }
    } catch {
      // If JSON parse fails, fall back to regex
      const pattern = new RegExp(
        `"@type"\\s*:\\s*(?:"${expectedType}"|\\[[^\\]]*"${expectedType}")`,
        'i'
      )
      if (pattern.test(match[1])) return true
    }
  }
  return false
}

const getBackendArticleSchemas = (article) =>
  dedupeStructuredSchemas(
    extractStructuredDataSchemas({
      seo_endpoint: article?.seo_endpoint,
      structured_datakey: article?.structured_datakey,
      structured_data: article?.structured_data,
      schema: article?.schema,
      schemas: article?.schemas,
      seo: article?.seo,
    })
  )

// Main fix: build titles and meta directly from API data.
function buildMetaForRoute(route, articleMap, categoryMap, siteData = {}) {
  const DEFAULT_IMAGE = 'https://news4bharat.com/news4bharat-share.png'
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
  const toTitleCase = (value) =>
    normalizeText(value)
      .split(' ')
      .map((word) =>
        word ? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}` : ''
      )
      .join(' ')
      .trim()
  const splitKeywords = (value) =>
    String(value || '')
      .split(',')
      .map((item) => normalizeKeywordPhrase(item))
      .filter(Boolean)
  const getCategorySeoTitle = (category, catName) => {
    return [
      category?.meta_title,
      category?.metaTitle,
      category?.seo_title,
      category?.seoTitle,
      category?.title,
      category?.seo?.meta_title,
      category?.seo?.metaTitle,
      category?.seo?.title,
    ]
      .map((value) => normalizeText(value))
      .find(Boolean)
  }
  const getCategorySeoDescription = (category, catName) => {
    return [
      category?.meta_description,
      category?.metaDescription,
      category?.seo_description,
      category?.seoDescription,
      category?.description,
      category?.summary,
      category?.seo?.meta_description,
      category?.seo?.metaDescription,
      category?.seo?.description,
    ]
      .map((value) => normalizeText(value))
      .find(Boolean)
  }
  const getCategorySeoKeywords = (category, catName) => {
    const fromCategory = [
      category?.meta_keywords,
      category?.metaKeywords,
      category?.seo_keywords,
      category?.seoKeywords,
      category?.keywords,
      category?.seo?.meta_keywords,
      category?.seo?.metaKeywords,
      category?.seo?.keywords,
    ]
      .map((value) => normalizeText(value))
      .find(Boolean)

    if (fromCategory) return fromCategory
    return catName ? `${catName} news, ${catName} latest updates, ${catName} analysis` : ''
  }
  // Homepage
  if (route === '/') {
    return {
      title: 'News4Bharat - India News, Economy, Politics & Explainers',
      description: 'News4Bharat covers breaking India news, economy, politics, startups, and explainers with verified reporting and clear analysis for Bharat-first readers.',
      keywords: 'India news, breaking news India, latest news India, economy news, politics news, Bharat news',
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
  if (isSeoArticleRoute(route)) {
    const article = articleMap.get(route)

    if (article) {
      const endpointMeta = getSeoEndpointMeta(article)
      const endpointOg = isPlainObject(endpointMeta.og) ? endpointMeta.og : {}
      const endpointTwitter = isPlainObject(endpointMeta.twitter) ? endpointMeta.twitter : {}
      const apiMetaTitle = [
        endpointMeta.title,
        endpointOg.title,
        endpointTwitter.title,
        article?.meta_title,
        article?.metaTitle,
        article?.seo_title,
        article?.seoTitle,
        article?.seo?.meta_title,
        article?.seo?.metaTitle,
        article?.seo?.seo_title,
        article?.seo?.seoTitle,
      ]
        .map((value) => normalizeText(value))
        .find(Boolean)
      const rawTitle = (article.title || '').trim()
      const fallbackTitle = rawTitle
        ? `${rawTitle} | ${SITE_NAME}`
        : `${SITE_NAME} - News As It Is`
      const title = apiMetaTitle || fallbackTitle

      const description = normalizeText(
        endpointMeta.description ||
        endpointOg.description ||
        endpointTwitter.description ||
        article.meta_description ||
        article.subtitle ||
        article.summary ||
        article.excerpt ||
        article.description ||
        rawTitle ||
        `${SITE_NAME} - News As It Is`
      )

      const image = toAbsoluteUrl(endpointOg.image || endpointTwitter.image || article.image_url || article.image) || DEFAULT_IMAGE
      const canonical = toCanonicalSiteUrl(endpointMeta.canonical) || getCanonicalArticleUrl(article) || `${BASE_URL}${route}`
      const secondaryKeywords = Array.isArray(article.secondary_keywords_list)
        ? article.secondary_keywords_list.map((item) => normalizeKeywordPhrase(item))
        : String(article.secondary_keywords || '')
            .split(',')
            .map((item) => normalizeKeywordPhrase(item))
            .filter(Boolean)
      const tagKeywords = Array.isArray(article.tags_list)
        ? article.tags_list
        : String(article.tags || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
      const seoKeywords = splitKeywords(endpointMeta.keywords)
      const keywords = seoKeywords.length > 0
        ? Array.from(new Set(seoKeywords))
        : Array.from(
            new Set(
              [normalizeKeywordPhrase(article.focus_keyword), ...secondaryKeywords, ...tagKeywords]
                .map((item) => String(item || '').trim())
                .filter(Boolean)
            )
          )
      const robots = normalizeText(endpointMeta.robots) || getRobotsContent(article)
      const publishedAt = endpointOg['article:published_time'] || article.published_at || article.created_at || ''
      const modifiedAt = article.updated_at || article.published_at || article.created_at || ''
      const primaryCategory = Array.isArray(article.category_details)
        ? article.category_details[0]
        : article.category_details || article.primary_category_details || article.primary_category || article.category || null
      const categoryName = String(primaryCategory?.name || '').trim()
      const resolvedKeywords = keywords.length > 0
        ? keywords
        : getFallbackArticleKeywords(article, rawTitle || title, categoryName)
      const authorName = normalizeText(
        endpointMeta.author ||
          article.display_author_name ||
          article.author_display_name ||
          article.author_name ||
          article.posted_by_fullname ||
          SITE_NAME
      )
      const seoArticleTags = splitKeywords(endpointOg['article:tag'])
      const articleTags = Array.from(new Set(seoArticleTags.length > 0 ? seoArticleTags : tagKeywords))

      return {
        title,
        articleHeadline: rawTitle || title.replace(/\s*\|\s*News4Bharat\s*$/i, '').trim(),
        description,
        canonical,
        ogImage: image,
        ogImageAlt: normalizeText(endpointOg.image_alt || article.image_alt || rawTitle || SITE_NAME),
        ogType: 'article',
        robots,
        author: authorName,
        articleSection: categoryName,
        articleTags,
        keywords: resolvedKeywords.join(', '),
        newsKeywords: articleTags.join(', '),
        focusKeyword: normalizeKeywordPhrase(article.focus_keyword),
        secondaryKeywords: secondaryKeywords.join(', '),
        publishedAt,
        modifiedAt,
        twitterSite: TWITTER_HANDLE,
      }
    }

    const slugTitle = toTitleCase(getArticleSlugFromRoute(route).replace(/-/g, ' '))
    const fallbackSubject = slugTitle || 'Latest News'

    return {
      title: `${fallbackSubject} | ${SITE_NAME}`,
      articleHeadline: '',
      description: `Read the latest updates on ${fallbackSubject} from ${SITE_NAME}.`,
      canonical: `${BASE_URL}${route}`,
      ogImage: DEFAULT_IMAGE,
      ogType: 'article',
      robots: 'index,follow,max-image-preview:large',
      twitterSite: TWITTER_HANDLE,
    }
  }

  // Category page
  if (route.startsWith('/category/')) {
    const slug = route.replace('/category/', '').replace(/\/+$/, '').trim().toLowerCase()
    const category = categoryMap.get(slug)
    const catName = category?.name || toTitleCase(slug.replace(/-/g, ' '))

    return {
      title: getCategorySeoTitle(category, catName) || `${catName} News | ${SITE_NAME}`,
      description:
        getCategorySeoDescription(category, catName) ||
        `Read the latest ${catName} news, updates, analysis and explainers on ${SITE_NAME}.`,
      keywords: getCategorySeoKeywords(category, catName),
      canonical: `${BASE_URL}/category/${slug}`,
      ogImage: DEFAULT_IMAGE,
      ogType: 'website',
      robots: 'index,follow,max-image-preview:large',
      twitterSite: TWITTER_HANDLE,
    }
  }

  // Tag page
  if (route.startsWith('/tag/')) {
    const rawTag = route.replace('/tag/', '').trim()
    const decodedTag = (() => {
      try {
        return decodeURIComponent(rawTag)
      } catch {
        return rawTag
      }
    })()
    const tagName = toTitleCase(decodedTag.replace(/[-_+]+/g, ' '))
    const title = `${tagName} News, Latest Updates & Explainers | ${SITE_NAME}`

    return {
      title,
      description: `Read the latest ${tagName} news, updates, analysis and explainers on ${SITE_NAME}.`,
      canonical: `${BASE_URL}${route}`,
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

function buildHrefLangTags(canonicalUrl) {
  const canonical = String(canonicalUrl || '').trim()
  if (!canonical) return ''

  return `
  <link rel="alternate" hreflang="en-IN" href="${canonical}">
  <link rel="alternate" hreflang="en-US" href="${canonical}">
  <link rel="alternate" hreflang="x-default" href="${canonical}">`
}

function buildWebsiteSchemaTag() {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${BASE_URL}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return `<script type="application/ld+json">${JSON.stringify(websiteSchema)}</script>`
}

function buildCategoryBreadcrumbSchemaJson(route, meta, categoryMap) {
  const parts = String(route || '').split('/').filter(Boolean)
  if (parts[0] !== 'category' || !parts[1]) return null

  const slug = parts[1].trim().toLowerCase()
  const category = categoryMap.get(slug)
  const categoryName = String(category?.name || slug.replace(/-/g, ' ')).trim()
  const canonical = String(meta?.canonical || `${BASE_URL}/category/${slug}`).trim()

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${BASE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: `${BASE_URL}/category/${slug}`,
      },
      ...(parts[2]
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: decodeURIComponent(parts[2]).replace(/[-_]+/g, ' '),
              item: canonical,
            },
          ]
        : []),
    ],
  }
}

const stripCapturedAnalyticsScripts = (html) =>
  String(html || '')
    .replace(
      /<script\b(?=[^>]*\bsrc=["']https:\/\/www\.googletagmanager\.com\/(?:gtm\.js|gtag\/js)\?[^"']+["'])[^>]*>\s*<\/script>\s*/gi,
      ''
    )

const uniqueArticlesByRoute = (articles) => {
  const seen = new Set()

  return (Array.isArray(articles) ? articles : []).filter((article) => {
    if (!article) return false
    const key =
      getArticlePath(article) ||
      toArticleRouteFromUrl(article?.canonical_url) ||
      String(article?.slug || article?.id || '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const pickArticlePrerenderSeed = (article, { includeBody = false } = {}) => {
  if (!article || typeof article !== 'object') return null

  const seed = {
    id: article.id ?? null,
    title: article.title || '',
    slug: article.slug || '',
    subtitle: article.subtitle || article.summary || article.excerpt || '',
    meta_description: article.meta_description || article.summary || article.excerpt || '',
    image_url: article.image_url || article.image || '',
    image_alt: article.image_alt || article.title || '',
    primary_category: article.primary_category || article.category || '',
    primary_category_details: article.primary_category_details || null,
    category_details: article.category_details || null,
    categories: Array.isArray(article.categories) ? article.categories : [],
    tags: Array.isArray(article.tags) ? article.tags : [],
    author_name: article.author_name || article.author_display_name || article.display_author_name || '',
    author_display_name: article.author_display_name || article.display_author_name || article.author_name || '',
    display_author_name: article.display_author_name || article.author_display_name || article.author_name || '',
    posted_by_fullname: article.posted_by_fullname || '',
    published_at: article.published_at || article.created_at || '',
    updated_at: article.updated_at || '',
    created_at: article.created_at || '',
    is_updated: Boolean(article.is_updated),
    updated_display: article.updated_display || '',
    public_url: article.public_url || '',
    canonical_url: article.canonical_url || '',
  }

  if (includeBody) {
    seed.content_html = article.content_html || ''
    seed.content_raw = article.content_raw || ''
    seed.article_content_raw = article.article_content_raw || ''
    seed.content = article.content || ''
    seed.content_clean = article.content_clean || ''
    seed.body_html = article.body_html || ''
    seed.body = article.body || ''
    seed.full_content = article.full_content || ''
    seed.description_html = article.description_html || ''
  }

  return seed
}

const pickArticlePrerenderSeeds = (articles, options) =>
  uniqueArticlesByRoute(articles)
    .map((article) => pickArticlePrerenderSeed(article, options))
    .filter(Boolean)

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

const buildRoutePrerenderPayload = (route, articleMap, siteData = {}) => {
  const allArticles = Array.isArray(siteData?.articles) ? siteData.articles : []
  const categories = Array.isArray(siteData?.categories) ? siteData.categories : []
  const categorySeeds = pickCategoryPrerenderSeeds(categories)

  if (route === '/') {
    return {
      articles: pickArticlePrerenderSeeds(allArticles.slice(0, 120)),
      categories: categorySeeds,
      homepageHeroImage: siteData?.homepageHeroImage || '',
    }
  }

  if (isSeoArticleRoute(route)) {
    const currentArticle = articleMap.get(route)

    return {
      articles: currentArticle ? [pickArticlePrerenderSeed(currentArticle, { includeBody: true })] : [],
      categories: categorySeeds,
      homepageHeroImage: siteData?.homepageHeroImage || '',
    }
  }

  if (route.startsWith('/category/')) {
    const slug = route.replace('/category/', '').trim().toLowerCase()
    const categoryArticles = allArticles.filter((article) =>
      getArticleRoutes(article).some((articleRoute) =>
        articleRoute.toLowerCase().startsWith(`/${slug}/`)
      )
    )

    return {
      articles: pickArticlePrerenderSeeds(categoryArticles.slice(0, 80)),
      categories: categorySeeds,
      homepageHeroImage: siteData?.homepageHeroImage || '',
    }
  }

  if (route.startsWith('/tag/')) {
    const rawTag = route.replace('/tag/', '').trim()
    const normalizedTag = (() => {
      try {
        return decodeURIComponent(rawTag)
      } catch {
        return rawTag
      }
    })()
      .replace(/\+/g, ' ')
      .replace(/^#+/, '')
      .replace(/&/g, ' and ')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    const tagFingerprint = normalizedTag.replace(/[^a-z0-9]+/g, '')
    const taggedArticles = allArticles.filter((article) =>
      getArticleTags(article).some((tag) => {
        const articleTag = String(tag || '')
          .replace(/\+/g, ' ')
          .replace(/^#+/, '')
          .replace(/&/g, ' and ')
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase()

        return articleTag === normalizedTag || articleTag.replace(/[^a-z0-9]+/g, '') === tagFingerprint
      })
    )

    return {
      articles: pickArticlePrerenderSeeds(taggedArticles.slice(0, 80)),
      categories: categorySeeds,
      homepageHeroImage: siteData?.homepageHeroImage || '',
    }
  }

  return {
    articles: [],
    categories: categorySeeds,
    homepageHeroImage: siteData?.homepageHeroImage || '',
  }
}

const replacePrerenderDataScript = (html, route, articleMap, siteData) => {
  const cleaned = String(html || '').replace(PRERENDER_DATA_SCRIPT_PATTERN, '')

  if (isStaticPageRoute(route)) {
    return cleaned
  }

  const payload = buildRoutePrerenderPayload(route, articleMap, siteData)
  const json = JSON.stringify(payload).replace(/</g, '\\u003c')
  const dataScript = `<script>window.__N4B_PRERENDER_DATA__=${json};</script>`

  if (/<script\b[^>]*type=["']module["'][^>]*>/i.test(cleaned)) {
    return cleaned.replace(/<script\b[^>]*type=["']module["'][^>]*>/i, `${dataScript}\n$&`)
  }

  return cleaned.replace('</head>', `${dataScript}\n</head>`)
}

const injectArticleFallbackIntoRoot = (html, fallbackArticleHtml) => {
  if (!fallbackArticleHtml) return html

  const rootPlaceholderPattern =
    /<div id=["']root["'][^>]*>\s*<div class=["']min-h-\[1px\]["']>\s*<\/div>\s*<\/div>/i

  if (rootPlaceholderPattern.test(html)) {
    return html.replace(rootPlaceholderPattern, (match) => {
      const rootOpen = match.match(/<div id=["']root["'][^>]*>/i)?.[0] || '<div id="root">'
      return `${rootOpen}\n${fallbackArticleHtml}\n</div>`
    })
  }

  if (/<div id=["']root["'][^>]*>/i.test(html)) {
    return html.replace(/<div id=["']root["'][^>]*>/i, (match) => `${match}\n${fallbackArticleHtml}`)
  }

  return html.replace(/<body([^>]*)>/i, `<body$1>\n${fallbackArticleHtml}`)
}

// Remove old tags and inject fresh tags from API data.
function cleanupPrerenderedHtml(html, route, articleMap, categoryMap, siteData) {
  const meta = buildMetaForRoute(route, articleMap, categoryMap, siteData)

  const safeDesc = String(meta.description || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').trim()
  const safeTitle = String(meta.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

  let cleaned = replacePrerenderDataScript(
    stripCapturedAnalyticsScripts(stripLazyChunkPreloads(html)),
    route,
    articleMap,
    siteData
  )
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']author["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']news_keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']focus_keyword["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']secondary_keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["'][^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']og:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']twitter:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']article:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<link\b(?=[^>]*\brel=["']preload["'])(?=[^>]*\bas=["']image["'])[^>]*>\s*/gi, '')

  const injectedTags = `
  ${safeTitle ? `<title>${safeTitle}</title>` : ''}
  ${safeDesc ? `<meta name="description" content="${safeDesc}">` : ''}
  ${safeAuthor ? `<meta name="author" content="${safeAuthor}">` : ''}
  ${safeKeywords ? `<meta name="keywords" content="${safeKeywords}">` : ''}
  ${safeNewsKeywords ? `<meta name="news_keywords" content="${safeNewsKeywords}">` : ''}
  ${safeFocusKeyword ? `<meta name="focus_keyword" content="${safeFocusKeyword}">` : ''}
  ${safeSecondaryKeywords ? `<meta name="secondary_keywords" content="${safeSecondaryKeywords}">` : ''}
  <meta name="robots" content="${safeRobots}">
  <link rel="canonical" href="${meta.canonical}">
  ${buildHrefLangTags(meta.canonical)}
  <meta property="og:type" content="${meta.ogType}">
  ${safeTitle ? `<meta property="og:title" content="${safeTitle}">` : ''}
  ${safeDesc ? `<meta property="og:description" content="${safeDesc}">` : ''}
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
  ${safeTitle ? `<meta name="twitter:title" content="${safeTitle}">` : ''}
  ${safeDesc ? `<meta name="twitter:description" content="${safeDesc}">` : ''}
  <meta name="twitter:url" content="${meta.canonical}">
  <meta name="twitter:image" content="${meta.ogImage}">
  ${safeOgImageAlt ? `<meta name="twitter:image:alt" content="${safeOgImageAlt}">` : ''}
  ${meta.publishedAt ? `<meta property="article:published_time" content="${meta.publishedAt}">` : ''}
  ${meta.modifiedAt ? `<meta property="article:modified_time" content="${meta.modifiedAt}">` : ''}`

  const preloadImage =
    route === '/'
      ? meta.lcpImage
      : isSeoArticleRoute(route)
        ? meta.ogImage
        : ''
  const preloadTags =
    preloadImage
      ? `
  <link rel="preconnect" href="https://storage.googleapis.com" crossorigin>
  <link rel="preload" as="image" href="${preloadImage}" fetchpriority="high">`
      : ''

  cleaned = cleaned.replace('</head>', `${preloadTags}${injectedTags}\n</head>`)

  const hasWebSiteSchema = /"@type"\s*:\s*"WebSite"/i.test(cleaned)
  if (!hasWebSiteSchema) {
    cleaned = cleaned.replace('</head>', `\n${buildWebsiteSchemaTag()}\n</head>`)
  }

  if (isSeoArticleRoute(route)) {
    const article = articleMap.get(route)
    const hasArticleBodyMarkup =
      /data-prerender-fallback=["']article-body["']/i.test(cleaned) ||
      /data-prerender-fallback=["']article-content["']/i.test(cleaned) ||
      /class=["'][^"']*article-content[^"']*["']/i.test(cleaned) ||
      /class=["'][^"']*article-summary[^"']*["']/i.test(cleaned) ||
      /data-prerender-article-body/i.test(cleaned)
    const hasNewsArticleSchema = htmlHasSchemaType(cleaned, 'NewsArticle')
    const hasBreadcrumbSchema = htmlHasSchemaType(cleaned, 'BreadcrumbList')
    const backendSchemas = article
      ? getBackendArticleSchemas(article).filter((schema) =>
          !schemaHasType(schema, 'NewsArticle') &&
          !schemaHasType(schema, 'Article') &&
          !schemaHasType(schema, 'BreadcrumbList')
        )
      : []
    const missingBackendSchemas = backendSchemas.filter((schema) =>
      getSchemaTypeTokens(schema).every((type) => !htmlHasSchemaType(cleaned, type))
    )

    if (ENABLE_ARTICLE_BODY_FALLBACK && article && !hasArticleBodyMarkup) {
      const fallbackArticleHtml = buildArticleFallbackHtml(article, route, meta)
      if (fallbackArticleHtml) {
        cleaned = injectArticleFallbackIntoRoot(cleaned, fallbackArticleHtml)
        cleaned = cleaned.replace(
          /<div class=["']min-h-\[1px\]["']>\s*<\/div>/gi,
          ''
        )
        console.log(`    Injected crawlable article HTML for ${route}`)
      }
    }

    if (article && (!hasNewsArticleSchema || !hasBreadcrumbSchema || missingBackendSchemas.length > 0)) {
      const schemaChunks = []

      missingBackendSchemas.forEach((schema) => {
        schemaChunks.push(
          `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
        )
      })

      if (!hasNewsArticleSchema) {
        const articleSchema = buildArticleSchemaJson(article, route, meta)
        if (articleSchema) {
          schemaChunks.push(
            `<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>`
          )
        }
      }

      if (!hasBreadcrumbSchema) {
        const breadcrumbSchema = buildBreadcrumbSchemaJson(article, route, meta)
        if (breadcrumbSchema) {
          schemaChunks.push(
            `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`
          )
        }
      }

      if (schemaChunks.length > 0) {
        cleaned = cleaned.replace('</head>', `\n${schemaChunks.join('\n')}\n</head>`)
        console.log(`    Injected missing JSON-LD fallback for ${route}`)
      }
    }
  }

  if (route.startsWith('/category/')) {
    const hasBreadcrumbSchema = htmlHasSchemaType(cleaned, 'BreadcrumbList')

    if (!hasBreadcrumbSchema) {
      const breadcrumbSchema = buildCategoryBreadcrumbSchemaJson(route, meta, categoryMap)
      if (breadcrumbSchema) {
        cleaned = cleaned.replace(
          '</head>',
          `\n<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>\n</head>`
        )
        console.log(`    Injected category BreadcrumbList JSON-LD for ${route}`)
      }
    }
  }

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
    articles: [],
    categories: [],
  }

  Object.keys(STATIC_PAGE_META).forEach((route) => routeSet.add(route))

  // Articles
  try {
    const cacheBust = `_=${Date.now()}`
    const articles = await fetchAllArticles({ limit: 100, maxPages: 200 })
    const sortedArticles = [...articles].sort(
      (a, b) => new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0)
    )
    const homepageHeroArticle = sortedArticles.find((article) => article?.image_url || article?.image)
    siteData.articles = sortedArticles

    siteData.homepageHeroImage =
      homepageHeroArticle?.image_url ||
      homepageHeroArticle?.image ||
      'https://news4bharat.com/news4bharat-share.png'

    let added = 0
    let legacyAdded = 0
    let tagAdded = 0
    const tagRoutes = new Set()
    const detailTasks = []
    IMPORTANT_TAG_ROUTES.forEach((route) => {
      routeSet.add(route)
      tagRoutes.add(route)
    })
    const routeArticles = sortedArticles.length > 0 ? sortedArticles : articles

    routeArticles.forEach((a) => {
      const articleRoutes = getArticleRoutes(a)
      if (articleRoutes.length > 0) {
        const articleSlug = getArticleSlugFromRoute(articleRoutes[0])
        articleRoutes.forEach((route) => {
          routeSet.add(route)
          articleMap.set(route, a)
        })
        getLegacyArticleRoutes(a).forEach((route) => {
          routeSet.add(route)
          articleMap.set(route, a)
          legacyAdded++
        })
        getArticleTags(a).forEach((tag) => {
          if (tagAdded >= MAX_TAG_ROUTES) return
          const tagRoute = getTagRoute(tag)
          if (!tagRoute || tagRoutes.has(tagRoute)) return
          tagRoutes.add(tagRoute)
          routeSet.add(tagRoute)
          tagAdded++
        })
        if (articleSlug) {
          detailTasks.push(
            Promise.all([
              fetchWithRetry(`${API_BASE}/articles/slug/${encodeURIComponent(articleSlug)}/?${cacheBust}`),
              fetchWithRetry(`${API_BASE}/seo/article/${encodeURIComponent(articleSlug)}/?${cacheBust}`).catch(() => null),
            ])
              .then(([detail, seoEndpoint]) => {
                const finalDetail = Array.isArray(detail) ? detail[0] : detail
                if (finalDetail) {
                  const articleWithSeo = seoEndpoint
                    ? {
                        ...finalDetail,
                        seo_endpoint: seoEndpoint,
                        seo_meta: isPlainObject(seoEndpoint?.meta) ? seoEndpoint.meta : {},
                      }
                    : finalDetail
                  articleRoutes.forEach((route) => {
                    articleMap.set(route, articleWithSeo)
                  })
                  getLegacyArticleRoutes(articleWithSeo).forEach((route) => {
                    articleMap.set(route, articleWithSeo)
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
    console.log(`Added ${legacyAdded} legacy article routes`)
    console.log(`Added ${tagRoutes.size} tag routes`)

    if (dispatchPayload?.slug) {
      try {
        const forcedDetail = await fetchWithRetry(
          `${API_BASE}/articles/slug/${encodeURIComponent(dispatchPayload.slug)}?${cacheBust}`
        )
        const forcedArticle = Array.isArray(forcedDetail) ? forcedDetail[0] : forcedDetail

        if (forcedArticle && (forcedArticle.slug || forcedArticle.id)) {
          const forcedSlug = normalizeSlugToken(forcedArticle.slug || dispatchPayload.slug)
          const forcedSeoEndpoint = forcedSlug
            ? await fetchWithRetry(`${API_BASE}/seo/article/${encodeURIComponent(forcedSlug)}/?${cacheBust}`).catch(() => null)
            : null
          const forcedArticleWithSeo = forcedSeoEndpoint
            ? {
                ...forcedArticle,
                seo_endpoint: forcedSeoEndpoint,
                seo_meta: isPlainObject(forcedSeoEndpoint?.meta) ? forcedSeoEndpoint.meta : {},
              }
            : forcedArticle
          const forcedRoutes = getArticleRoutes(forcedArticleWithSeo)

          forcedRoutes.forEach((route) => routeSet.add(route))
          forcedRoutes.forEach((route) => {
            articleMap.set(route, forcedArticleWithSeo)
          })
          getLegacyArticleRoutes(forcedArticleWithSeo).forEach((route) => {
            routeSet.add(route)
            articleMap.set(route, forcedArticleWithSeo)
          })
          getArticleTags(forcedArticleWithSeo).forEach((tag) => {
            const tagRoute = getTagRoute(tag)
            if (tagRoute) routeSet.add(tagRoute)
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
    const categories = getListFromCategoriesResponse(data)
    siteData.categories = categories

    let added = 0
    categories.forEach((c) => {
      if (isValidSlug(c.slug)) {
        const cleanSlug = c.slug.trim().toLowerCase()
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

function installPrerenderDataScript(siteData) {
  const shellPath = path.join(__dirname, 'build', 'index.html')
  if (!fs.existsSync(shellPath)) {
    console.log('Prerender data script skipped because build/index.html was not found')
    return
  }

  const payload = {
    articles: pickArticlePrerenderSeeds(
      Array.isArray(siteData?.articles) ? siteData.articles : [],
      { includeBody: true }
    ),
    categories: Array.isArray(siteData?.categories) ? siteData.categories : [],
    homepageHeroImage: siteData?.homepageHeroImage || '',
  }
  const json = JSON.stringify(payload).replace(/</g, '\\u003c')
  const dataScript = `<script>window.__N4B_PRERENDER_DATA__=${json};</script>`
  let html = fs.readFileSync(shellPath, 'utf8')

  html = html
    .replace(PRERENDER_DATA_SCRIPT_PATTERN, '')
    .replace(/<script\b[^>]*type=["']module["'][^>]*>/i, `${dataScript}\n$&`)

  fs.writeFileSync(shellPath, html, 'utf8')
  console.log(`Injected React prerender data (${payload.articles.length} articles, ${payload.categories.length} categories)`)
}

async function renderInBatches(prerenderer, routes, articleMap, categoryMap, siteData, batchSize = 3) {
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

            const outputPath = getPrerenderOutputPath(path.join(__dirname, 'build'), r)
            fs.mkdirSync(path.dirname(outputPath), { recursive: true })
            fs.writeFileSync(outputPath, cleanHtml, 'utf8')

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
    const outputPath = getPrerenderOutputPath(path.join(__dirname, 'build'), route)

    if (fs.existsSync(outputPath)) {
      console.log(`  STATIC SEO skipped existing ${route}`)
      return
    }

    const staticHtml = cleanupPrerenderedHtml(
      shellHtml,
      route,
      articleMap,
      categoryMap,
      siteData
    )

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, staticHtml, 'utf8')
    console.log(`  STATIC SEO ${route}`)
  })
}

console.log('Fetching routes and API data...')
const { routes, articleMap, categoryMap, siteData } = await getRoutesAndData()
console.log(`\nTotal ${routes.length} routes will be prerendered\n`)
installPrerenderDataScript(siteData)

const prerenderer = new Prerenderer({
  staticDir: path.join(__dirname, 'build'),
  server: {
    host: '127.0.0.1',
    listenHost: '127.0.0.1',
    port: 0,
  },
  renderer: new PuppeteerRenderer({
    renderAfterDocumentEvent: 'prerender-ready',
    timeout: 15000,
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
  prerenderer, routes, articleMap, categoryMap, siteData, 3
)

await prerenderer.destroy()

ensureStaticPageHtml(articleMap, categoryMap, siteData)

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
