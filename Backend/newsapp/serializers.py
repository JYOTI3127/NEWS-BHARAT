from rest_framework import serializers
from .models import *
from django.contrib.auth.models import User
from .seo_direct import article_url, normalized_canonical
import html
import re


_TWITTER_EMBED_RE = re.compile(
    r'<(?P<tag>div|blockquote)\b(?=[^>]*\barticle-twitter-embed\b)(?=[^>]*\bdata-tweet-url="(?P<url>[^"]+)")[^>]*>[\s\S]*?</(?P=tag)>',
    re.IGNORECASE,
)
_TWITTER_IFRAME_RE = re.compile(
    r'<iframe\b(?=[^>]*(?:platform\.twitter\.com|twitter-widget))(?P<attrs>[^>]*)></iframe>',
    re.IGNORECASE,
)


def normalize_twitter_embeds(content):
    def tweet_block(tweet_url):
        safe_url = html.escape(tweet_url, quote=True)
        return (
            '<blockquote class="twitter-tweet">'
            f'<a href="{safe_url}">{safe_url}</a>'
            '</blockquote>'
        )

    def replace_embed(match):
        return tweet_block(match.group('url'))

    def replace_iframe(match):
        attrs = html.unescape(match.group('attrs') or '')
        id_match = re.search(r'data-tweet-id=["\']?(\d+)', attrs, re.IGNORECASE)
        if not id_match:
            id_match = re.search(r'(?:[?&]|;)id=(\d+)', attrs, re.IGNORECASE)
        if not id_match:
            id_match = re.search(r'/status/(\d+)', attrs, re.IGNORECASE)
        if not id_match:
            return ''
        return tweet_block(f"https://twitter.com/i/status/{id_match.group(1)}")

    normalized = _TWITTER_EMBED_RE.sub(replace_embed, content or '')
    normalized = _TWITTER_IFRAME_RE.sub(replace_iframe, normalized)
    normalized = re.sub(
        r'<div\b[^>]*class="[^"]*\btwitter-tweet-rendered\b[^"]*"[^>]*>\s*(<blockquote class="twitter-tweet">[\s\S]*?</blockquote>)\s*</div>',
        r'\1',
        normalized,
        flags=re.IGNORECASE,
    )
    return normalized


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email']


class CategorySerializer(serializers.ModelSerializer):
    article_count  = serializers.SerializerMethodField()
    unique_total_articles = serializers.SerializerMethodField()
    published_this_month = serializers.SerializerMethodField()
    sub_categories = serializers.JSONField(required=False)

    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'description', 'status', 'sub_categories', 'article_count', 'unique_total_articles', 'published_this_month']

    def get_article_count(self, obj):
        try:
            return obj.articles.filter(status='published').count()
        except Exception:
            return 0

    def get_unique_total_articles(self, obj):
        return self.context.get('unique_total_articles', 0)

    def get_published_this_month(self, obj):
        return self.context.get('published_this_month', 0)

    def validate_sub_categories(self, value):
        if value in (None, ''):
            return {}

        if isinstance(value, list):
            cleaned = [str(item).strip() for item in value if str(item).strip()]
            return {'default': cleaned} if cleaned else {}

        if isinstance(value, dict):
            normalized = {}
            for key, items in value.items():
                section_key = str(key).strip() or 'default'
                if isinstance(items, list):
                    normalized[section_key] = [str(item).strip() for item in items if str(item).strip()]
                elif items in (None, ''):
                    normalized[section_key] = []
                else:
                    item = str(items).strip()
                    normalized[section_key] = [item] if item else []
            return normalized

        return {}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        subs = instance.sub_categories
        if isinstance(subs, list):
            data['sub_categories'] = {'default': subs} if subs else {}
        elif isinstance(subs, dict):
            data['sub_categories'] = subs
        else:
            data['sub_categories'] = {}
        return data


class ArticleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class ContactQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactQuery
        fields = [
            'id',
            'full_name',
            'email',
            'phone_number',
            'subject',
            'message',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate_message(self, value):
        value = (value or '').strip()
        if len(value) < 10:
            raise serializers.ValidationError('Message must be at least 10 characters long.')
        if len(value) > 600:
            raise serializers.ValidationError('Message cannot be longer than 600 characters.')
        return value


class CareerApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerApplication
        fields = [
            'id',
            'full_name',
            'email',
            'phone_number',
            'portfolio_url',
            'job_title',
            'job_type',
            'resume',
            'cover_note',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate_resume(self, value):
        max_size = 5 * 1024 * 1024
        allowed_extensions = ('.pdf', '.doc', '.docx')
        name = (value.name or '').lower()
        if not name.endswith(allowed_extensions):
            raise serializers.ValidationError('Resume must be a PDF, DOC, or DOCX file.')
        if value.size > max_size:
            raise serializers.ValidationError('Resume file size cannot exceed 5 MB.')
        return value

    def validate_cover_note(self, value):
        value = (value or '').strip()
        if len(value) > 500:
            raise serializers.ValidationError('Cover note cannot be longer than 500 characters.')
        return value


class ArticleSerializer(serializers.ModelSerializer):

    # Categories (ManyToMany)
    categories = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        required=False
    )
    primary_category_details = serializers.SerializerMethodField()
    category_details = serializers.SerializerMethodField()
    canonical_url = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    content_html = serializers.SerializerMethodField()

    # Audit trail - read only
    author             = UserSerializer(read_only=True)
    posted_by_username = serializers.SerializerMethodField()
    posted_by_fullname = serializers.SerializerMethodField()

    # Frontend should use display_author_name - falls back to username if blank
    display_author_name = serializers.SerializerMethodField()

    # Image
    image_url = serializers.SerializerMethodField()

    # image_alt and image_source explicitly exposed
    image_alt    = serializers.CharField(required=False, allow_blank=True, default='')
    image_source = serializers.CharField(required=False, allow_blank=True, default='')

    # tags exposed as a Python list for easy frontend consumption
    tags_list = serializers.SerializerMethodField()

    # secondary_keywords exposed as list too
    secondary_keywords_list = serializers.SerializerMethodField()

    # Frontend se aane wale editor_ fields (write-only)
    editor_name      = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_position  = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_bio       = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_photo     = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_twitter   = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_linkedin  = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_instagram = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_facebook  = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_articles  = serializers.IntegerField(write_only=True, required=False, default=0)

    class Meta:
        model  = Article
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'published_at', 'author',
            'posted_by_username', 'posted_by_fullname',
            'display_author_name',
            'author_display_name', 'author_display_position',
            'author_display_bio', 'author_display_photo',
            'author_display_twitter', 'author_display_linkedin',
            'author_display_instagram', 'author_display_facebook',
            'author_display_articles_count',
            'tags_list', 'secondary_keywords_list',
        ]

    def get_category_details(self, obj):
        return CategorySerializer(obj.categories.all(), many=True).data

    def get_primary_category_details(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return CategorySerializer(cat).data if cat else None

    def get_canonical_url(self, obj):
        final_url = article_url(obj)
        return normalized_canonical(obj, final_url)

    def get_public_url(self, obj):
        return article_url(obj)

    def get_content_html(self, obj):
        return normalize_twitter_embeds(obj.content)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['content'] = normalize_twitter_embeds(data.get('content', ''))
        return data

    def get_posted_by_username(self, obj):
        return obj.author.username if obj.author else None

    def get_posted_by_fullname(self, obj):
        return obj.author.get_full_name() if obj.author else None

    def get_display_author_name(self, obj):
        if obj.author_display_name and obj.author_display_name.strip():
            return obj.author_display_name.strip()
        if obj.author:
            full = obj.author.get_full_name()
            return full if full.strip() else obj.author.username
        return ''

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            try:
                base  = request.build_absolute_uri(obj.image.url) if request else obj.image.url
                mtime = obj.image.storage.get_modified_time(obj.image.name)
                return f"{base}?v={int(mtime.timestamp())}"
            except Exception:
                try:
                    return request.build_absolute_uri(obj.image.url) if request else obj.image.url
                except Exception:
                    return None
        return obj.image_url if obj.image_url else None

    def get_tags_list(self, obj):
        if not obj.tags:
            return []
        return [t.strip() for t in obj.tags.split(',') if t.strip()]

    def get_secondary_keywords_list(self, obj):
        if not obj.secondary_keywords:
            return []
        return [k.strip() for k in obj.secondary_keywords.split(',') if k.strip()]

    def create(self, validated_data):
        display_name      = validated_data.pop('editor_name', '')
        display_position  = validated_data.pop('editor_position', '')
        display_bio       = validated_data.pop('editor_bio', '')
        display_photo     = validated_data.pop('editor_photo', '')
        display_twitter   = validated_data.pop('editor_twitter', '')
        display_linkedin  = validated_data.pop('editor_linkedin', '')
        display_instagram = validated_data.pop('editor_instagram', '')
        display_facebook  = validated_data.pop('editor_facebook', '')
        display_articles  = validated_data.pop('editor_articles', 0)

        categories = validated_data.pop('categories', [])

        request = self.context.get('request')

        article = Article.objects.create(
            author=request.user if request else None,
            author_display_name=display_name,
            author_display_position=display_position,
            author_display_bio=display_bio,
            author_display_photo=display_photo,
            author_display_twitter=display_twitter,
            author_display_linkedin=display_linkedin,
            author_display_instagram=display_instagram,
            author_display_facebook=display_facebook,
            author_display_articles_count=display_articles,
            **validated_data
        )

        if categories:
            article.categories.set(categories)

        return article

    def update(self, instance, validated_data):
        display_name      = validated_data.pop('editor_name',      instance.author_display_name)
        display_position  = validated_data.pop('editor_position',  instance.author_display_position)
        display_bio       = validated_data.pop('editor_bio',       instance.author_display_bio)
        display_photo     = validated_data.pop('editor_photo',     instance.author_display_photo)
        display_twitter   = validated_data.pop('editor_twitter',   instance.author_display_twitter)
        display_linkedin  = validated_data.pop('editor_linkedin',  instance.author_display_linkedin)
        display_instagram = validated_data.pop('editor_instagram', instance.author_display_instagram)
        display_facebook  = validated_data.pop('editor_facebook',  instance.author_display_facebook)
        display_articles  = validated_data.pop('editor_articles',  instance.author_display_articles_count)

        categories = validated_data.pop('categories', None)
        validated_data.pop('author', None)

        instance.author_display_name           = display_name
        instance.author_display_position       = display_position
        instance.author_display_bio            = display_bio
        instance.author_display_photo          = display_photo
        instance.author_display_twitter        = display_twitter
        instance.author_display_linkedin       = display_linkedin
        instance.author_display_instagram      = display_instagram
        instance.author_display_facebook       = display_facebook
        instance.author_display_articles_count = display_articles

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if categories is not None:
            instance.categories.set(categories)

        return instance


class ArticleMinSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    date        = serializers.SerializerMethodField()
    image_url   = serializers.SerializerMethodField()
    primary_category = serializers.SerializerMethodField()
    canonical_url = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    categories  = CategorySerializer(many=True, read_only=True)
    image_alt    = serializers.CharField(read_only=True)
    image_source = serializers.CharField(read_only=True)

    class Meta:
        model  = Article
        fields = ['id', 'title', 'image', 'author_name', 'date', 'image_url',
                  'categories', 'primary_category', 'canonical_url', 'public_url', 'image_alt', 'image_source']

    def get_author_name(self, obj):
        if obj.author_display_name and obj.author_display_name.strip():
            return obj.author_display_name.strip()
        if obj.author:
            full = obj.author.get_full_name()
            return full if full.strip() else obj.author.username
        return ''

    def get_date(self, obj):
        return obj.created_at.strftime('%b %d, %Y') if obj.created_at else ''

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            try:
                return request.build_absolute_uri(obj.image.url) if request else obj.image.url
            except Exception:
                return obj.image_url or None
        return obj.image_url

    def get_primary_category(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return {'id': cat.id, 'name': cat.name, 'slug': cat.slug} if cat else None

    def get_canonical_url(self, obj):
        final_url = article_url(obj)
        return normalized_canonical(obj, final_url)

    def get_public_url(self, obj):
        return article_url(obj)

class ArticleHomepageSerializer(serializers.ModelSerializer):
    image_url    = serializers.SerializerMethodField()
    category     = serializers.SerializerMethodField()
    primary_category = serializers.SerializerMethodField()
    canonical_url = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    author_name  = serializers.SerializerMethodField()
    categories   = ArticleCategorySerializer(many=True, read_only=True)

    class Meta:
        model  = Article
        fields = [
            'id', 'title', 'slug', 'subtitle',                 
            'image_url', 'image_alt',
            'category', 'primary_category', 'categories',
            'published_at', 'created_at',
            'canonical_url', 'public_url', 'meta_description', 'focus_keyword',
            'secondary_keywords', 'noindex', 'nofollow', 'in_sitemap',
            'author_name', 'tags', 'is_paid',
            'selected_subcategories',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            try:
                return request.build_absolute_uri(obj.image.url) if request else obj.image.url
            except Exception:
                return obj.image_url or None
        return obj.image_url or None

    def get_category(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return {'id': cat.id, 'name': cat.name, 'slug': cat.slug} if cat else None

    def get_primary_category(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return {'id': cat.id, 'name': cat.name, 'slug': cat.slug} if cat else None

    def get_canonical_url(self, obj):
        final_url = article_url(obj)
        return normalized_canonical(obj, final_url)

    def get_public_url(self, obj):
        return article_url(obj)

    def get_author_name(self, obj):
        if obj.author_display_name and obj.author_display_name.strip():
            return obj.author_display_name.strip()
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return ''


class NewsletterCardSerializer(serializers.ModelSerializer):
    created_at = serializers.SerializerMethodField()
    html = serializers.CharField(source='html_content', required=False, allow_blank=True)

    class Meta:
        model = NewsletterCard
        fields = [
            'id',
            'title',
            'subject',
            'image',
            'description',
            'link',
            'html',
            'html_content',
            'chosen_articles',
            'draft_data',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_created_at(self, obj):
        return obj.created_at.date().isoformat() if obj.created_at else None
