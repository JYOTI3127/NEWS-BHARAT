"""
newsapp/seo_views.py
━━━━━━━━━━━━━━━━━━━
Tere existing views.py mein already bahut kuch hai.
Yeh file SIRF SEO routes handle karti hai — alag rakhne se clean rehta hai.

urls.py mein mount karo:
    from . import seo_views
    path('', include('newsapp.seo_urls')),
"""

import json
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.shortcuts import get_object_or_404
from django.core.cache import cache

from newsapp.seo_direct import (
    SEO,
    robots_txt,
    SitemapEngine,
    SchemaEngine,
    MetaEngine,
    generate_rss,
    GoogleIndexingAPI,
    IndexNow,
    ping_search_engines,
    submit_article_everywhere,
)


def xml_resp(content: str) -> HttpResponse:
    return HttpResponse(content, content_type="application/xml; charset=utf-8")


# ─────────────────────────────────────────────
# Static SEO files
# ─────────────────────────────────────────────

@require_GET
def view_robots(request):
    return HttpResponse(robots_txt(), content_type="text/plain")


@require_GET
def view_indexnow_key(request):
    return HttpResponse(SEO["INDEXNOW_KEY"], content_type="text/plain")


@require_GET
def view_manifest(request):
    name = SEO["SITE_NAME"]
    base = SEO["SITE_URL"]
    return JsonResponse({
        "name": name, "short_name": "N4B",
        "description": "Breaking India & World News",
        "start_url": "/", "display": "standalone",
        "theme_color": "#e63946", "background_color": "#ffffff",
        "icons": [
            {"src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
            {"src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
        ],
    })


# ─────────────────────────────────────────────
# Sitemaps
# ─────────────────────────────────────────────

@require_GET
def view_sitemap_index(request):
    return xml_resp(SitemapEngine.index())


@require_GET
def view_sitemap_news(request):
    return xml_resp(SitemapEngine.news())


@require_GET
def view_sitemap_articles(request):
    page = int(request.GET.get("page", 1))
    return xml_resp(SitemapEngine.articles(page))


@require_GET
def view_sitemap_articles_paged(request, page):
    return xml_resp(SitemapEngine.articles(int(page)))


@require_GET
def view_sitemap_categories(request):
    return xml_resp(SitemapEngine.categories())


@require_GET
def view_sitemap_static(request):
    return xml_resp(SitemapEngine.static_pages())


# ─────────────────────────────────────────────
# RSS Feed
# ─────────────────────────────────────────────

@require_GET
def view_rss(request):
    cat = request.GET.get("category")
    return HttpResponse(generate_rss(cat), content_type="application/rss+xml; charset=utf-8")


@require_GET
def view_rss_category(request, category_slug):
    return HttpResponse(generate_rss(category_slug), content_type="application/rss+xml; charset=utf-8")


# ─────────────────────────────────────────────
# SEO API — Frontend/SSR ke liye
# ─────────────────────────────────────────────

@require_GET
def api_seo_article(request, slug):
    """
    GET /api/seo/article/<slug>/
    Returns: meta dict + schema list + ready-to-inject head HTML.
    
    Template mein:
        context['seo_head'] = response['head_html']
        {{ seo_head|safe }}
    """
    from newsapp.models import Article
    try:
        article = (
            Article.objects
            .select_related("author")
            .prefetch_related("categories")
            .get(slug=slug, status="published")
        )
    except Article.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    meta    = MetaEngine.for_article(article)
    schemas = [
        SchemaEngine.news_article(article),
        SchemaEngine.breadcrumb(article),
        SchemaEngine.organization(),
        SchemaEngine.website(),
    ]
    head_html = MetaEngine.render_head(meta, schemas)

    return JsonResponse({
        "meta":      meta,
        "schemas":   schemas,
        "head_html": head_html,
    }, json_dumps_params={"ensure_ascii": False})


@require_POST
def api_seo_submit(request):
    """
    POST /api/seo/submit/
    Body: {"slug": "article-slug"} ya {"urls": ["https://..."]}
    Manual submission to Google + Bing.
    """
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    slug = body.get("slug")
    urls = body.get("urls", [])

    if slug:
        from newsapp.models import Article
        try:
            article = Article.objects.get(slug=slug, status="published")
            result  = submit_article_everywhere(article)
            return JsonResponse(result)
        except Article.DoesNotExist:
            return JsonResponse({"error": "Article not found"}, status=404)

    if urls:
        google   = [GoogleIndexingAPI.submit(u) for u in urls]
        indexnow = IndexNow.submit(urls)
        pings    = ping_search_engines()
        return JsonResponse({"google": google, "indexnow": indexnow, "pings": pings})

    return JsonResponse({"error": "Provide slug or urls"}, status=400)
