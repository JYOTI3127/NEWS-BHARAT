from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.utils import override_settings
from rest_framework.test import APIClient
from unittest.mock import patch

from .models import Article, PushSubscription
from .views import send_push_to_all


User = get_user_model()


class ArticleStatusFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='editor',
            password='testpass123',
        )
        self.client.force_authenticate(self.user)

    def test_published_article_put_with_draft_status_stays_published(self):
        article = Article.objects.create(
            author=self.user,
            title='Published story',
            content='Original published content',
            status='published',
        )
        original_published_at = article.published_at

        response = self.client.put(
            f'/api/articles/{article.pk}/',
            {
                'title': 'Published story updated',
                'subtitle': '',
                'content': 'Updated content after publish',
                'status': 'draft',
                'slug': article.slug,
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200, response.content)
        article.refresh_from_db()

        self.assertEqual(article.status, 'published')
        self.assertEqual(article.content, 'Updated content after publish')
        self.assertEqual(article.published_at, original_published_at)

    def test_new_article_can_still_be_saved_as_draft(self):
        response = self.client.post(
            '/api/articles/',
            {
                'title': 'Working draft',
                'subtitle': '',
                'content': 'Draft body',
                'status': 'draft',
                'slug': 'working-draft',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Article.objects.get(slug='working-draft').status, 'draft')


@override_settings(
    VAPID_PUBLIC_KEY='test-public-key',
    VAPID_PRIVATE_KEY='test-private-key',
    VAPID_CLAIMS={'sub': 'mailto:test@example.com'},
)
class PushSubscriptionCleanupTests(TestCase):
    @patch('newsapp.views.webpush')
    @patch('newsapp.views.WebPushException', Exception)
    def test_410_or_404_subscriptions_are_deleted_and_inactive_are_skipped(self, mock_webpush):
        active_ok = PushSubscription.objects.create(
            endpoint='https://example.com/push/ok',
            p256dh='key-ok',
            auth='auth-ok',
            is_active=True,
        )
        active_expired = PushSubscription.objects.create(
            endpoint='https://example.com/push/expired',
            p256dh='key-expired',
            auth='auth-expired',
            is_active=True,
        )
        inactive_sub = PushSubscription.objects.create(
            endpoint='https://example.com/push/inactive',
            p256dh='key-inactive',
            auth='auth-inactive',
            is_active=False,
        )

        mock_webpush.side_effect = [
            None,
            Exception('WebPushException: Push failed: 410 Gone'),
        ]

        report = send_push_to_all(
            title='Test',
            body='Body',
            url='/',
            return_report=True,
        )

        self.assertTrue(report['ok'])
        self.assertEqual(report['total'], 2)
        self.assertEqual(report['sent'], 1)
        self.assertEqual(report['failed'], 1)
        self.assertEqual(report['failed_ids'], [active_expired.id])
        self.assertEqual(mock_webpush.call_count, 2)
        self.assertTrue(PushSubscription.objects.filter(pk=active_ok.pk).exists())
        self.assertFalse(PushSubscription.objects.filter(pk=active_expired.pk).exists())
        self.assertTrue(PushSubscription.objects.filter(pk=inactive_sub.pk).exists())
