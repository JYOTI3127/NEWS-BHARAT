from django.contrib.sitemaps import Sitemap
from .models import Article, Category
from .seo_direct import article_path, article_url

class ArticleSitemap(Sitemap):
    changefreq = "hourly"
    priority = 0.9

    def items(self):
        return Article.objects.filter(
            status="published",
            in_sitemap=True
        ).prefetch_related('categories')

    def lastmod(self, obj):
        return obj.published_at or obj.created_at

    def location(self, obj):
        return article_path(obj)

    def get_urls(self, page=1, site=None, protocol=None):
        urls = super().get_urls(page=page, site=site, protocol=protocol)
        for url_info in urls:
            obj = url_info.get('item')
            if not obj:
                continue

            # ── IMAGE ──
            img_src = None
            if obj.image:
                img_src = obj.image.url
            elif obj.image_url:
                img_src = obj.image_url

            if img_src:
                url_info['images'] = [{
                    'src': img_src,
                    'title': obj.title,
                    'caption': obj.meta_description or obj.title,
                }]

            # ── INTERNAL LINKS (related articles same category) ──
            cat_ids = obj.categories.values_list('id', flat=True)
            related = Article.objects.filter(
                status='published',
                in_sitemap=True,
                categories__in=cat_ids
            ).exclude(id=obj.id).distinct()[:3]

            url_info['alternates'] = [
                {'location': article_url(r, "https://news4bharat.com")}
                for r in related
            ]

        return urls


class CategorySitemap(Sitemap):
    changefreq = "daily"
    priority = 0.7

    def items(self):
        return Category.objects.filter(status='active')

    def location(self, obj):
        return f"/category/{obj.slug}/"


class StaticSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.5

    def items(self):
        return [
            '/',
            '/about/',
            '/contact/',
            '/privacy-policy/',
            '/terms-conditions/',
        ]

    def location(self, item):
        return item
