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
from django.db import transaction
from django.db.models.signals import post_save
from django.db.models.signals import pre_save
from django.db.models.signals import m2m_changed
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def register():
    from newsapp.models import Article
    from newsapp.seo_direct import submit_article_everywhere
    from newsapp.frontend_build import trigger_frontend_build_on_commit

    @receiver(pre_save, sender=Article)
    def capture_previous_article_status(sender, instance, **kwargs):
        if not instance.pk:
            instance._previous_status = None
            return

        try:
            previous = sender.objects.only("status").get(pk=instance.pk)
            instance._previous_status = previous.status
        except sender.DoesNotExist:
            instance._previous_status = None

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

        def _submit_after_commit(article=instance):
            try:
                result = submit_article_everywhere(article)
                logger.warning(
                    f"[SEO Signal] '{article.slug}' submitted | "
                    f"google={result.get('google')} | indexnow={result.get('indexnow')}"
                )
            except Exception as e:
                logger.error(f"[SEO Signal] Failed for '{article.slug}': {e}")

        transaction.on_commit(_submit_after_commit)

        previous_status = getattr(instance, "_previous_status", None)
        if instance.status == "published" and previous_status != "published":
            build_reason = "article_published"
            force_build = True
        else:
            build_reason = "article_updated"
            force_build = False

        instance._build_previous_status = previous_status
        logger.info(
            "[SEO Signal] Frontend build scheduled. slug=%s previous_status=%s current_status=%s reason=%s force=%s",
            instance.slug,
            previous_status,
            instance.status,
            build_reason,
            force_build,
        )

        trigger_frontend_build_on_commit(
            reason=build_reason,
            article=instance,
            force=force_build,
        )

    @receiver(m2m_changed, sender=Article.categories.through)
    def on_published_article_categories_changed(sender, instance, action, **kwargs):
        if action not in {"post_add", "post_remove", "post_clear"}:
            return
        if instance.status != "published" or not instance.slug:
            return

        trigger_frontend_build_on_commit(
            reason="article_categories_updated",
            article=instance,
        )
