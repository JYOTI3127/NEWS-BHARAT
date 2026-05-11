"""
newsapp/seo_urls.py
Main urls.py mein add karo:
    path('', include('newsapp.seo_urls')),
"""

from django.urls import path, re_path
from newsapp import seo_views

urlpatterns = [
    path("News4Bharat/", seo_views.redirect_site_alias, name="site_alias_redirect"),
    path("news4bharat/", seo_views.redirect_site_alias, name="site_alias_redirect_lower"),
    re_path(r"^article/(?P<slug>[-\w]+)/?$", seo_views.redirect_legacy_article, name="legacy_article_redirect"),
    re_path(r"^news/(?P<slug>[-\w]+)/?$", seo_views.redirect_legacy_news_article, name="legacy_news_article_redirect"),

    # Static SEO files
    path("robots.txt",           seo_views.view_robots,           name="seo_robots"),
    path("manifest.webmanifest", seo_views.view_manifest,         name="seo_manifest"),
    path("indexnow-key.txt",     seo_views.view_indexnow_key,     name="seo_indexnow_key"),
    re_path(r"^(?P<key>[-\w]+)\.txt$", seo_views.view_indexnow_key, name="seo_indexnow_key_file"),

    # Sitemaps
    path("sitemap_index.xml",      seo_views.view_sitemap_index,      name="seo_sitemap_index"),
    path("sitemap-news.xml",       seo_views.view_sitemap_news,       name="seo_sitemap_news"),
    path("sitemap-articles.xml",   seo_views.view_sitemap_articles,   name="seo_sitemap_articles"),
    path("sitemap-images.xml",     seo_views.view_sitemap_images,     name="seo_sitemap_images"),
    path("sitemap-categories.xml", seo_views.view_sitemap_categories, name="seo_sitemap_categories"),
    path("sitemap-static.xml",     seo_views.view_sitemap_static,     name="seo_sitemap_static"),
    re_path(r"^sitemap-articles-(?P<page>\d+)\.xml$",
            seo_views.view_sitemap_articles_paged, name="seo_sitemap_articles_paged"),

    # Feeds
    path("rss.xml",                     seo_views.view_rss,          name="seo_rss"),
    path("rss/<slug:category_slug>.xml", seo_views.view_rss_category, name="seo_rss_category"),

    # JSON API
    path("api/seo/article/<slug:slug>/", seo_views.api_seo_article, name="api_seo_article"),
    path("api/seo/submit/",              seo_views.api_seo_submit,   name="api_seo_submit"),

    path("category/<slug:slug>/", seo_views.view_category_detail, name="category_detail_page"),
    path("<slug:category_slug>/<slug:slug>/", seo_views.view_article_detail, name="article_detail_page"),
]
