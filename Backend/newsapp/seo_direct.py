"""
newsapp/seo_direct.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tere existing Django project mein DIRECTLY integrate hoga.
Koi alag app nahi — sirf yeh ek file + signals.py mein 2 lines.

Tera Article model already hai:
  - slug, meta_description, focus_keyword, noindex, nofollow, in_sitemap
  - published_at (save() mein set hota hai)
  - status = 'published'

Yeh file karta hai:
  1. Sitemap XMLs (articles, news, categories, static)
  2. robots.txt
  3. RSS feed
  4. Meta tags + Schema.org JSON-LD (views mein inject karo)
  5. Google Indexing API (tera JSON file use karega)
  6. IndexNow (Bing)
  7. Auto-submit signal (article publish hote hi)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import json, os, logging, html, re
from datetime import datetime, timedelta
from xml.etree import ElementTree as ET
from xml.dom import minidom

import requests
import bleach

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.utils.dateparse import parse_datetime

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# CONFIG — settings.py mein override karo
# ─────────────────────────────────────────────
SEO = {
    "SITE_URL":       getattr(settings, "SEO_SITE_URL",        "https://news4bharat.com"),
    "SITE_NAME":      getattr(settings, "SEO_SITE_NAME",        "News4Bharat"),
    "TAGLINE":        getattr(settings, "SEO_TAGLINE",          "Breaking News, Latest India & World News"),
    "TWITTER":        getattr(settings, "SEO_TWITTER",          "@news4bharat"),
    "FB_APP_ID":      getattr(settings, "SEO_FB_APP_ID",        ""),
    "LOGO_URL":       getattr(settings, "SEO_LOGO_URL",         "https://news4bharat.com/images/logo.png"),
    "INDEXNOW_KEY":   getattr(settings, "SEO_INDEXNOW_KEY",     "your-indexnow-key"),
    "GOOGLE_VERIFY":  getattr(settings, "SEO_GOOGLE_VERIFY",    ""),
    "BING_VERIFY":    getattr(settings, "SEO_BING_VERIFY",      ""),

    # Tera service account JSON (root mein rakha hai)
    "GOOGLE_SA_JSON": getattr(settings, "SEO_GOOGLE_SA_JSON",
                              os.path.join(getattr(settings, "BASE_DIR", ""),
                                           "news4bharat-indexing-f0568ad9e074.json")),
}

CACHE_SITEMAP = 1800   # 30 min
CACHE_NEWS    = 300    # 5 min
CACHE_FEED    = 300    # 5 min
SITEMAP_INDEX_CACHE_KEY = "seo:sitemap:index:v3"
SITEMAP_NEWS_CACHE_KEY = "seo:sitemap:news:v2"
SITEMAP_ARTICLES_CACHE_PREFIX = "seo:sitemap:articles:v2"
SITEMAP_IMAGES_CACHE_KEY = "seo:sitemap:images:v2"
SITEMAP_BHARAT_OPINIONS_CACHE_KEY = "seo:sitemap:bharat-opinions:v1"


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _prettify(element: ET.Element) -> str:
    rough = ET.tostring(element, encoding="unicode")
    reparsed = minidom.parseString(f'<?xml version="1.0" encoding="UTF-8"?>{rough}')
    return reparsed.toprettyxml(indent="  ", encoding="UTF-8").decode("utf-8")


def _strip(text: str, max_len: int = 0) -> str:
    clean = bleach.clean(text or "", tags=[], strip=True).strip()
    return clean[:max_len] if max_len else clean


def _normalize_image_url(url: str, base: str = None) -> str:
    base = (base or SEO["SITE_URL"]).rstrip("/")
    raw = str(url or "").strip()
    if not raw or raw.startswith("data:") or raw.startswith("blob:"):
        return ""
    if raw.startswith("//"):
        return f"https:{raw}"
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if raw.startswith("/"):
        return f"{base}{raw}"
    return f"{base}/{raw.lstrip('/')}"


def _schema_csv(value: str, fallback: list[str] = None) -> list[str]:
    values = [item.strip() for item in str(value or "").split(",") if item.strip()]
    if values:
        return list(dict.fromkeys(values))
    return list(fallback or [])


def _schema_json_list(value, fallback: list[str] = None) -> list[str]:
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        raw = value.strip()
        if not raw:
            items = []
        else:
            try:
                parsed = json.loads(raw)
                items = parsed if isinstance(parsed, list) else [raw]
            except Exception:
                items = [part.strip() for part in raw.split(",")]
    else:
        items = []
    normalized = []
    for item in items:
        text = str(item or "").strip()
        if text and text not in normalized:
            normalized.append(text)
    return normalized or list(fallback or [])


def _parse_custom_schema_blob(raw_value):
    raw = str(raw_value or "").strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    if isinstance(parsed, dict):
        return [parsed]
    if isinstance(parsed, list):
        return [item for item in parsed if isinstance(item, dict)]
    return []


def _schema_type_values(schema_obj) -> list[str]:
    if not isinstance(schema_obj, dict):
        return []
    raw_type = schema_obj.get("@type")
    if isinstance(raw_type, list):
        values = raw_type
    else:
        values = [raw_type]
    normalized = []
    for item in values:
        text = str(item or "").strip()
        if text and text not in normalized:
            normalized.append(text)
    return normalized


def _dedupe_schema_payloads(schema_items: list[dict]) -> list[dict]:
    deduped = []
    seen_faq_page = False

    for item in schema_items or []:
        if not isinstance(item, dict) or not item:
            continue

        schema_types = _schema_type_values(item)
        is_faq_page = "FAQPage" in schema_types
        if is_faq_page:
            if seen_faq_page:
                continue
            seen_faq_page = True

        deduped.append(item)

    return deduped


def _faq_schema_items(value) -> list[dict]:
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            items = []
        else:
            try:
                parsed = json.loads(raw)
                items = parsed if isinstance(parsed, list) else []
            except Exception:
                items = []
    elif isinstance(value, list):
        items = value
    else:
        items = []

    normalized = []
    for item in items:
        if not isinstance(item, dict):
            continue
        question = _strip(item.get("question", ""), 500)
        answer_raw = str(item.get("answer", "") or "").strip()
        if not question or not answer_raw:
            continue
        answer = bleach.clean(
            answer_raw,
            tags=["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "a"],
            attributes={"a": ["href", "title", "target", "rel"]},
            strip=True,
        ).strip()
        if not answer:
            continue
        normalized.append({"question": question, "answer": answer})
    return normalized


def article_schema_payloads(article) -> list[dict]:
    schemas = [
        SchemaEngine.news_article(article),
        SchemaEngine.breadcrumb(article),
        SchemaEngine.organization(article),
        SchemaEngine.website(article),
    ]
    faq_schema = SchemaEngine.faq_page(article)
    if faq_schema:
        schemas.append(faq_schema)
    schemas.extend(_parse_custom_schema_blob(getattr(article, "schema_custom_jsonld", "")))
    return _dedupe_schema_payloads(schemas)


def _extract_article_image_entries(article, base: str = None) -> list[dict]:
    base = (base or SEO["SITE_URL"]).rstrip("/")
    images = []
    seen = set()

    def add_image(url: str, *, title: str = "", caption: str = ""):
        normalized = _normalize_image_url(url, base)
        if not normalized or normalized in seen:
            return
        seen.add(normalized)
        entry = {"loc": normalized}
        clean_title = _strip(title, 200)
        clean_caption = _strip(caption, 500)
        if clean_title:
            entry["title"] = clean_title
        if clean_caption:
            entry["caption"] = clean_caption
        images.append(entry)

    add_image(
        getattr(article, "get_image", lambda: "")(),
        title=getattr(article, "title", ""),
        caption=getattr(article, "image_alt", ""),
    )

    content = getattr(article, "content", "") or ""
    for match in re.finditer(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>', content, re.IGNORECASE):
        tag = match.group(0)
        src = match.group(1)
        alt_match = re.search(r'\balt=["\']([^"\']*)["\']', tag, re.IGNORECASE)
        title_match = re.search(r'\btitle=["\']([^"\']*)["\']', tag, re.IGNORECASE)
        add_image(
            src,
            title=(title_match.group(1) if title_match else getattr(article, "title", "")),
            caption=(alt_match.group(1) if alt_match else ""),
        )

    return images


def _iso(dt) -> str:
    if dt is None:
        dt = timezone.now()
    elif isinstance(dt, str):
        parsed = parse_datetime(dt.strip())
        if parsed is None:
            return dt
        dt = parsed

    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_default_timezone())
    else:
        dt = timezone.localtime(dt, timezone.get_default_timezone())

    return dt.replace(microsecond=0).isoformat(timespec="seconds")


def _cached(key, fn, ttl):
    """Django cache-aside (works with DB cache — Redis nahi chahiye)."""
    hit = cache.get(key)
    if hit:
        return hit
    result = fn()
    cache.set(key, result, ttl)
    return result


def invalidate_seo_caches():
    from newsapp.models import Article

    total_articles = Article.objects.filter(status="published", in_sitemap=True).count()
    article_pages = max(1, (total_articles + 999) // 1000)

    keys = [
        "seo:sitemap:news",
        "seo:sitemap:index",
        "seo:sitemap:index:v2",
        "seo:sitemap:images",
        SITEMAP_NEWS_CACHE_KEY,
        SITEMAP_INDEX_CACHE_KEY,
        SITEMAP_IMAGES_CACHE_KEY,
        SITEMAP_BHARAT_OPINIONS_CACHE_KEY,
        "seo:rss:all",
    ]
    keys.extend(f"seo:sitemap:articles:{page}" for page in range(1, article_pages + 1))
    keys.extend(f"{SITEMAP_ARTICLES_CACHE_PREFIX}:{page}" for page in range(1, article_pages + 1))

    for key in keys:
        cache.delete(key)

    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern("seo:rss:*")
            cache.delete_pattern("seo:sitemap:*")
    except Exception:
        pass


def primary_category(article):
    if getattr(article, "primary_category_id", None):
        return getattr(article, "primary_category", None)
    return article.categories.first() if hasattr(article, "categories") else None


def primary_category_slug(article) -> str:
    primary_cat = primary_category(article)
    return getattr(primary_cat, "slug", "") or ""


def clean_url_segment(value) -> str:
    parts = [part.strip() for part in re.split(r"/+", str(value or "").strip("/")) if part.strip()]
    return parts[-1] if parts else ""


def article_path(article_or_slug, category_slug: str = None) -> str:
    if hasattr(article_or_slug, "slug"):
        slug = clean_url_segment(article_or_slug.slug)
        category_slug = category_slug or primary_category_slug(article_or_slug)
    else:
        slug = clean_url_segment(article_or_slug)
    category_slug = clean_url_segment(category_slug)
    if category_slug:
        return f"/{category_slug}/{slug}/"
    return f"/article/{slug}/"


def article_url(article_or_slug, base: str = None, category_slug: str = None) -> str:
    base = (base or SEO["SITE_URL"]).rstrip("/")
    return f"{base}{article_path(article_or_slug, category_slug)}"


def normalized_canonical(article, default_url: str) -> str:
    canonical = (article.canonical_url or "").strip()
    if not canonical:
        return default_url

    site_base = SEO["SITE_URL"].rstrip("/")
    article_slug = clean_url_segment(article.slug)
    legacy_url = f"{site_base}/news/{article_slug}"
    if canonical.rstrip("/") == legacy_url.rstrip("/"):
        return article_url(article, site_base)

    legacy_article_url = f"{site_base}/article/{article_slug}"
    if canonical.rstrip("/") == legacy_article_url.rstrip("/"):
        return article_url(article, site_base)

    return canonical


# ════════════════════════════════════════════════════════════
# MODULE 1 — ROBOTS.TXT
# ════════════════════════════════════════════════════════════

def robots_txt() -> str:
    base = SEO["SITE_URL"]
    key  = SEO["INDEXNOW_KEY"]
    return f"""# robots.txt — {SEO["SITE_NAME"]}

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /editor/
Disallow: /login
Disallow: /register
Disallow: /preview/
Disallow: /category/news4bharat
Disallow: /*?utm_*
Disallow: /*?ref=*
Disallow: /search?*
Crawl-delay: 1

User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /category/news4bharat
Crawl-delay: 0

User-agent: Google-InspectionTool
Allow: /
Disallow: /admin/
Disallow: /category/news4bharat
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /category/news4bharat
Crawl-delay: 1

User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

Sitemap: {base}/sitemap.xml
Sitemap: {base}/sitemap_index.xml
Sitemap: {base}/sitemap-news.xml
Sitemap: {base}/sitemap-articles.xml
Sitemap: {base}/sitemap-bharat-opinions.xml
Sitemap: {base}/sitemap-images.xml
Sitemap: {base}/sitemap-categories.xml
Sitemap: {base}/sitemap-static.xml
# IndexNow: {base}/{key}.txt
"""


# ════════════════════════════════════════════════════════════
# MODULE 2 — SITEMAP ENGINE
# Tera Article model directly use karta hai
# ════════════════════════════════════════════════════════════

class SitemapEngine:

    @classmethod
    def index(cls) -> str:
        return _cached(SITEMAP_INDEX_CACHE_KEY, cls._build_index, CACHE_SITEMAP)

    @staticmethod
    def _build_index() -> str:
        from newsapp.models import Article  # ← tera app name
        base = SEO["SITE_URL"]
        now  = datetime.utcnow().isoformat() + "Z"
        sitemap_ns = "http://www.sitemaps.org/schemas/sitemap/0.9"

        ET.register_namespace("", sitemap_ns)
        root = ET.Element(f"{{{sitemap_ns}}}sitemapindex")

        # Paginated article sitemaps
        total = Article.objects.filter(status="published", in_sitemap=True).count()
        pages = max(1, (total + 999) // 1000)

        for path in [
            f"{base}/sitemap-articles.xml",
            f"{base}/sitemap-bharat-opinions.xml",
            f"{base}/sitemap-news.xml",
            f"{base}/sitemap-images.xml",
            f"{base}/sitemap-categories.xml",
            f"{base}/sitemap-static.xml",
        ]:
            sm = ET.SubElement(root, f"{{{sitemap_ns}}}sitemap")
            ET.SubElement(sm, f"{{{sitemap_ns}}}loc").text     = path
            ET.SubElement(sm, f"{{{sitemap_ns}}}lastmod").text = now

        for p in range(2, pages + 1):
            sm = ET.SubElement(root, f"{{{sitemap_ns}}}sitemap")
            ET.SubElement(sm, f"{{{sitemap_ns}}}loc").text     = f"{base}/sitemap-articles-{p}.xml"
            ET.SubElement(sm, f"{{{sitemap_ns}}}lastmod").text = now

        return _prettify(root)

    # ── Google News Sitemap (last 48 hrs) ────────────────────
    @classmethod
    def news(cls) -> str:
        return _cached(SITEMAP_NEWS_CACHE_KEY, cls._build_news, CACHE_NEWS)

    @staticmethod
    def _build_news() -> str:
        from newsapp.models import Article
        base  = SEO["SITE_URL"]
        since = timezone.now() - timedelta(days=2)

        # Tera Article mein `categories` ManyToMany hai
        articles = (
            Article.objects
            .filter(status="published", in_sitemap=True, published_at__gte=since)
            .prefetch_related("categories")
            .order_by("-published_at")[:1000]
        )

        ET.register_namespace("",      "http://www.sitemaps.org/schemas/sitemap/0.9")
        ET.register_namespace("news",  "http://www.google.com/schemas/sitemap-news/0.9")
        ET.register_namespace("image", "http://www.google.com/schemas/sitemap-image/1.1")

        root = ET.Element("urlset", {
            "xmlns":        "http://www.sitemaps.org/schemas/sitemap/0.9",
            "xmlns:news":   "http://www.google.com/schemas/sitemap-news/0.9",
            "xmlns:image":  "http://www.google.com/schemas/sitemap-image/1.1",
        })

        for a in articles:
            url = ET.SubElement(root, "url")
            ET.SubElement(url, "loc").text     = article_url(a, base)
            ET.SubElement(url, "lastmod").text = _iso(a.published_at)

            news_el = ET.SubElement(url, "news:news")
            pub_el  = ET.SubElement(news_el, "news:publication")
            ET.SubElement(pub_el, "news:name").text     = SEO["SITE_NAME"]
            ET.SubElement(pub_el, "news:language").text = "en"
            ET.SubElement(news_el, "news:publication_date").text = _iso(a.published_at)
            ET.SubElement(news_el, "news:title").text            = a.title

            # focus_keyword + tags → news:keywords
            kws = []
            if a.focus_keyword:
                kws.append(a.focus_keyword)
            if a.tags:
                kws += [t.strip() for t in a.tags.split(",") if t.strip()]
            if kws:
                ET.SubElement(news_el, "news:keywords").text = ", ".join(kws[:10])

            # Featured image (tera Article.get_image() method hai)
            img_url = a.get_image()
            if img_url:
                img_el = ET.SubElement(url, "image:image")
                ET.SubElement(img_el, "image:loc").text   = img_url if img_url.startswith("http") else f"{base}{img_url}"
                ET.SubElement(img_el, "image:title").text = a.title

        return _prettify(root)

    # ── Articles Sitemap ─────────────────────────────────────
    @classmethod
    def articles(cls, page: int = 1) -> str:
        return _cached(f"{SITEMAP_ARTICLES_CACHE_PREFIX}:{page}",
                       lambda: cls._build_articles(page), CACHE_SITEMAP)

    @staticmethod
    def _build_articles(page: int = 1) -> str:
        from newsapp.models import Article
        base   = SEO["SITE_URL"]
        limit  = 1000
        offset = (page - 1) * limit

        articles = (
            Article.objects
            .filter(status="published", in_sitemap=True)
            .order_by("-updated_at", "-published_at", "-created_at")[offset: offset + limit]
        )

        ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")

        root = ET.Element("urlset", {
            "xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
        })

        for a in articles:
            url_el = ET.SubElement(root, "url")
            ET.SubElement(url_el, "loc").text = article_url(a, base)
            ET.SubElement(url_el, "lastmod").text = _iso(
                getattr(a, "updated_at", None) or a.published_at or timezone.now()
            )

        return _prettify(root)

    @classmethod
    def bharat_opinions(cls) -> str:
        return _cached(
            SITEMAP_BHARAT_OPINIONS_CACHE_KEY,
            lambda: cls._build_category_articles("bharat-opinions"),
            CACHE_SITEMAP,
        )

    @staticmethod
    def _build_category_articles(category_slug: str) -> str:
        from newsapp.models import Article
        base = SEO["SITE_URL"]

        articles = (
            Article.objects
            .filter(status="published", in_sitemap=True, categories__slug=category_slug)
            .distinct()
            .order_by("-published_at", "-updated_at")[:1000]
        )

        ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
        root = ET.Element("urlset", {
            "xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
        })

        for article in articles:
            url_el = ET.SubElement(root, "url")
            ET.SubElement(url_el, "loc").text = article_url(article, base, category_slug=category_slug)
            ET.SubElement(url_el, "lastmod").text = _iso(
                getattr(article, "updated_at", None) or article.published_at or timezone.now()
            )
            ET.SubElement(url_el, "changefreq").text = "daily"
            ET.SubElement(url_el, "priority").text = "1.0"

        return _prettify(root)

    @classmethod
    def images(cls) -> str:
        return _cached(SITEMAP_IMAGES_CACHE_KEY, cls._build_images, CACHE_SITEMAP)

    @staticmethod
    def _build_images() -> str:
        from newsapp.models import Article

        base = SEO["SITE_URL"]
        articles = (
            Article.objects
            .filter(status="published", in_sitemap=True)
            .prefetch_related("categories")
            .order_by("-updated_at", "-published_at", "-created_at")[:5000]
        )

        ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
        ET.register_namespace("image", "http://www.google.com/schemas/sitemap-image/1.1")

        root = ET.Element("urlset", {
            "xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
            "xmlns:image": "http://www.google.com/schemas/sitemap-image/1.1",
        })

        for article in articles:
            image_entries = _extract_article_image_entries(article, base)
            if not image_entries:
                continue

            url_el = ET.SubElement(root, "url")
            ET.SubElement(url_el, "loc").text = article_url(article, base)
            ET.SubElement(url_el, "lastmod").text = _iso(article.published_at or timezone.now())

            for image_entry in image_entries:
                img_el = ET.SubElement(url_el, "image:image")
                ET.SubElement(img_el, "image:loc").text = image_entry["loc"]
                if image_entry.get("title"):
                    ET.SubElement(img_el, "image:title").text = image_entry["title"]
                if image_entry.get("caption"):
                    ET.SubElement(img_el, "image:caption").text = image_entry["caption"]

        return _prettify(root)

    # ── Categories Sitemap ───────────────────────────────────
    @classmethod
    def categories(cls) -> str:
        return _cached("seo:sitemap:categories", cls._build_categories, 3600)

    @staticmethod
    def _build_categories() -> str:
        from newsapp.models import Category
        base = SEO["SITE_URL"]
        root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

        for c in Category.objects.filter(status="active"):
            category_slug = clean_url_segment(c.slug)
            if not category_slug:
                continue
            url = ET.SubElement(root, "url")
            ET.SubElement(url, "loc").text        = f"{base}/category/{category_slug}/"
            ET.SubElement(url, "changefreq").text = "hourly"
            ET.SubElement(url, "priority").text   = "0.8"

        return _prettify(root)

    # ── Static pages sitemap ─────────────────────────────────
    @staticmethod
    def static_pages() -> str:
        base  = SEO["SITE_URL"]
        today = datetime.utcnow().date().isoformat()
        pages = [
            ("/",               "1.0", "always"),
            ("/about-us/",             "1.0", "daily"),
            ("/contact-us/",           "1.0", "daily"),
            ("/privacy-policy/",       "1.0", "daily"),
            ("/terms-and-conditions/", "1.0", "daily"),
            ("/disclaimer/",           "1.0", "daily"),
            ("/editorial-policy/",     "1.0", "daily"),
            ("/founders-note/",        "1.0", "daily"),
            ("/careers/",              "1.0", "daily"),
        ]
        root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
        for path, priority, freq in pages:
            url = ET.SubElement(root, "url")
            ET.SubElement(url, "loc").text        = f"{base}{path}"
            ET.SubElement(url, "changefreq").text = freq
            ET.SubElement(url, "priority").text   = priority
            ET.SubElement(url, "lastmod").text    = today
        return _prettify(root)


# ════════════════════════════════════════════════════════════
# MODULE 3 — SCHEMA.ORG  (tera Article model ke fields use karta hai)
# ════════════════════════════════════════════════════════════

class SchemaEngine:

    @staticmethod
    def organization(article=None) -> dict:
        base = SEO["SITE_URL"]
        org_name = (
            str(getattr(article, "schema_publisher_name", "") or "").strip()
            or SEO["SITE_NAME"]
        )
        org_type = (
            str(getattr(article, "schema_organization_type", "") or "").strip()
            or "NewsMediaOrganization"
        )
        logo_url = _normalize_image_url(
            getattr(article, "schema_publisher_logo_url", "") if article else "",
            base,
        ) or SEO["LOGO_URL"]
        same_as = _schema_json_list(
            getattr(article, "schema_organization_sameas", []) if article else [],
            [
                "https://www.facebook.com/news4bharat",
                "https://twitter.com/news4bharat",
                "https://www.instagram.com/news4bharat",
                "https://www.youtube.com/c/news4bharat",
            ],
        )
        return {
            "@context": "https://schema.org",
            "@type": org_type,
            "@id": f"{base}/#organization",
            "name": org_name,
            "url":  base,
            "logo": {"@type": "ImageObject", "url": logo_url},
            "sameAs": same_as,
        }

    @staticmethod
    def website(article=None) -> dict:
        base = SEO["SITE_URL"]
        site_name = (
            str(getattr(article, "schema_publisher_name", "") or "").strip()
            or SEO["SITE_NAME"]
        )
        return {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": f"{base}/#website",
            "url":  base,
            "name": site_name,
            "description": SEO["TAGLINE"],
            "publisher": {"@id": f"{base}/#organization"},
            "potentialAction": {
                "@type": "SearchAction",
                "target": {"@type": "EntryPoint", "urlTemplate": f"{base}/search?q={{search_term_string}}"},
                "query-input": "required name=search_term_string",
            },
        }

    @staticmethod
    def news_article(article) -> dict:
        """
        article = tera Django Article instance
        Tera model ke fields seedha use karta hai.
        """
        base    = SEO["SITE_URL"]
        url     = article_url(article, base)
        img_url = _normalize_image_url(
            getattr(article, "schema_image_url", "") or article.get_image(),
            base,
        )

        # Tags from comma-separated string (tera model: tags = CharField)
        tags_list = [t.strip() for t in (article.tags or "").split(",") if t.strip()]

        # Keywords = focus_keyword + secondary_keywords + tags
        kw_parts = []
        manual_keywords = _schema_csv(getattr(article, "schema_keywords", ""))
        if manual_keywords:
            kw_parts += manual_keywords
        else:
            if article.focus_keyword:
                kw_parts.append(article.focus_keyword)
            if article.secondary_keywords:
                kw_parts += [k.strip() for k in article.secondary_keywords.split(",") if k.strip()]
            kw_parts += tags_list

        # Author display name (tera model: author_display_name)
        author_name = (
            str(getattr(article, "schema_author_name", "") or "").strip()
            or article.author_display_name.strip()
            or article.author.get_full_name()
            or article.author.username
        )
        author_pos = article.author_display_position or ""
        author_url = (
            str(getattr(article, "schema_author_url", "") or "").strip()
            or f"{base}/author/{article.author_id}"
        )

        # Category
        primary_cat = primary_category(article)
        cat_name  = (
            str(getattr(article, "schema_article_section", "") or "").strip()
            or (str(primary_cat) if primary_cat else "")
        )
        schema_types = _schema_csv(getattr(article, "schema_types", ""), ["NewsArticle", "Article"])
        headline = str(getattr(article, "schema_headline", "") or "").strip() or article.title
        alt_headline = (
            str(getattr(article, "schema_alternative_headline", "") or "").strip()
            or article.subtitle
            or article.title
        )
        description = (
            str(getattr(article, "schema_description", "") or "").strip()
            or article.meta_description
            or _strip(article.content, 160)
        )
        date_published = getattr(article, "schema_date_published", None) or article.published_at
        date_modified = (
            getattr(article, "schema_date_modified", None)
            or getattr(article, "updated_at", None)
            or article.published_at
        )

        schema = {
            "@context": "https://schema.org",
            "@type":    schema_types,
            "@id":      f"{url}#article",
            "headline": headline,
            "alternativeHeadline": alt_headline,
            "description": description,
            "articleBody": _strip(article.content, 5000),
            "inLanguage":  "en-IN",
            "datePublished": _iso(date_published),
            "dateModified":  _iso(date_modified),
            "url": url,
            "mainEntityOfPage": {"@type": "WebPage", "@id": url},
            "publisher": {"@id": f"{base}/#organization"},
            "isAccessibleForFree": not article.is_paid,
            "author": {
                "@type": "Person",
                "name":  author_name,
                "url":   author_url,
                **({"jobTitle": author_pos} if author_pos else {}),
                **({"image": {"@type": "ImageObject", "url": article.author_display_photo}}
                   if article.author_display_photo else {}),
            },
            "speakable": {
                "@type": "SpeakableSpecification",
                "cssSelector": ["h1", ".article-summary"],
            },
        }

        if img_url:
            schema["image"] = {
                "@type":   "ImageObject",
                "url":     img_url,
                "caption": article.image_alt or article.title,
            }
            schema["thumbnailUrl"] = img_url

        if cat_name:
            schema["articleSection"] = cat_name

        if kw_parts:
            schema["keywords"] = ", ".join(dict.fromkeys(filter(None, kw_parts)))

        return schema

    @staticmethod
    def faq_page(article) -> dict:
        if not getattr(article, "faq_schema_enabled", False):
            return {}

        faq_items = _faq_schema_items(getattr(article, "faq_schema_items", []))
        if not faq_items:
            return {}

        base = SEO["SITE_URL"]
        url = article_url(article, base)
        title = _strip(getattr(article, "faq_schema_title", ""), 255)
        description = _strip(getattr(article, "faq_schema_description", ""), 500)

        schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": f"{url}#faq",
            "url": url,
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": item["question"],
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": item["answer"],
                    },
                }
                for item in faq_items
            ],
        }
        if title:
            schema["name"] = title
        if description:
            schema["description"] = description
        return schema

    @staticmethod
    def breadcrumb(article) -> dict:
        base     = SEO["SITE_URL"]
        first_cat = primary_category(article)
        items    = [{"id": 1, "name": "Home", "url": base}]
        if first_cat:
            items.append({"id": 2, "name": str(first_cat),
                          "url": f"{base}/category/{clean_url_segment(first_cat.slug)}/"})
        items.append({"id": len(items) + 1, "name": article.title,
                      "url": article_url(article, base)})
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": i["id"],
                 "name": i["name"], "item": i["url"]}
                for i in items
            ],
        }

    @staticmethod
    def script_tag(schema: dict) -> str:
        if not schema:
            return ""
        return (
            '<script type="application/ld+json">\n'
            + json.dumps(schema, ensure_ascii=False, indent=2)
            + "\n</script>"
        )


# ════════════════════════════════════════════════════════════
# MODULE 4 — META TAGS  (tera Article fields seedha use karta hai)
# ════════════════════════════════════════════════════════════

class MetaEngine:

    @staticmethod
    def for_article(article) -> dict:
        base    = SEO["SITE_URL"]
        url     = article_url(article, base)
        title   = (getattr(article, "meta_title", "") or article.title).strip()
        desc    = article.meta_description or _strip(article.content, 160)
        img_url = article.get_image()
        if img_url and not img_url.startswith("http"):
            img_url = f"{base}{img_url}"
        img_url = img_url or f"{base}/images/og-default.jpg"

        # Tags list
        tags_list = [t.strip() for t in (article.tags or "").split(",") if t.strip()]
        kw_parts  = []
        if article.focus_keyword:
            kw_parts.append(article.focus_keyword)
        if article.secondary_keywords:
            kw_parts += [k.strip() for k in article.secondary_keywords.split(",") if k.strip()]
        kw_parts += tags_list
        keywords = ", ".join(dict.fromkeys(filter(None, kw_parts)))

        # Canonical
        canonical = normalized_canonical(article, url)

        # Robots
        robots_parts = []
        robots_parts.append("noindex" if article.noindex else "index")
        robots_parts.append("nofollow" if article.nofollow else "follow")
        if not article.noindex:
            robots_parts.append("max-snippet:-1, max-image-preview:large")
        robots = ", ".join(robots_parts)

        primary_cat = primary_category(article)
        cat_name  = str(primary_cat) if primary_cat else ""

        author_name = (
            article.author_display_name.strip()
            or article.author.get_full_name()
            or article.author.username
        )

        return {
            "title":       title,
            "description": desc,
            "keywords":    keywords,
            "canonical":   canonical,
            "robots":      robots,
            "author":      author_name,
            "og": {
                "type":           "article",
                "title":          title,
                "description":    desc,
                "url":            url,
                "image":          img_url,
                "image_alt":      article.image_alt or title,
                "site_name":      SEO["SITE_NAME"],
                "locale":         "en_IN",
                "article:published_time": _iso(article.published_at),
                "article:author":         author_name,
                "article:section":        cat_name,
                "article:tag":            ",".join(tags_list),
            },
            "twitter": {
                "card":        "summary_large_image",
                "site":        SEO["TWITTER"],
                "title":       title[:70],
                "description": desc[:200],
                "image":       img_url,
            },
        }

    @staticmethod
    def render_head(meta: dict, schemas: list = None) -> str:
        """
        Complete <head> HTML block return karta hai.
        Template mein: {{ seo_head|safe }}
        """
        schemas = schemas or []
        e = html.escape

        og_tags = "\n".join(
            f'  <meta property="og:{k}" content="{e(str(v))}">'
            for k, v in (meta.get("og") or {}).items() if v
        )
        tw_tags = "\n".join(
            f'  <meta name="twitter:{k}" content="{e(str(v))}">'
            for k, v in (meta.get("twitter") or {}).items() if v
        )
        schema_scripts = "\n".join(
            SchemaEngine.script_tag(s) for s in schemas if s
        )

        base = SEO["SITE_URL"]
        gv   = SEO["GOOGLE_VERIFY"]
        bv   = SEO["BING_VERIFY"]
        name = SEO["SITE_NAME"]

        return f"""
  <title>{e(meta.get('title', ''))}</title>
  <meta name="description" content="{e(meta.get('description', ''))}">
  {"<meta name='keywords' content='" + e(meta['keywords']) + "'>" if meta.get('keywords') else ""}
  <link rel="canonical" href="{meta.get('canonical', '')}">
  <meta name="robots" content="{meta.get('robots', 'index, follow')}">
  {"<meta name='author' content='" + e(meta['author']) + "'>" if meta.get('author') else ""}
  <meta name="publisher" content="{e(name)}">
  {"<meta name='news_keywords' content='" + e(meta.get('keywords','')[:500]) + "'>" if meta.get('keywords') else ""}

  <!-- Open Graph -->
{og_tags}

  <!-- Twitter Card -->
{tw_tags}

  <!-- Structured Data -->
{schema_scripts}

  {"<meta name='google-site-verification' content='" + gv + "'>" if gv else ""}
  {"<meta name='msvalidate.01' content='" + bv + "'>" if bv else ""}

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://www.google-analytics.com">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#e63946">

  <link rel="alternate" type="application/rss+xml" title="{e(name)} RSS" href="{base}/rss.xml">
"""


# ════════════════════════════════════════════════════════════
# MODULE 5 — RSS FEED
# ════════════════════════════════════════════════════════════

def generate_rss(category_slug: str = None) -> str:
    cache_key = f"seo:rss:{category_slug or 'all'}"
    return _cached(cache_key, lambda: _build_rss(category_slug), CACHE_FEED)


def _build_rss(category_slug: str = None) -> str:
    from newsapp.models import Article
    base = SEO["SITE_URL"]
    name = SEO["SITE_NAME"]

    qs = (
        Article.objects.filter(status="published", in_sitemap=True)
        .prefetch_related("categories")
        .select_related("author")
        .order_by("-published_at")
    )
    if category_slug:
        qs = qs.filter(categories__slug=category_slug)
    articles = qs[:100]

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"',
        '  xmlns:media="http://search.yahoo.com/mrss/"',
        '  xmlns:dc="http://purl.org/dc/elements/1.1/"',
        '  xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        f'    <title>{name}</title>',
        f'    <link>{base}</link>',
        f'    <description>{SEO["TAGLINE"]}</description>',
        '    <language>en-in</language>',
        f'    <lastBuildDate>{datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")}</lastBuildDate>',
        '    <ttl>5</ttl>',
        f'    <atom:link href="{base}/rss.xml" rel="self" type="application/rss+xml"/>',
    ]

    for a in articles:
        article_url_value = article_url(a, base)
        excerpt = _strip(a.content or "", 300)
        pub_date = a.published_at.strftime("%a, %d %b %Y %H:%M:%S +0000") if a.published_at else ""
        author_name = a.author_display_name.strip() or a.author.get_full_name() or a.author.username
        primary_cat = primary_category(a)
        cat_name = str(primary_cat) if primary_cat else ""
        img_url = a.get_image()
        if img_url and not img_url.startswith("http"):
            img_url = f"{base}{img_url}"

        lines += [
            '    <item>',
            f'      <title><![CDATA[{a.title}]]></title>',
            f'      <link>{article_url_value}</link>',
            f'      <guid isPermaLink="true">{article_url_value}</guid>',
            f'      <description><![CDATA[{excerpt}]]></description>',
            f'      <pubDate>{pub_date}</pubDate>',
            f'      <dc:creator><![CDATA[{author_name}]]></dc:creator>',
            f'      <category><![CDATA[{cat_name}]]></category>' if cat_name else '',
        ]
        if img_url:
            lines += [
                f'      <media:content url="{img_url}" medium="image">',
                f'        <media:title><![CDATA[{a.title}]]></media:title>',
                f'      </media:content>',
                f'      <media:thumbnail url="{img_url}"/>',
            ]
        lines.append('    </item>')

    lines += ['  </channel>', '</rss>']
    return "\n".join(l for l in lines if l)


# ════════════════════════════════════════════════════════════
# MODULE 6 — GOOGLE INDEXING API
# Tera service account JSON seedha use karta hai
# ════════════════════════════════════════════════════════════

class GoogleIndexingAPI:
    SCOPES   = ["https://www.googleapis.com/auth/indexing"]
    ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"

    @classmethod
    def _token(cls):
        sa_path = SEO["GOOGLE_SA_JSON"]
        if not os.path.exists(sa_path):
            logger.error(f"[SEO] Google SA JSON not found: {sa_path}")
            return None
        try:
            import google.auth.transport.requests
            from google.oauth2 import service_account
            creds = service_account.Credentials.from_service_account_file(
                sa_path, scopes=cls.SCOPES
            )
            creds.refresh(google.auth.transport.requests.Request())
            return creds.token
        except Exception as e:
            logger.error(f"[SEO] Google auth failed: {e}")
            return None

    @classmethod
    def submit(cls, url: str, url_type: str = "URL_UPDATED") -> dict:
        token = cls._token()
        if not token:
            return {"success": False, "error": "Auth failed"}
        try:
            resp = requests.post(
                cls.ENDPOINT,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"url": url, "type": url_type},
                timeout=10,
            )
            ok = resp.status_code in (200, 204)
            if ok:
                logger.info(f"[SEO] Google indexed: {url}")
            else:
                logger.warning(f"[SEO] Google index failed {resp.status_code}: {resp.text[:200]}")
            return {"success": ok, "url": url, "status": resp.status_code}
        except Exception as e:
            return {"success": False, "url": url, "error": str(e)}

    @classmethod
    def submit_article(cls, article) -> dict:
        base = SEO["SITE_URL"]
        return {
            "article": cls.submit(article_url(article, base)),
        }


# ════════════════════════════════════════════════════════════
# MODULE 7 — INDEXNOW (Bing instant ping)
# ════════════════════════════════════════════════════════════

class IndexNow:
    ENDPOINT = getattr(settings, "SEO_INDEXNOW_ENDPOINT", "https://api.indexnow.org/indexnow")

    @classmethod
    def submit(cls, urls) -> dict:
        if isinstance(urls, str):
            urls = [urls]
        key  = SEO["INDEXNOW_KEY"]
        site_url = SEO["SITE_URL"].rstrip("/")
        host = site_url.replace("https://", "").replace("http://", "").strip("/")
        if not key:
            return {"success": False, "error": "IndexNow key is missing", "urls": urls}
        try:
            resp = requests.post(
                cls.ENDPOINT,
                json={"host": host, "key": key,
                      "keyLocation": f"{site_url}/{key}.txt",
                      "urlList": urls},
                headers={"Content-Type": "application/json; charset=utf-8"},
                timeout=8,
            )
            success = resp.status_code in (200, 202)
            if success:
                logger.warning(f"[SEO] IndexNow accepted {len(urls)} URL(s), status={resp.status_code}")
            else:
                logger.warning(f"[SEO] IndexNow failed {resp.status_code}: {resp.text[:200]}")
            return {
                "success": success,
                "status": resp.status_code,
                "response": resp.text[:200],
                "urls": urls,
            }
        except Exception as e:
            return {"success": False, "error": str(e), "urls": urls}


# ════════════════════════════════════════════════════════════
# MODULE 8 — SITEMAP PING
# ════════════════════════════════════════════════════════════

def ping_search_engines():
    base = SEO["SITE_URL"]
    sitemap = f"{base}/sitemap_index.xml"
    results = {}
    for engine, url in [
        ("google", f"https://www.google.com/ping?sitemap={requests.utils.quote(sitemap)}"),
        ("bing",   f"https://www.bing.com/ping?sitemap={requests.utils.quote(sitemap)}"),
    ]:
        try:
            r = requests.get(url, timeout=8)
            results[engine] = {"success": r.status_code < 400}
        except Exception as e:
            results[engine] = {"success": False, "error": str(e)}
    return results


# ════════════════════════════════════════════════════════════
# MODULE 9 — MASTER SUBMIT (yeh signal mein call hoga)
# ════════════════════════════════════════════════════════════

def submit_article_everywhere(article) -> dict:
    """
    Jab bhi article publish ho, yeh call karo.
    Google Indexing API + IndexNow + Sitemap ping.
    Cache bhi invalidate karta hai.
    """
    base = SEO["SITE_URL"]
    slug = article.slug

    google   = GoogleIndexingAPI.submit_article(article)
    indexnow = IndexNow.submit([article_url(article, base)])
    pings    = ping_search_engines()

    invalidate_seo_caches()

    logger.info(f"[SEO] Submitted '{slug}' | google={google} | indexnow={indexnow}")
    return {"google": google, "indexnow": indexnow, "pings": pings}
