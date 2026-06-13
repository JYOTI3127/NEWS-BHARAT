from django.core.management.base import BaseCommand
from newsapp.models import Article
from newsapp.views import _unique_article_image_name
from PIL import Image as PILImage
import io
import requests
from django.core.files.base import ContentFile
from django.db.models import Q


class Command(BaseCommand):
    help = 'Compress all existing article images to WebP'

    def handle(self, *args, **kwargs):
        # Dono — image_url wale AND uploaded image wale
        articles = Article.objects.filter(
            Q(image_url__isnull=False) & ~Q(image_url__exact='') |
            Q(image__isnull=False) & ~Q(image__exact='')
        )
        total = articles.count()
        self.stdout.write(f"Total articles found: {total}")

        success = 0
        failed = 0

        for i, article in enumerate(articles, 1):
            try:
                old_created_at = article.created_at
                old_published_at = article.published_at
                old_updated_at = article.updated_at
                img_data = None

                # Pehle uploaded image check karo
                if article.image and not str(article.image.name).endswith('.webp'):
                    try:
                        img_data = article.image.read()
                    except Exception:
                        img_data = None

                # Agar uploaded image nahi toh image_url se download karo
                if not img_data and article.image_url and article.image_url.startswith('http'):
                    response = requests.get(article.image_url, timeout=10)
                    if response.status_code == 200:
                        img_data = response.content

                if not img_data:
                    self.stdout.write(f"[{i}/{total}] SKIP (no image): {article.slug}")
                    continue

                img = PILImage.open(io.BytesIO(img_data))
                if img.mode in ("RGBA", "P", "LA"):
                    img = img.convert("RGB")
                if img.width > 1200:
                    ratio = 1200 / img.width
                    img = img.resize((1200, int(img.height * ratio)), PILImage.LANCZOS)

                output = io.BytesIO()
                img.save(output, format='WEBP', quality=88, optimize=True)
                output.seek(0)

                filename = _unique_article_image_name(article, article.slug or article.title, ".webp")
                article.image = ContentFile(output.read(), name=filename)
                article.image_url = ''  # url clear karo
                article.save(update_fields=['image', 'image_url'])
                Article.objects.filter(pk=article.pk).update(
                    created_at=old_created_at,
                    published_at=old_published_at,
                    updated_at=old_updated_at,
                )

                self.stdout.write(f"[{i}/{total}] DONE: {article.slug}")
                success += 1

            except Exception as e:
                self.stdout.write(f"[{i}/{total}] FAILED: {article.slug} - {e}")
                failed += 1

        self.stdout.write(f"\nSuccess: {success} | Failed: {failed}")
