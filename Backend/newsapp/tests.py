from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.core.management import call_command
from django.test import Client, TestCase
from django.test.utils import override_settings
from django.test.client import RequestFactory
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
import json
from datetime import date, datetime, timedelta
from io import StringIO
from unittest.mock import patch
from urllib.parse import urlparse

from .admin import (
    ArticleAdmin,
    ArticleAssignmentAdmin,
    _build_editorial_calendar_events,
    _sync_guest_profile_state_for_profile,
    admin_site,
)
from .attendance import clock_in_attendance
from .attendance_reminders import process_attendance_reminders
from .models import (
    Article,
    ArticleAssignment,
    ArticleVersion,
    AttendanceRecord,
    Category,
    HomepageSlot,
    LeaveRequest,
    Notification,
    Permission,
    PushNotificationLog,
    PushSubscription,
    Report,
    Role,
)
from .seo_direct import SitemapEngine, _iso, article_related_urls, article_schema_payloads, submit_article_everywhere
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

    def test_new_article_can_be_saved_from_json_payload(self):
        response = self.client.post(
            '/api/articles/',
            {
                'title': 'JSON working draft',
                'subtitle': '',
                'content': 'Draft body from JSON',
                'status': 'draft',
                'slug': 'json-working-draft',
                'categories': [],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201, response.content)
        article = Article.objects.get(slug='json-working-draft')
        self.assertEqual(article.status, 'draft')
        self.assertEqual(article.content, 'Draft body from JSON')

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


class SitemapArticleOrderingTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='sitemap-author',
            password='testpass123',
        )

    def test_article_sitemap_prioritizes_recent_updates(self):
        older_but_updated = Article.objects.create(
            author=self.author,
            title='Older but updated',
            content='Body',
            status='published',
        )
        newer_but_not_updated = Article.objects.create(
            author=self.author,
            title='Newer publish',
            content='Body',
            status='published',
        )

        now = timezone.now()
        Article.objects.filter(pk=older_but_updated.pk).update(
            published_at=now - timezone.timedelta(days=10),
            updated_at=now,
        )
        Article.objects.filter(pk=newer_but_not_updated.pk).update(
            published_at=now - timezone.timedelta(days=1),
            updated_at=now - timezone.timedelta(days=2),
        )

        sitemap_xml = SitemapEngine._build_articles(1)

        older_loc = f"<loc>https://news4bharat.com/article/{older_but_updated.slug}/</loc>"
        newer_loc = f"<loc>https://news4bharat.com/article/{newer_but_not_updated.slug}/</loc>"

        self.assertIn(older_loc, sitemap_xml)
        self.assertIn(newer_loc, sitemap_xml)
        self.assertLess(sitemap_xml.index(older_loc), sitemap_xml.index(newer_loc))


class SitemapDateFormattingTests(TestCase):
    def test_iso_dates_use_local_offset_without_microseconds(self):
        dt = datetime.fromisoformat("2026-05-28T12:48:31.123456+00:00")

        self.assertEqual(_iso(dt), "2026-05-28T18:18:31+05:30")


class SitemapImageOrderingTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='image-sitemap-author',
            password='testpass123',
        )

    def test_image_sitemap_prioritizes_recent_updates(self):
        older_but_updated = Article.objects.create(
            author=self.author,
            title='Older image article',
            content='Body',
            status='published',
            image_url='https://example.com/older.webp',
        )
        newer_but_not_updated = Article.objects.create(
            author=self.author,
            title='Newer image article',
            content='Body',
            status='published',
            image_url='https://example.com/newer.webp',
        )

        now = timezone.now()
        Article.objects.filter(pk=older_but_updated.pk).update(
            published_at=now - timezone.timedelta(days=10),
            updated_at=now,
        )
        Article.objects.filter(pk=newer_but_not_updated.pk).update(
            published_at=now - timezone.timedelta(days=1),
            updated_at=now - timezone.timedelta(days=2),
        )

        sitemap_xml = SitemapEngine._build_images()

        older_loc = f"<loc>https://news4bharat.com/article/{older_but_updated.slug}/</loc>"
        newer_loc = f"<loc>https://news4bharat.com/article/{newer_but_not_updated.slug}/</loc>"

        self.assertIn(older_loc, sitemap_xml)
        self.assertIn(newer_loc, sitemap_xml)
        self.assertLess(sitemap_xml.index(older_loc), sitemap_xml.index(newer_loc))

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
        self.edit_own_article = Permission.objects.create(
            code='edit_own_article',
            description='Can edit own article',
        )

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

    def test_author_publish_attempt_saves_author_details_and_moves_to_review(self):
        self.author.is_staff = True
        self.author.save(update_fields=['is_staff'])
        self.author.profile.extra_permissions.add(self.edit_own_article)
        self.client.force_authenticate(self.author)

        response = self.client.put(
            f'/api/articles/{self.article.pk}/',
            {
                'title': self.article.title,
                'content': self.article.content,
                'status': 'published',
                'editor_name': 'Reporter Display Name',
                'editor_bio': 'Reporter can save their own byline details.',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.article.refresh_from_db()
        self.assertEqual(self.article.status, 'review')
        self.assertEqual(self.article.author_display_name, 'Reporter Display Name')
        self.assertEqual(
            self.article.author_display_bio,
            'Reporter can save their own byline details.',
        )

    def test_author_editing_published_article_via_api_moves_it_to_review(self):
        self.author.is_staff = True
        self.author.save(update_fields=['is_staff'])
        self.author.profile.extra_permissions.add(self.edit_own_article)
        self.article.status = 'published'
        self.article.published_at = timezone.now()
        self.article.save()
        self.client.force_authenticate(self.author)

        response = self.client.put(
            f'/api/articles/{self.article.pk}/',
            {
                'title': 'Updated published story',
                'content': self.article.content,
                'editor_name': 'Reporter Display Name',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.article.refresh_from_db()
        self.assertEqual(self.article.status, 'review')
        self.assertIsNone(self.article.published_at)

    def test_author_editing_published_article_via_admin_cannot_keep_it_live(self):
        self.author.is_staff = True
        self.author.save(update_fields=['is_staff'])
        self.author.profile.extra_permissions.add(self.edit_own_article)
        article = Article.objects.create(
            author=self.author,
            title='Live story',
            content='Body copy',
            status='published',
            published_at=timezone.now(),
        )
        request = RequestFactory().post(f'/admin/newsapp/article/{article.pk}/change/')
        request.user = self.author
        model_admin = ArticleAdmin(Article, admin_site)
        form = type('FormStub', (), {'initial': {'status': 'published'}})()

        article.title = 'Live story updated by reporter'
        article.status = 'published'
        model_admin.save_model(request, article, form=form, change=True)

        article.refresh_from_db()
        self.assertEqual(article.status, 'review')
        self.assertIsNone(article.published_at)


class UserProfileKraPermissionTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.employee = User.objects.create_user(
            username='employee1',
            password='testpass123',
            email='employee1@example.com',
            is_staff=True,
        )
        self.super_admin = User.objects.create_user(
            username='superkra',
            password='testpass123',
            email='superkra@example.com',
            is_staff=True,
            is_superuser=True,
        )

    def test_employee_can_add_own_kra_once(self):
        self.client.force_login(self.employee)

        response = self.client.post(
            f'/admin/auth/user/{self.employee.pk}/profile/',
            {'_save_kra': '1', 'kra': 'Own KRA details'},
        )

        self.assertEqual(response.status_code, 302)
        self.employee.profile.refresh_from_db()
        self.assertEqual(self.employee.profile.kra, 'Own KRA details')

    def test_employee_cannot_update_own_kra_after_it_is_set(self):
        profile = self.employee.profile
        profile.kra = 'Initial KRA'
        profile.save(update_fields=['kra'])
        self.client.force_login(self.employee)

        response = self.client.post(
            f'/admin/auth/user/{self.employee.pk}/profile/',
            {'_save_kra': '1', 'kra': 'Changed KRA'},
        )

        self.assertEqual(response.status_code, 403)
        profile.refresh_from_db()
        self.assertEqual(profile.kra, 'Initial KRA')

    def test_super_admin_can_update_existing_kra(self):
        profile = self.employee.profile
        profile.kra = 'Initial KRA'
        profile.save(update_fields=['kra'])
        self.client.force_login(self.super_admin)

        response = self.client.post(
            f'/admin/auth/user/{self.employee.pk}/profile/',
            {'_save_kra': '1', 'kra': 'Updated by super admin'},
        )

        self.assertEqual(response.status_code, 302)
        profile.refresh_from_db()
        self.assertEqual(profile.kra, 'Updated by super admin')


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    SEO_SITE_URL='https://news4bharat.com',
)
class AttendanceReminderTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.employee = User.objects.create_user(
            username='attendanceuser',
            password='testpass123',
            email='attendance@example.com',
            is_staff=True,
        )

    def test_clock_in_reminder_sends_email_with_one_click_link(self):
        morning_time = timezone.make_aware(datetime(2026, 6, 6, 10, 15))
        mail.outbox = []

        summary = process_attendance_reminders(now=morning_time)

        self.assertEqual(summary['clock_in_first_sent'], 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Clock In', mail.outbox[0].subject)
        self.assertIn('/api/attendance/email-action/?token=', mail.outbox[0].body)

    def test_email_clock_in_link_clocks_user_in(self):
        morning_time = timezone.make_aware(datetime(2026, 6, 6, 10, 15))
        process_attendance_reminders(now=morning_time)
        email_body = mail.outbox[0].body
        action_url = next(
            line.strip() for line in email_body.splitlines()
            if '/api/attendance/email-action/?token=' in line
        )
        response = self.client.get(urlparse(action_url).path + '?' + urlparse(action_url).query)

        self.assertEqual(response.status_code, 200)
        snapshot = self.employee.attendance_records.get(date=timezone.localdate(morning_time))
        self.assertIsNotNone(snapshot.last_clock_in_at)
        self.assertIsNone(snapshot.last_clock_out_at)

    def test_auto_clock_out_runs_at_8pm(self):
        clock_in_time = timezone.make_aware(datetime(2026, 6, 6, 9, 30))
        auto_clock_out_time = timezone.make_aware(datetime(2026, 6, 6, 20, 0))
        clock_in_attendance(self.employee, now=clock_in_time)

        summary = process_attendance_reminders(now=auto_clock_out_time)

        self.assertEqual(summary['auto_clocked_out'], 1)
        record = self.employee.attendance_records.get(date=timezone.localdate(clock_in_time))
        self.assertIsNotNone(record.last_clock_out_at)
        self.assertIsNotNone(record.auto_clocked_out_at)


class GuestProfileDirectoryTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create_superuser(
            username='guestadmin',
            email='guestadmin@example.com',
            password='testpass123',
        )
        self.client.force_login(self.admin_user)

    def test_inactive_staff_member_moves_to_guest_profiles(self):
        active_user = User.objects.create_user(
            username='activeteam',
            email='active@example.com',
            password='testpass123',
            is_staff=True,
            is_active=True,
        )
        active_user.profile.status = 'active'
        active_user.profile.last_seen = timezone.now()
        active_user.profile.save(update_fields=['status', 'last_seen'])
        AttendanceRecord.objects.create(
            user=active_user,
            date=timezone.localdate(),
            last_activity_at=timezone.now(),
        )

        inactive_user = User.objects.create_user(
            username='guestteam',
            email='guest@example.com',
            password='testpass123',
            is_staff=True,
            is_active=True,
        )
        old_time = timezone.now() - timedelta(days=8)
        inactive_user.profile.status = 'active'
        inactive_user.profile.last_seen = old_time
        inactive_user.profile.save(update_fields=['status', 'last_seen'])
        AttendanceRecord.objects.create(
            user=inactive_user,
            date=timezone.localdate(old_time),
            last_activity_at=old_time,
        )

        _sync_guest_profile_state_for_profile(active_user.profile)
        _sync_guest_profile_state_for_profile(inactive_user.profile)
        active_user.profile.refresh_from_db()
        inactive_user.profile.refresh_from_db()

        self.assertFalse(active_user.profile.is_guest_profile)
        self.assertTrue(inactive_user.profile.is_guest_profile)

        team_response = self.client.get(reverse('newsadmin:auth_user_changelist'))
        self.assertEqual(team_response.status_code, 200)
        self.assertContains(team_response, 'activeteam')
        self.assertNotContains(team_response, 'guestteam')

        guest_response = self.client.get(reverse('newsadmin:auth_user_guest_profiles'))
        self.assertEqual(guest_response.status_code, 200)
        self.assertContains(guest_response, 'guestteam')
        self.assertNotContains(guest_response, 'activeteam')


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@example.com',
    ALLOWED_HOSTS=['testserver'],
)
class LeaveRequestAdminTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.employee = User.objects.create_user(
            username='leaveemployee',
            password='testpass123',
            email='leaveemployee@example.com',
            is_staff=True,
        )
        self.super_admin = User.objects.create_user(
            username='leaveadmin',
            password='testpass123',
            email='leaveadmin@example.com',
            is_staff=True,
            is_superuser=True,
        )

    def test_employee_leave_submission_emails_super_admin(self):
        mail.outbox = []
        self.client.force_login(self.employee)

        response = self.client.post(
            reverse('newsadmin:leaves'),
            {
                'leave_action': 'submit_leave',
                'start_date': '2026-06-10',
                'end_date': '2026-06-11',
                'reason': 'Family work',
            },
        )

        self.assertEqual(response.status_code, 302)
        leave_request = LeaveRequest.objects.get(user=self.employee)
        self.assertEqual(leave_request.status, LeaveRequest.STATUS_PENDING)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Leave request:', mail.outbox[0].subject)
        self.assertIn('/api/leaves/email-action/?token=', mail.outbox[0].body)

    def test_email_approve_link_updates_leave_status(self):
        mail.outbox = []
        self.client.force_login(self.employee)
        self.client.post(
            reverse('newsadmin:leaves'),
            {
                'leave_action': 'submit_leave',
                'start_date': '2026-06-10',
                'end_date': '2026-06-10',
                'reason': 'Medical appointment',
            },
        )
        action_url = next(
            line.strip().replace('Approve: ', '')
            for line in mail.outbox[0].body.splitlines()
            if line.startswith('Approve: ')
        )

        response = self.client.get(urlparse(action_url).path + '?' + urlparse(action_url).query)

        self.assertEqual(response.status_code, 200)
        leave_request = LeaveRequest.objects.get(user=self.employee)
        self.assertEqual(leave_request.status, LeaveRequest.STATUS_APPROVED)
        self.assertIsNotNone(leave_request.reviewed_at)

    def test_super_admin_can_mark_employee_attendance_from_leaves_page(self):
        self.client.force_login(self.super_admin)

        response = self.client.post(
            reverse('newsadmin:leaves'),
            {
                'leave_action': 'mark_attendance',
                'user_id': str(self.employee.pk),
                'attendance_date': '2026-06-10',
                'clock_in_time': '10:00',
                'clock_out_time': '18:00',
            },
        )

        self.assertEqual(response.status_code, 302)
        record = AttendanceRecord.objects.get(user=self.employee, date=date(2026, 6, 10))
        self.assertIsNotNone(record.last_clock_in_at)
        self.assertIsNotNone(record.last_clock_out_at)
        self.assertEqual(record.total_active_seconds, 8 * 60 * 60)

    def test_super_admin_can_add_half_day_leave(self):
        self.client.force_login(self.super_admin)

        response = self.client.post(
            reverse('newsadmin:leaves'),
            {
                'leave_action': 'submit_leave',
                'leave_user_id': str(self.employee.pk),
                'start_date': '2026-06-10',
                'end_date': '2026-06-10',
                'reason': 'Half day personal work',
                'is_half_day': '1',
                'direct_approve': '1',
            },
        )

        self.assertEqual(response.status_code, 302)
        leave_request = LeaveRequest.objects.get(user=self.employee, start_date=date(2026, 6, 10))
        self.assertTrue(leave_request.is_half_day)
        self.assertEqual(leave_request.total_days, 0.5)
        self.assertEqual(leave_request.status, LeaveRequest.STATUS_APPROVED)

    def test_half_day_leave_requires_same_start_and_end_date(self):
        self.client.force_login(self.super_admin)

        response = self.client.post(
            reverse('newsadmin:leaves'),
            {
                'leave_action': 'submit_leave',
                'leave_user_id': str(self.employee.pk),
                'start_date': '2026-06-10',
                'end_date': '2026-06-11',
                'reason': 'Invalid half day range',
                'is_half_day': '1',
                'direct_approve': '1',
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertFalse(LeaveRequest.objects.filter(user=self.employee, reason='Invalid half day range').exists())


class ArticleDetailUpdatedFieldsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username='updatedfields',
            password='testpass123',
        )

    def test_article_detail_by_slug_includes_updated_fields(self):
        article = Article.objects.create(
            author=self.author,
            title='Updated article',
            content='Body',
            status='published',
        )
        published_at = timezone.now() - timedelta(minutes=20)
        updated_at = timezone.now()
        Article.objects.filter(pk=article.pk).update(
            published_at=published_at,
            updated_at=updated_at,
        )

        response = self.client.get(f'/api/articles/slug/{article.slug}/')

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertIn('updated_at', payload)
        self.assertIn('is_updated', payload)
        self.assertIn('updated_display', payload)
        self.assertEqual(payload['updated_at'], updated_at.isoformat())
        self.assertTrue(payload['is_updated'])
        self.assertEqual(payload['updated_display'], 'Updated June 6, 2026 - 4:36 PM IST')
        self.assertIn('category_slug', payload)
        self.assertIn('primary_category_slug', payload)

    def test_article_schema_uses_updated_at_for_date_modified_after_edit(self):
        article = Article.objects.create(
            author=self.author,
            title='Schema updated article',
            content='Body',
            status='published',
        )
        published_at = timezone.make_aware(datetime(2026, 6, 6, 10, 0))
        updated_at = timezone.make_aware(datetime(2026, 6, 6, 11, 6, 41))
        Article.objects.filter(pk=article.pk).update(
            published_at=published_at,
            updated_at=updated_at,
            schema_date_modified=published_at,
        )
        article.refresh_from_db()

        article_schema = next(
            item for item in article_schema_payloads(article)
            if item.get('@id', '').endswith('#article')
        )

        self.assertEqual(article_schema['dateModified'], _iso(updated_at))


class ArticleCategorySlugPayloadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username='slugpayloads',
            password='testpass123',
        )
        self.category = Category.objects.create(name='Business', slug='business', status='active')

    def test_article_detail_by_slug_exposes_flat_category_slug_fields(self):
        article = Article.objects.create(
            author=self.author,
            title='Category slug story',
            content='Body',
            status='published',
            primary_category=self.category,
        )
        article.categories.add(self.category)

        response = self.client.get(f'/api/articles/slug/{article.slug}/')

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertEqual(payload['category_slug'], 'business')
        self.assertEqual(payload['primary_category_slug'], 'business')

    def test_homepage_latest_news_current_includes_flat_category_slug_fields(self):
        article = Article.objects.create(
            author=self.author,
            title='Homepage slug story',
            content='Body',
            status='published',
            primary_category=self.category,
            published_at=timezone.now(),
        )
        article.categories.add(self.category)

        response = self.client.get('/api/homepage/latest_news/current/')

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertIn('articles', payload)
        self.assertTrue(payload['articles'])
        first_article = payload['articles'][0]
        self.assertEqual(first_article['slug'], article.slug)
        self.assertEqual(first_article['category_slug'], 'business')
        self.assertEqual(first_article['primary_category_slug'], 'business')


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


class SeoIndexingSubmissionTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='seoauthor',
            password='testpass123',
        )
        self.category = Category.objects.create(name='Business', slug='business', status='active')
        self.article = Article.objects.create(
            author=self.author,
            title='SEO Publish Story',
            content='Body',
            status='published',
        )
        self.article.categories.add(self.category)

    def test_article_related_urls_include_article_homepage_and_categories(self):
        urls = article_related_urls(self.article, base='https://news4bharat.com')
        self.assertIn('https://news4bharat.com/', urls)
        self.assertIn('https://news4bharat.com/category/business', urls)
        self.assertTrue(any('/business/' in url for url in urls))

    @patch('newsapp.seo_direct.ping_search_engines')
    @patch('newsapp.seo_direct.IndexNow.submit')
    @patch('newsapp.seo_direct.GoogleIndexingAPI.submit_many')
    def test_submit_article_everywhere_submits_article_and_category_urls(
        self,
        mock_google_submit_many,
        mock_indexnow_submit,
        mock_ping_search_engines,
    ):
        mock_google_submit_many.return_value = [{'success': True}]
        mock_indexnow_submit.return_value = {'success': True}
        mock_ping_search_engines.return_value = {'google': {'success': True}}

        result = submit_article_everywhere(self.article)

        submitted_urls = mock_google_submit_many.call_args.args[0]
        self.assertIn('https://news4bharat.com/', submitted_urls)
        self.assertIn('https://news4bharat.com/category/business', submitted_urls)
        self.assertTrue(any('/business/' in url for url in submitted_urls))
        self.assertEqual(mock_indexnow_submit.call_args.args[0], submitted_urls)
        self.assertIn('google', result)


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


@override_settings(
    VAPID_PUBLIC_KEY='test-public',
    VAPID_PRIVATE_KEY='test-private',
    VAPID_CLAIMS={'sub': 'mailto:test@example.com'},
)
class PushDeliveryStatusApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.staff_user = User.objects.create_user(
            username='pushadmin',
            email='pushadmin@example.com',
            password='testpass123',
            is_staff=True,
            is_superuser=True,
        )

    def test_push_status_api_returns_subscription_and_log_summary(self):
        active_sub = PushSubscription.objects.create(
            endpoint='https://example.com/push/active',
            p256dh='key-active',
            auth='auth-active',
            is_active=True,
            subscriber_name='Active User',
            subscriber_email='active@example.com',
        )
        inactive_sub = PushSubscription.objects.create(
            endpoint='https://example.com/push/inactive',
            p256dh='key-inactive',
            auth='auth-inactive',
            is_active=False,
            subscriber_name='Inactive User',
            subscriber_email='inactive@example.com',
        )
        PushNotificationLog.objects.create(
            subscription=inactive_sub,
            title='Failed alert',
            body='Body',
            target_url='/failed',
            icon='/logo.png',
            status=PushNotificationLog.STATUS_FAILED,
            error_message='410 Gone',
        )
        PushNotificationLog.objects.create(
            subscription=active_sub,
            title='Sent alert',
            body='Body',
            target_url='/sent',
            icon='/logo.png',
            status=PushNotificationLog.STATUS_SENT,
        )

        self.client.force_login(self.staff_user)
        response = self.client.get('/api/push/status/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['status'], 'ok')
        self.assertEqual(payload['subscriptions']['active'], 1)
        self.assertEqual(payload['subscriptions']['inactive'], 1)
        self.assertEqual(payload['subscriptions']['total'], 2)
        self.assertEqual(payload['logs']['total'], 2)
        self.assertEqual(payload['logs']['sent'], 1)
        self.assertEqual(payload['logs']['failed'], 1)
        self.assertEqual(payload['logs']['latest']['status'], PushNotificationLog.STATUS_SENT)
        self.assertEqual(len(payload['logs']['recent_failures']), 1)
        self.assertEqual(payload['logs']['recent_failures'][0]['error_message'], '410 Gone')


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


class CategorySubcategoryStatsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.user = User.objects.create_user(
            username='category-editor',
            password='testpass123',
        )
        self.category = Category.objects.create(
            name='Sports',
            slug='sports',
            sub_categories={
                'default': ['Cricket', 'Football'],
                'Tournaments': ['IPL'],
            },
        )

    def _make_article(self, title, selected_items):
        article = Article.objects.create(
            author=self.user,
            title=title,
            content=f'{title} body',
            status='published',
            selected_subcategories={
                'subs': {
                    str(self.category.id): selected_items,
                }
            },
        )
        article.categories.add(self.category)
        return article

    def test_category_list_includes_subcategory_article_counts(self):
        self._make_article('Cricket story', ['Cricket'])
        self._make_article('Tournament story', ['Cricket', 'IPL'])
        self._make_article('Football story', ['Football'])

        response = self.client.get('/api/categories/')

        self.assertEqual(response.status_code, 200, response.content)
        category_row = next(item for item in response.json() if item['id'] == self.category.id)
        stats = category_row['subcategory_stats']

        default_section = next(section for section in stats if section['section'] == 'default')
        tournaments_section = next(section for section in stats if section['section'] == 'Tournaments')

        self.assertEqual(default_section['items'][0]['name'], 'Cricket')
        self.assertEqual(default_section['items'][0]['article_count'], 2)
        self.assertEqual(default_section['items'][1]['name'], 'Football')
        self.assertEqual(default_section['items'][1]['article_count'], 1)
        self.assertEqual(tournaments_section['items'][0]['name'], 'IPL')
        self.assertEqual(tournaments_section['items'][0]['article_count'], 1)

    def test_category_posts_can_be_filtered_by_subcategory(self):
        cricket_article = self._make_article('Cricket story', ['Cricket'])
        self._make_article('Football story', ['Football'])

        response = self.client.get(f'/api/categories/{self.category.pk}/posts/?subcategory=Cricket')

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertEqual(payload['total'], 1)
        self.assertEqual(payload['subcategory'], 'Cricket')
        self.assertEqual(len(payload['posts']), 1)
        self.assertEqual(payload['posts'][0]['id'], cricket_article.id)

    def test_article_list_filters_by_category_and_subcategory(self):
        matched_article = self._make_article('GDP story', ['Cricket'])
        self._make_article('General sports story', ['Football'])

        response = self.client.get(
            f'/api/articles/?category={self.category.slug}&subcategory=Cricket&page=1&limit=10'
        )

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertEqual(payload['count'], 1)
        self.assertEqual(payload['total_pages'], 1)
        self.assertFalse(payload['has_next'])
        self.assertEqual(payload['subcategory'], 'Cricket')
        self.assertEqual(len(payload['results']), 1)
        self.assertEqual(payload['results'][0]['id'], matched_article.id)
        self.assertEqual(payload['results'][0]['matched_subcategory'], 'Cricket')
        self.assertIn('selected_subcategories', payload['results'][0])

    def test_article_list_returns_empty_for_invalid_subcategory(self):
        self._make_article('GDP story', ['Cricket'])

        response = self.client.get(
            f'/api/articles/?category={self.category.slug}&subcategory=UnknownTopic&page=1&limit=10'
        )

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertEqual(payload['count'], 0)
        self.assertEqual(payload['total_pages'], 0)
        self.assertFalse(payload['has_next'])
        self.assertEqual(payload['results'], [])


class ReportAdminActionTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username='boss',
            email='boss@example.com',
            password='testpass123',
        )
        self.staff_user = User.objects.create_user(
            username='reporter',
            email='reporter@example.com',
            password='testpass123',
            is_staff=True,
        )
        self.report = Report.objects.create(
            user=self.staff_user,
            period_type='daily',
            report_date=timezone.localdate(),
            report_time=datetime.strptime('16:30', '%H:%M').time(),
            work_done='Initial work',
            pending_work='Initial pending',
            notes='Initial notes',
        )

    def test_staff_user_can_update_own_report_from_admin_page(self):
        self.client.force_login(self.staff_user)

        response = self.client.post(
            '/admin/newsapp/report/',
            {
                '_update_report': '1',
                'report_id': str(self.report.pk),
                'period_type': 'daily',
                'report_date': self.report.report_date.isoformat(),
                'report_time': '17:15',
                'work_done': 'Updated work',
                'pending_work': 'Updated pending',
                'notes': 'Updated notes',
            },
        )

        self.assertEqual(response.status_code, 302)
        self.report.refresh_from_db()
        self.assertEqual(self.report.work_done, 'Updated work')
        self.assertEqual(self.report.pending_work, 'Updated pending')
        self.assertEqual(self.report.notes, 'Updated notes')

    def test_superuser_can_delete_report_from_admin_page(self):
        self.client.force_login(self.superuser)

        response = self.client.post(
            '/admin/newsapp/report/',
            {
                '_delete_report': '1',
                'report_id': str(self.report.pk),
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertFalse(Report.objects.filter(pk=self.report.pk).exists())


class ArticleAssignmentAdminEmailTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.superuser = User.objects.create_superuser(
            username='assign-admin',
            email='assign-admin@example.com',
            password='testpass123',
        )
        self.reporter = User.objects.create_user(
            username='assignment-reporter',
            email='assignment-reporter@example.com',
            password='testpass123',
            is_staff=True,
        )
        self.article = Article.objects.create(
            author=self.superuser,
            title='Assignment target article',
            content='Article body',
            status='draft',
        )
        self.assignment_admin = ArticleAssignmentAdmin(ArticleAssignment, admin_site)

    def test_save_model_sends_assignment_email_for_new_assignment(self):
        request = self.factory.post('/admin/newsapp/articleassignment/add/')
        request.user = self.superuser

        assignment = ArticleAssignment(
            article=self.article,
            user=self.reporter,
            role_type='reporter',
            assignment_message='Please cover this story.',
        )

        self.assignment_admin.save_model(request, assignment, form=None, change=False)

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('New article assignment', mail.outbox[0].subject)
        self.assertIn(self.reporter.email, mail.outbox[0].to)


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
        response = self.client.get('/politics/cabinet-meeting-updates')

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            '<link rel="canonical" href="https://news4bharat.com/politics/cabinet-meeting-updates">',
            html=False,
        )

    def test_category_page_renders_saved_meta_and_canonical(self):
        response = self.client.get('/category/politics')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '<title>Politics News Today</title>', html=False)
        self.assertContains(
            response,
            '<meta name="description" content="Latest politics coverage and analysis from News4Bharat.">',
            html=False,
        )
        self.assertContains(
            response,
            '<link rel="canonical" href="https://news4bharat.com/category/politics">',
            html=False,
        )


@override_settings(SEO_SITE_URL='https://news4bharat.com')
class StaticSitemapTests(TestCase):
    def test_static_sitemap_uses_trailing_slash_urls(self):
        sitemap_xml = SitemapEngine.static_pages()

        self.assertIn('https://news4bharat.com/contact-us', sitemap_xml)
        self.assertIn('https://news4bharat.com/terms-and-conditions', sitemap_xml)
        self.assertIn('https://news4bharat.com/disclaimer', sitemap_xml)
        self.assertIn('https://news4bharat.com/editorial-policy', sitemap_xml)
        self.assertIn('https://news4bharat.com/founders-note', sitemap_xml)
        self.assertIn('https://news4bharat.com/careers', sitemap_xml)
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
