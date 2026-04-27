from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Article


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
