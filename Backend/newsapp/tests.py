from django.contrib.auth import get_user_model
from django.core import mail
from django.core.exceptions import PermissionDenied
from django.core.management import call_command
from django.test import TestCase
from django.test.utils import override_settings
from django.test.client import RequestFactory
from django.utils import timezone
from rest_framework.test import APIClient
import json
from io import StringIO
from unittest.mock import patch

from .admin import _build_editorial_calendar_events
from .models import Article, ArticleAssignment, ArticleVersion, Category, HomepageSlot, Notification, Permission, PushNotificationLog, PushSubscription, Role
from .seo_direct import SitemapEngine
from .utils import build_article_review_action_token, merge_soft_split_paragraphs, sanitize_article_html
from .views import _hero_slot_queryset, _latest_news_queryset, custom_permission_denied_view, send_push_to_all


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


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@example.com',
)
class ArticleReporterAssignmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.editor = User.objects.create_user(
            username='assigner',
            password='testpass123',
            email='assigner@example.com',
        )
        self.reporter_one = User.objects.create_user(
            username='reporter-one',
            password='testpass123',
            email='reporter1@example.com',
            first_name='Reporter',
            last_name='One',
            is_staff=True,
        )
        self.reporter_two = User.objects.create_user(
            username='reporter-two',
            password='testpass123',
            email='reporter2@example.com',
            first_name='Reporter',
            last_name='Two',
            is_staff=True,
        )
        self.client.force_authenticate(self.editor)

    def test_article_can_assign_multiple_reporters_with_message_and_individual_deadlines(self):
        mail.outbox = []

        response = self.client.post(
            '/api/articles/',
            {
                'title': 'Assignment story',
                'subtitle': '',
                'content': 'Assignment body',
                'status': 'draft',
                'slug': 'assignment-story',
                'assignment_message': 'Please cover from your assigned beat.',
                'reporter_assignments': json.dumps([
                    {
                        'user_id': self.reporter_one.id,
                        'deadline': '2026-05-20T10:30',
                        'assignment_message': 'Politics angle focus karo.',
                    },
                    {
                        'user_id': self.reporter_two.id,
                        'deadline': '2026-05-21T12:45',
                        'assignment_message': 'Business impact bhi include karo.',
                    },
                ]),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 201, response.content)
        article = Article.objects.get(slug='assignment-story')
        assignments = ArticleAssignment.objects.filter(article=article, role_type='reporter').order_by('user_id')

        self.assertEqual(assignments.count(), 2)
        self.assertEqual(article.assigned_to_id, self.reporter_one.id)
        self.assertEqual(
            assignments.first().assignment_message,
            'Politics angle focus karo.',
        )
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn('Assignment note:', mail.outbox[0].body)
        self.assertIn('Business impact bhi include karo.', mail.outbox[0].body)
        self.assertNotIn('Assignment summary:', mail.outbox[0].body)
        self.assertTrue(
            Notification.objects.filter(
                user=self.reporter_two,
                title='New Assignment',
            ).exists()
        )


class HomepageFreshPublishOrderingTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='homepage-author',
            password='testpass123',
        )

    def test_hero_and_latest_auto_mode_prioritize_publish_time_not_recent_update(self):
        older_but_updated = Article.objects.create(
            author=self.author,
            title='Older published article',
            content='Older body',
            status='published',
        )
        recent_article = Article.objects.create(
            author=self.author,
            title='Recently published article',
            content='Recent body',
            status='published',
        )

        old_publish_time = timezone.now() - timezone.timedelta(days=20)
        recent_publish_time = timezone.now() - timezone.timedelta(hours=2)
        Article.objects.filter(pk=older_but_updated.pk).update(
            published_at=old_publish_time,
            updated_at=timezone.now(),
        )
        Article.objects.filter(pk=recent_article.pk).update(
            published_at=recent_publish_time,
            updated_at=timezone.now() - timezone.timedelta(days=1),
        )
        older_but_updated.refresh_from_db()
        recent_article.refresh_from_db()

        hero_slot = HomepageSlot.objects.create(slot_name='hero', mode='auto', display_count=5)
        latest_slot = HomepageSlot.objects.create(slot_name='latest_news', mode='auto', display_count=5)

        self.assertEqual(_hero_slot_queryset(hero_slot).first().pk, recent_article.pk)
        self.assertEqual(_latest_news_queryset(latest_slot).first().pk, recent_article.pk)

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
            subtitle='A useful subtitle',
            content='<p>First para for preview.</p><p>Second para for preview.</p>',
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
        self.assertIn('A useful subtitle', mail.outbox[0].body)
        self.assertIn('First para for preview.', mail.outbox[0].body)
        self.assertIn(f'/admin/newsapp/article/{article.pk}/change/?focus=editorial-comments#editorial-comments', mail.outbox[0].body)
        self.assertIn(f'/api/articles/{article.pk}/review-action/approve/', mail.outbox[0].body)
        self.assertTrue(mail.outbox[0].alternatives)
        html_body = mail.outbox[0].alternatives[0][0]
        self.assertIn('<p', html_body)
        self.assertIn('First para for preview.', html_body)

    def test_review_submission_email_includes_full_rendered_content_preview(self):
        article = Article.objects.create(
            author=self.author,
            title='Rendered preview',
            subtitle='Rendered subtitle',
            content='<h2>Brief</h2><p>Opening paragraph.</p><ul><li>Point one</li><li>Point two</li></ul><blockquote>Quoted line</blockquote>',
            status='draft',
        )
        mail.outbox = []

        article.status = 'review'
        article.save()

        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(mail.outbox[0].alternatives)
        html_body = mail.outbox[0].alternatives[0][0]
        self.assertIn('Brief', html_body)
        self.assertIn('Opening paragraph.', html_body)
        self.assertIn('Point one', html_body)
        self.assertIn('Quoted line', html_body)
        self.assertIn('<h2', html_body)
        self.assertIn('<ul', html_body)
        self.assertIn('<blockquote', html_body)

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


class ArticlePublishPushTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='publisher',
            password='testpass123',
        )

    @patch('newsapp.views.send_push_to_all')
    def test_new_published_article_with_preset_published_at_still_triggers_push(self, mock_send_push):
        preset_time = timezone.now()
        with self.captureOnCommitCallbacks(execute=True):
            Article.objects.create(
                author=self.author,
                title='Fresh publish',
                content='Body',
                status='published',
                published_at=preset_time,
            )

        mock_send_push.assert_called_once()
        payload = mock_send_push.call_args.kwargs
        self.assertEqual(payload['title'], 'Fresh publish')
        self.assertIn('https://news4bharat.com/', payload['url'])

    @patch('newsapp.views.send_push_to_all')
    def test_status_transition_to_published_with_preset_published_at_still_triggers_push(self, mock_send_push):
        article = Article.objects.create(
            author=self.author,
            title='Transition publish',
            content='Body',
            status='draft',
        )
        article.status = 'published'
        article.published_at = timezone.now()

        with self.captureOnCommitCallbacks(execute=True):
            article.save()

        mock_send_push.assert_called_once()
        payload = mock_send_push.call_args.kwargs
        self.assertEqual(payload['title'], 'Transition publish')
        self.assertIn('https://news4bharat.com/', payload['url'])


class ArticleReviewEmailActionTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='writer',
            password='testpass123',
            email='writer@example.com',
        )
        self.super_admin = User.objects.create_user(
            username='reviewboss',
            password='testpass123',
            email='boss@example.com',
            is_superuser=True,
            is_staff=True,
        )
        self.article = Article.objects.create(
            author=self.author,
            title='Email approval story',
            content='Body',
            status='review',
        )

    def test_review_email_action_redirects_anonymous_user_to_admin_login(self):
        token = build_article_review_action_token(self.article.pk, 'approve')
        response = self.client.get(
            f'/api/articles/{self.article.pk}/review-action/approve/?token={token}'
        )

        self.assertEqual(response.status_code, 302)
        self.assertIn('/admin/login/', response['Location'])

    def test_review_email_action_approves_article_for_super_admin(self):
        token = build_article_review_action_token(self.article.pk, 'approve')
        self.client.force_login(self.super_admin)

        response = self.client.get(
            f'/api/articles/{self.article.pk}/review-action/approve/?token={token}'
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], f'/admin/newsapp/article/{self.article.pk}/change/')
        self.article.refresh_from_db()
        self.assertEqual(self.article.status, 'approved')


class ArticleVersioningTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='versioner',
            password='testpass123',
        )

    def test_whitespace_only_content_change_does_not_create_version(self):
        article = Article.objects.create(
            author=self.author,
            title='Version story',
            subtitle='Short deck',
            content='<p>Hello world</p>',
            status='draft',
        )

        article.content = '<p>Hello world</p>   \n'
        article.save()

        self.assertEqual(article.versions.count(), 0)

    def test_initial_publish_creates_v1_snapshot(self):
        article = Article.objects.create(
            author=self.author,
            title='Original title',
            subtitle='Deck',
            content='<p>Original body</p>',
            status='review',
        )

        article.status = 'published'
        article.save()

        versions = list(article.versions.order_by('version_number').values_list('version_number', 'title', 'content'))
        self.assertEqual(versions, [(1, 'Original title', '<p>Original body</p>')])

    def test_first_published_edit_reuses_initial_snapshot_without_duplicate(self):
        article = Article.objects.create(
            author=self.author,
            title='Original title',
            subtitle='Deck',
            content='<p>Original body</p>',
            status='published',
        )

        self.assertEqual(article.versions.count(), 1)
        article.title = 'Updated title'
        article.content = '<p>Updated body</p>'
        article.save()
        self.assertEqual(article.versions.count(), 1)

        version = article.versions.get(version_number=1)
        self.assertEqual(version.title, 'Original title')
        self.assertEqual(version.content, '<p>Original body</p>')

    def test_second_published_edit_creates_next_version_from_previous_published_state(self):
        article = Article.objects.create(
            author=self.author,
            title='Original title',
            subtitle='Deck',
            content='<p>Original body</p>',
            status='published',
        )

        article.title = 'Updated title'
        article.content = '<p>Updated body</p>'
        article.save()

        article.refresh_from_db()
        article.title = 'Original title'
        article.content = '<p>Original body</p>'
        article.save()
        self.assertEqual(article.versions.count(), 2)

        versions = list(article.versions.order_by('-version_number').values_list('version_number', 'title'))
        self.assertEqual(versions, [(2, 'Updated title'), (1, 'Original title')])

    def test_pre_publish_edits_do_not_create_versions(self):
        article = Article.objects.create(
            author=self.author,
            title='Swiggy draft',
            subtitle='Deck',
            content='<p>Draft body</p>',
            status='review',
        )

        article.content = '<p>Draft body updated once</p>'
        article.save()
        article.refresh_from_db()
        article.content = '<p>Draft body updated twice</p>'
        article.save()

        self.assertEqual(article.versions.count(), 0)

        article.status = 'published'
        article.save()
        self.assertEqual(article.versions.count(), 1)

    def test_cleanup_article_versions_command_removes_consecutive_duplicates_and_renumbers(self):
        article = Article.objects.create(
            author=self.author,
            title='Cleanup story',
            subtitle='Deck',
            content='<p>Current</p>',
            status='draft',
        )

        ArticleVersion.objects.bulk_create([
            ArticleVersion(article=article, version_number=1, title='A', subtitle='Deck', content='<p>One</p>', edited_by=self.author),
            ArticleVersion(article=article, version_number=2, title='A', subtitle='Deck', content='<p>One</p>  ', edited_by=self.author),
            ArticleVersion(article=article, version_number=3, title='B', subtitle='Deck', content='<p>Two</p>', edited_by=self.author),
            ArticleVersion(article=article, version_number=4, title='B', subtitle='Deck', content='<p>Two</p>', edited_by=self.author),
            ArticleVersion(article=article, version_number=5, title='A', subtitle='Deck', content='<p>One</p>', edited_by=self.author),
        ])

        out = StringIO()
        call_command('cleanup_article_versions', article_id=article.id, stdout=out)

        versions = list(
            ArticleVersion.objects.filter(article=article)
            .order_by('version_number')
            .values_list('version_number', 'title', 'content')
        )
        self.assertEqual(
            versions,
            [
                (1, 'A', '<p>One</p>'),
                (2, 'B', '<p>Two</p>'),
                (3, 'A', '<p>One</p>'),
            ],
        )
        self.assertIn('Deleted 2 duplicate row(s)', out.getvalue())

    def test_cleanup_article_versions_command_removes_prepublish_versions_only_when_flag_is_set(self):
        review_article = Article.objects.create(
            author=self.author,
            title='Review article',
            subtitle='Deck',
            content='<p>Review</p>',
            status='review',
        )
        published_article = Article.objects.create(
            author=self.author,
            title='Published article',
            subtitle='Deck',
            content='<p>Published</p>',
            status='published',
        )

        ArticleVersion.objects.bulk_create([
            ArticleVersion(article=review_article, version_number=1, title='Review v1', subtitle='Deck', content='<p>Review one</p>', edited_by=self.author),
            ArticleVersion(article=review_article, version_number=2, title='Review v2', subtitle='Deck', content='<p>Review two</p>', edited_by=self.author),
            ArticleVersion(article=published_article, version_number=1, title='Published v1', subtitle='Deck', content='<p>Published one</p>', edited_by=self.author),
        ])

        out = StringIO()
        call_command('cleanup_article_versions', remove_prepublish=True, stdout=out)

        self.assertEqual(ArticleVersion.objects.filter(article=review_article).count(), 0)
        self.assertEqual(ArticleVersion.objects.filter(article=published_article).count(), 1)
        self.assertIn('Deleted 2 pre-publish row(s)', out.getvalue())


class ArticleContentCleaningTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='cleaner',
            password='testpass123',
        )

    def test_article_save_strips_chatgpt_wrapper_html(self):
        article = Article.objects.create(
            author=self.author,
            title='Cleaner story',
            content_raw='<section class="text-token x" data-start="1" data-end="2"><p>Hello</p></section>',
            content='<section class="text-token x" data-start="1" data-end="2"><p>Hello</p></section>',
            status='draft',
        )

        self.assertNotIn('text-token', article.content)
        self.assertNotIn('data-start', article.content)
        self.assertEqual(article.content.strip(), '<p>Hello</p>')
        self.assertEqual(article.content_clean.strip(), '<p>Hello</p>')

    def test_fix_chatgpt_article_html_command_updates_existing_articles(self):
        article = Article.objects.create(
            author=self.author,
            title='Legacy dirty story',
            content_raw='<p>Clean start</p>',
            content='<p>Clean start</p>',
            status='draft',
        )
        Article.objects.filter(pk=article.pk).update(
            content_raw='<section class="text-token abc" data-start="10" data-end="20"><p>Legacy dirty</p></section>',
            content_clean='',
            content='<section class="text-token abc" data-start="10" data-end="20"><p>Legacy dirty</p></section>',
            clean_version=0,
        )

        out = StringIO()
        call_command('fix_chatgpt_article_html', article_id=article.id, stdout=out)

        article.refresh_from_db()
        self.assertEqual(article.content, '<p>Legacy dirty</p>')
        self.assertEqual(article.content_clean, '<p>Legacy dirty</p>')
        self.assertNotIn('text-token', article.content_raw)
        self.assertNotIn('data-start', article.content_raw)
        self.assertIn('Updated 1 article(s).', out.getvalue())

    def test_sanitize_article_html_wraps_unstructured_text_in_paragraphs(self):
        cleaned = sanitize_article_html(
            "This is sentence one.\n\n"
            "Also Read: <a href=\"https://news4bharat.com/story\">Story</a>\n\n"
            "This is sentence three."
        )

        self.assertIn('<p>This is sentence one.</p>', cleaned)
        self.assertIn('<p><strong>Also Read:</strong> <a href="https://news4bharat.com/story">Story</a></p>', cleaned)
        self.assertIn('<p>This is sentence three.</p>', cleaned)

    def test_sanitize_article_html_preserves_existing_block_html(self):
        cleaned = sanitize_article_html('<h2>Brief</h2><p>Already formatted.</p><ul><li>Point one</li></ul>')

        self.assertEqual(cleaned, '<h2>Brief</h2><p>Already formatted.</p><ul><li>Point one</li></ul>')

    def test_sanitize_article_html_unwraps_nested_paragraphs_inside_headings(self):
        cleaned = sanitize_article_html(
            '<h2><p>Why “Cockroach Janta Party” Is Taking Over India’s Internet</p><p></p></h2>'
            '<p>Body paragraph.</p>'
        )

        self.assertEqual(
            cleaned,
            '<h2>Why “Cockroach Janta Party” Is Taking Over India’s Internet</h2><p>Body paragraph.</p>',
        )

    def test_article_save_normalizes_invalid_heading_structure_in_all_content_fields(self):
        article = Article.objects.create(
            author=self.author,
            title='Heading cleanup story',
            content_raw='<h3><p>Broken subhead</p></h3><p>Body</p>',
            content_clean='<h3><p>Broken subhead</p></h3><p>Body</p>',
            content='<h3><p>Broken subhead</p></h3><p>Body</p>',
            status='draft',
        )

        self.assertEqual(article.content_raw, '<h3>Broken subhead</h3><p>Body</p>')
        self.assertEqual(article.content_clean, '<h3>Broken subhead</h3><p>Body</p>')
        self.assertEqual(article.content, '<h3>Broken subhead</h3><p>Body</p>')

    def test_sanitize_article_html_normalizes_basic_inline_formatting(self):
        cleaned = sanitize_article_html('<p><b>Bold</b> and <i>italic</i> under <h3>Subhead</h3></p>')

        self.assertIn('<strong>Bold</strong>', cleaned)
        self.assertIn('<em>italic</em>', cleaned)
        self.assertIn('<h3>Subhead</h3>', cleaned)

    def test_sanitize_article_html_keeps_single_newlines_inside_paragraph(self):
        cleaned = sanitize_article_html(
            "When you spend time on both sides of the table.\n"
            "And that gap is not about creativity.\n"
            "It is about how differently each side defines success.\n\n"
            "Next paragraph starts here."
        )

        self.assertIn(
            '<p>When you spend time on both sides of the table. '
            'And that gap is not about creativity. '
            'It is about how differently each side defines success.</p>',
            cleaned,
        )
        self.assertIn('<p>Next paragraph starts here.</p>', cleaned)

    def test_sanitize_article_html_unwraps_google_docs_spans_only(self):
        cleaned = sanitize_article_html(
            '<p><span id="docs-internal-guid-abc" style="caret-color: rgb(0, 0, 0);">'
            '<span style="font-variant-alternates: normal;">Broken</span> '
            '<span style="font-variant-alternates: normal;">text</span>'
            '<span dir="ltr">plain wrapper</span>'
            '<b></b><strong>Bold stays</strong></span>'
            '<span style="color: #123456;">Color stays</span></p>'
        )

        self.assertEqual(
            cleaned,
            '<p>Broken textplain wrapper<strong>Bold stays</strong>'
            '<span style="color: #123456;">Color stays</span></p>',
        )
        self.assertNotIn('font-variant', cleaned)
        self.assertNotIn('docs-internal-guid', cleaned)

    def test_merge_soft_split_paragraphs_keeps_question_separate(self):
        cleaned = merge_soft_split_paragraphs(
            '<p>You have worked across major organisations?</p>'
            '<p>When you spend time on both sides of the table, you see a gap.</p>'
            '<p>And that gap is not about creativity or strategy.</p>'
            '<p>It is about how differently each side defines success.</p>'
            '<blockquote>Quote stays separate.</blockquote>'
        )

        self.assertIn('<p>You have worked across major organisations?</p>', cleaned)
        self.assertIn(
            '<p>When you spend time on both sides of the table, you see a gap. '
            'And that gap is not about creativity or strategy. '
            'It is about how differently each side defines success.</p>',
            cleaned,
        )
        self.assertIn('<blockquote>Quote stays separate.</blockquote>', cleaned)


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
    def test_410_or_404_subscriptions_are_marked_inactive_and_logged(self, mock_webpush):
        active_ok = PushSubscription.objects.create(
            endpoint='https://example.com/push/ok',
            p256dh='key-ok',
            auth='auth-ok',
            is_active=True,
            subscriber_name='Active Ok',
            subscriber_email='ok@example.com',
        )
        active_expired = PushSubscription.objects.create(
            endpoint='https://example.com/push/expired',
            p256dh='key-expired',
            auth='auth-expired',
            is_active=True,
            subscriber_name='Active Expired',
            subscriber_email='expired@example.com',
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
        self.assertEqual(report['sent_ids'], [active_ok.id])
        self.assertEqual(mock_webpush.call_count, 2)
        active_ok.refresh_from_db()
        active_expired.refresh_from_db()
        self.assertEqual(active_ok.sent_count, 1)
        self.assertEqual(active_ok.failed_count, 0)
        self.assertEqual(active_ok.last_status, PushNotificationLog.STATUS_SENT)
        self.assertTrue(active_expired.pk)
        self.assertFalse(active_expired.is_active)
        self.assertEqual(active_expired.failed_count, 1)
        self.assertEqual(active_expired.last_status, PushNotificationLog.STATUS_FAILED)
        self.assertTrue(PushSubscription.objects.filter(pk=inactive_sub.pk).exists())
        self.assertEqual(PushNotificationLog.objects.filter(subscription=active_ok, status='sent').count(), 1)
        self.assertEqual(PushNotificationLog.objects.filter(subscription=active_expired, status='failed').count(), 1)


class EditorialCalendarSeedTests(TestCase):
    def test_editorial_calendar_includes_festivals_national_and_global_days(self):
        events = _build_editorial_calendar_events(2026)
        titles = {item['title'] for item in events}
        categories = {item['category'] for item in events}

        self.assertGreaterEqual(len(events), 80)
        self.assertIn('festival', categories)
        self.assertIn('national', categories)
        self.assertIn('important_day', categories)
        self.assertIn("Republic Day", titles)
        self.assertIn("Independence Day", titles)
        self.assertIn("International Women's Day", titles)
        self.assertIn("World Environment Day", titles)
        self.assertIn("Christmas Day", titles)


class SlugPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.slug_editor = User.objects.create_user(
            username='sheenu',
            email='sheenaas013@gmail.com',
            password='testpass123',
            is_staff=True,
            is_superuser=True,
        )
        self.other_staff = User.objects.create_user(
            username='staffer',
            email='staffer@example.com',
            password='testpass123',
            is_staff=True,
        )

    def test_non_slug_editor_cannot_change_category_slug(self):
        category = Category.objects.create(name='Business', slug='business')
        self.client.force_authenticate(self.other_staff)

        response = self.client.put(
            f'/api/categories/{category.pk}/update/',
            {
                'name': 'Business',
                'slug': 'markets',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 403, response.content)
        category.refresh_from_db()
        self.assertEqual(category.slug, 'business')

    def test_slug_editor_can_change_category_slug(self):
        category = Category.objects.create(name='Business', slug='business')
        self.client.force_authenticate(self.slug_editor)

        response = self.client.put(
            f'/api/categories/{category.pk}/update/',
            {
                'name': 'Business',
                'slug': 'bharat-business',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        category.refresh_from_db()
        self.assertEqual(category.slug, 'bharat-business')


@override_settings(SEO_SITE_URL='https://news4bharat.com')
class SeoPageRenderTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='seo-editor',
            password='testpass123',
        )
        self.category = Category.objects.create(
            name='Politics',
            slug='politics',
            description='Daily politics coverage.',
            meta_title='Politics News Today',
            meta_description='Latest politics coverage and analysis from News4Bharat.',
        )
        self.article = Article.objects.create(
            author=self.user,
            title='Cabinet meeting updates',
            content='Important updates from the latest cabinet meeting.',
            status='published',
            slug='cabinet-meeting-updates',
            meta_title='Cabinet Meeting Updates',
            meta_description='Breaking cabinet meeting updates from the capital.',
            primary_category=self.category,
        )
        self.article.categories.add(self.category)

    def test_article_page_renders_canonical_tag(self):
        response = self.client.get('/politics/cabinet-meeting-updates/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            '<link rel="canonical" href="https://news4bharat.com/politics/cabinet-meeting-updates/">',
            html=False,
        )

    def test_category_page_renders_saved_meta_and_canonical(self):
        response = self.client.get('/category/politics/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '<title>Politics News Today</title>', html=False)
        self.assertContains(
            response,
            '<meta name="description" content="Latest politics coverage and analysis from News4Bharat.">',
            html=False,
        )
        self.assertContains(
            response,
            '<link rel="canonical" href="https://news4bharat.com/category/politics/">',
            html=False,
        )


@override_settings(SEO_SITE_URL='https://news4bharat.com')
class StaticSitemapTests(TestCase):
    def test_static_sitemap_uses_trailing_slash_urls(self):
        sitemap_xml = SitemapEngine.static_pages()

        self.assertIn('https://news4bharat.com/contact-us/', sitemap_xml)
        self.assertIn('https://news4bharat.com/terms-and-conditions/', sitemap_xml)
        self.assertIn('https://news4bharat.com/disclaimer/', sitemap_xml)
        self.assertIn('https://news4bharat.com/editorial-policy/', sitemap_xml)
        self.assertIn('https://news4bharat.com/founders-note/', sitemap_xml)
        self.assertIn('https://news4bharat.com/careers/', sitemap_xml)
        self.assertNotIn('https://news4bharat.com/contact-us</loc>', sitemap_xml)
        self.assertNotIn('https://news4bharat.com/terms-and-conditions</loc>', sitemap_xml)

    def test_non_superadmin_cannot_change_article_slug(self):
        article = Article.objects.create(
            author=self.other_staff,
            title='Slug Story',
            content='Body copy',
            status='draft',
            slug='slug-story',
        )
        self.client.force_authenticate(self.other_staff)

        response = self.client.put(
            f'/api/articles/{article.pk}/',
            {
                'title': 'Slug Story',
                'subtitle': '',
                'content': 'Body copy updated',
                'status': 'draft',
                'slug': 'changed-slug',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 400, response.content)
        article.refresh_from_db()
        self.assertEqual(article.slug, 'slug-story')

    def test_superadmin_can_change_article_slug(self):
        article = Article.objects.create(
            author=self.slug_editor,
            title='Slug Story Admin',
            content='Body copy',
            status='draft',
            slug='slug-story-admin',
        )
        self.client.force_authenticate(self.slug_editor)

        response = self.client.put(
            f'/api/articles/{article.pk}/',
            {
                'title': 'Slug Story Admin',
                'subtitle': '',
                'content': 'Body copy updated',
                'status': 'draft',
                'slug': 'updated-admin-slug',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200, response.content)
        article.refresh_from_db()
        self.assertEqual(article.slug, 'updated-admin-slug')
