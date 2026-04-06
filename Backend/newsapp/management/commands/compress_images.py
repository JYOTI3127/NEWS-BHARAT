from django.core.management.base import BaseCommand
from newsapp.models import Article
from PIL import Image as PILImage
import io
import requests
from django.core.files.base import ContentFile


class Command(BaseCommand):
    help = 'Compress all existing article images to WebP'

    def handle(self, *args, **kwargs):
        articles = Article.objects.exclude(image_url__isnull=True).exclude(image_url__exact='')
        total = articles.count()
        self.stdout.write(f"Total articles with image_url: {total}")

        success = 0
        failed = 0

        for i, article in enumerate(articles, 1):
            try:
                img_url = article.image_url
                if not img_url or not img_url.startswith('http'):
                    continue

                response = requests.get(img_url, timeout=10)
                if response.status_code != 200:
                    self.stdout.write(f"[{i}/{total}] SKIP: {article.slug}")
                    failed += 1
                    continue

                img = PILImage.open(io.BytesIO(response.content))
                if img.mode in ("RGBA", "P", "LA"):
                    img = img.convert("RGB")
                if img.width > 1200:
                    ratio = 1200 / img.width
                    img = img.resize((1200, int(img.height * ratio)), PILImage.LANCZOS)

                output = io.BytesIO()
                img.save(output, format='WEBP', quality=75, optimize=True)
                output.seek(0)

                filename = f"articles/{article.slug}.webp"
                article.image = ContentFile(output.read(), name=filename)
                article.save(update_fields=['image'])

                self.stdout.write(f"[{i}/{total}] ✅ Done: {article.slug}")
                success += 1

            except Exception as e:
                self.stdout.write(f"[{i}/{total}] ❌ Failed: {article.slug} — {e}")
                failed += 1

        self.stdout.write(f"\n✅ Success: {success} | ❌ Failed: {failed}")