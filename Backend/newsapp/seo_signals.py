"""
newsapp/seo_signals.py
━━━━━━━━━━━━━━━━━━━━━
Tera existing Article.save() mein already status tracking hai.
Yeh signal uske BAAD fire hoga — koi change nahi tera existing code mein.

apps.py mein sirf yeh add karo:
    def ready(self):
        from . import seo_signals  # noqa
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def register():
    from newsapp.models import Article
    from newsapp.seo_direct import submit_article_everywhere

    @receiver(post_save, sender=Article)
    def on_article_publish(sender, instance, created, **kwargs):
        """
        Fires after every Article.save()
        Only submits when status = 'published' AND article has a slug.
        """
        if instance.status != "published":
            return
        if not instance.slug:
            return

        # Avoid re-submitting on tiny updates (view_count, etc.)
        # Only submit if this is a fresh publish or content change
        update_fields = kwargs.get("update_fields")
        if update_fields and set(update_fields) == {"view_count"}:
            return

        try:
            result = submit_article_everywhere(instance)
            logger.info(
                f"[SEO Signal] '{instance.slug}' submitted | "
                f"google={result.get('google')} | indexnow={result.get('indexnow')}"
            )
        except Exception as e:
            # NEVER crash the save — just log
            logger.error(f"[SEO Signal] Failed for '{instance.slug}': {e}")
