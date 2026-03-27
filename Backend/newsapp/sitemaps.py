from django.contrib.sitemaps import Sitemap
from .models import Article


class ArticleSitemap(Sitemap):
    changefreq = "hourly"
    priority = 0.9

    def items(self):
        return Article.objects.filter(status="published")

    def lastmod(self, obj):
        return obj.created_at   

    def location(self, obj):
        return f"/article/{obj.slug}/"