from django.contrib.auth import get_user_model
from django.core import mail
from django.core.exceptions import PermissionDenied
from django.test import TestCase
from django.test.utils import override_settings
from django.test.client import RequestFactory
from rest_framework.test import APIClient
from unittest.mock import patch

from .models import Article, Notification, Permission, PushSubscription, Role
from .views import custom_permission_denied_view, send_push_to_all


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

    def test_republish_from_draft_with_original_date_restores_old_timestamps(self):
        article = Article.objects.create(
            author=self.user,
            title='Republish story',
            content='Original body',
            status='published',
        )
        original_published_at = article.published_at
        original_updated_at = article.updated_at

        article.status = 'draft'
        article.save()
        article.refresh_from_db()
        self.assertGreater(article.updated_at, original_updated_at)

        response = self.client.put(
            f'/api/articles/{article.pk}/',
            {
                'title': 'Republish story',
                'subtitle': '',
                'content': 'Updated after draft',
                'status': 'published',
                'slug': article.slug,
                'publish_date_mode': 'original',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200, response.content)
        article.refresh_from_db()

        self.assertEqual(article.status, 'published')
        self.assertEqual(article.published_at, original_published_at)
        self.assertEqual(article.updated_at, original_updated_at)

    def test_published_article_keep_original_date_still_tracks_real_update_time(self):
        article = Article.objects.create(
            author=self.user,
            title='Live update story',
            content='Original body',
            status='published',
        )
        original_published_at = article.published_at
        original_updated_at = article.updated_at

        response = self.client.put(
            f'/api/articles/{article.pk}/',
            {
                'title': 'Live update story',
                'subtitle': '',
                'content': 'Edited while staying published',
                'status': 'published',
                'slug': article.slug,
                'publish_date_mode': 'original',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200, response.content)
        article.refresh_from_db()

        self.assertEqual(article.published_at, original_published_at)
        self.assertGreaterEqual(article.updated_at, original_updated_at)


class ArticleAdminPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.section_editor = User.objects.create_user(
            username='section-editor',
            password='testpass123',
            email='section@example.com',
        )
        self.author = User.objects.create_user(
            username='reporter',
            password='testpass123',
            email='reporter@example.com',
        )
        self.article = Article.objects.create(
            author=self.author,
            title='Admin access story',
            content='Body copy',
            status='review',
        )

        create_article = Permission.objects.create(
            code='create_article',
            description='Can create article',
        )
        edit_any_article = Permission.objects.create(
            code='edit_any_article',
            description='Can edit any article',
        )
        publish_article = Permission.objects.create(
            code='publish_article',
            description='Can publish article',
        )
        role = Role.objects.create(name='Section Editor')
        role.permissions.set([create_article, edit_any_article, publish_article])
        self.section_editor.profile.roles.add(role)

    def test_section_editor_can_open_article_admin_pages(self):
        self.client.force_login(self.section_editor)

        changelist = self.client.get('/admin/newsapp/article/')
        change_form = self.client.get(f'/admin/newsapp/article/{self.article.pk}/change/')

        self.assertEqual(changelist.status_code, 200, changelist.content)
        self.assertEqual(change_form.status_code, 200, change_form.content)

    def test_non_admin_cannot_publish_even_with_publish_permission(self):
        self.section_editor.profile.roles.clear()
        publish_article = Permission.objects.get(code='publish_article')
        self.section_editor.profile.extra_permissions.add(publish_article)
        self.client.force_authenticate(self.section_editor)

        response = self.client.post(f'/api/articles/{self.article.pk}/')

        self.assertEqual(response.status_code, 403, response.content)
        self.article.refresh_from_db()
        self.assertEqual(self.article.status, 'review')


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@example.com',
)
class ArticleWorkflowNotificationTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='writer',
            password='testpass123',
            email='writer@example.com',
            first_name='Writer',
        )
        self.super_admin = User.objects.create_user(
            username='superadmin',
            password='testpass123',
            email='admin@example.com',
            is_superuser=True,
            is_staff=True,
        )

    def test_review_submission_notifies_and_emails_super_admins(self):
        article = Article.objects.create(
            author=self.author,
            title='Review me',
            content='Body',
            status='draft',
        )
        mail.outbox = []

        article.status = 'review'
        article.save()

        self.assertTrue(
            Notification.objects.filter(
                user=self.super_admin,
                title='Article Sent For Review',
            ).exists()
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Article Submitted For Review', mail.outbox[0].subject)
        self.assertIn('Review me', mail.outbox[0].body)

    def test_admin_approval_notifies_and_emails_author(self):
        article = Article.objects.create(
            author=self.author,
            title='Approve me',
            content='Body',
            status='legal',
        )
        mail.outbox = []

        article.status = 'approved'
        article.save()

        self.assertTrue(
            Notification.objects.filter(
                user=self.author,
                title='Article Approved',
            ).exists()
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Article Approved', mail.outbox[0].subject)
        self.assertIn('Approve me', mail.outbox[0].body)


class AccessDeniedViewTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_admin_permission_denied_uses_custom_template(self):
        request = self.factory.get('/admin/newsapp/article/')
        response = custom_permission_denied_view(request, PermissionDenied())

        self.assertEqual(response.status_code, 403)
        self.assertIn(b'Access Not Available', response.content)
        self.assertIn(b'contact', response.content.lower())

    def test_api_permission_denied_returns_json(self):
        request = self.factory.get('/api/articles/')
        response = custom_permission_denied_view(request, PermissionDenied())

        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"error": "You do not have access to this page. Please contact admin regarding this access."}
        )


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
