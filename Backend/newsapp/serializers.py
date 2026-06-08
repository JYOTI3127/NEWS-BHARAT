from rest_framework import serializers
from .models import *
from django.contrib.auth.models import User
from django.conf import settings
from .seo_direct import article_url, normalized_canonical, article_schema_payloads
from django.utils import timezone
from datetime import timedelta
from .utils import get_article_render_content
from urllib.parse import urljoin


ARTICLE_UPDATED_GRACE_PERIOD = timedelta(seconds=1)


def _effective_published_at(obj):
    return getattr(obj, 'published_at', None) or getattr(obj, 'created_at', None)


def _effective_updated_at(obj):
    return (
        getattr(obj, 'updated_at', None)
        or _effective_published_at(obj)
        or getattr(obj, 'created_at', None)
    )


def _is_article_updated(obj):
    updated_at = _effective_updated_at(obj)
    published_at = _effective_published_at(obj)
    if not updated_at or not published_at:
        return False
    return updated_at > published_at + ARTICLE_UPDATED_GRACE_PERIOD


def _format_updated_display(obj):
    if not _is_article_updated(obj):
        return ''
    updated_at = _effective_updated_at(obj)
    if not updated_at:
        return ''
    updated_at = timezone.localtime(updated_at)
    month = updated_at.strftime('%B')
    time_label = updated_at.strftime('%I:%M %p').lstrip('0')
    tz_label = updated_at.tzname() or 'IST'
    return f"Updated {month} {updated_at.day}, {updated_at.year} - {time_label} {tz_label}"


def _public_newsletter_asset_url(raw_url):
    raw_url = str(raw_url or '').strip()
    if not raw_url:
        return None
    if raw_url.startswith(('http://', 'https://', 'cid:', 'data:')):
        return raw_url
    base_url = str(
        getattr(settings, 'NEWSLETTER_MEDIA_BASE_URL', '')
        or getattr(settings, 'NEWSLETTER_SITE_URL', '')
        or getattr(settings, 'SEO_SITE_URL', '')
        or ''
    ).strip()
    if not base_url:
        return raw_url
    return urljoin(base_url.rstrip('/') + '/', raw_url.lstrip('/'))


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
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'meta_title',
            'meta_description',
            'status',
            'sub_categories',
            'article_count',
            'unique_total_articles',
            'published_this_month',
        ]

    def validate_meta_title(self, value):
        return ' '.join(str(value or '').strip().split())

    def validate_meta_description(self, value):
        return str(value or '').strip()

    def get_article_count(self, obj):
        try:
            annotated = getattr(obj, 'article_count', None)
            if annotated is not None:
                return annotated
            return obj.articles.filter(status='published').count()
        except Exception:
            return 0

    def get_unique_total_articles(self, obj):
        annotated = getattr(obj, 'unique_total_articles', None)
        if annotated is not None:
            return annotated
        return self.context.get('unique_total_articles', 0)

    def get_published_this_month(self, obj):
        annotated = getattr(obj, 'published_this_month', None)
        if annotated is not None:
            return annotated
        return self.context.get('published_this_month', 0)

    def validate_sub_categories(self, value):
        if value in (None, ''):
            return {}

        if isinstance(value, list):
            cleaned = []
            for item in value:
                if isinstance(item, dict):
                    name = str(item.get('name') or '').strip()
                    status = str(item.get('status') or 'active').strip().lower() or 'active'
                else:
                    name = str(item).strip()
                    status = 'active'
                if not name:
                    continue
                cleaned.append({
                    'name': name,
                    'status': 'archived' if status == 'archived' else 'active',
                })
            return {'default': cleaned} if cleaned else {}

        if isinstance(value, dict):
            normalized = {}
            for key, items in value.items():
                section_key = str(key).strip() or 'default'
                if isinstance(items, list):
                    normalized_items = []
                    for item in items:
                        if isinstance(item, dict):
                            name = str(item.get('name') or '').strip()
                            status = str(item.get('status') or 'active').strip().lower() or 'active'
                        else:
                            name = str(item).strip()
                            status = 'active'
                        if not name:
                            continue
                        normalized_items.append({
                            'name': name,
                            'status': 'archived' if status == 'archived' else 'active',
                        })
                    normalized[section_key] = normalized_items
                elif items in (None, ''):
                    normalized[section_key] = []
                else:
                    if isinstance(items, dict):
                        name = str(items.get('name') or '').strip()
                        status = str(items.get('status') or 'active').strip().lower() or 'active'
                    else:
                        name = str(items).strip()
                        status = 'active'
                    normalized[section_key] = [{
                        'name': name,
                        'status': 'archived' if status == 'archived' else 'active',
                    }] if name else []
            return normalized

        return {}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        subs = instance.sub_categories
        if isinstance(subs, list):
            data['sub_categories'] = {
                'default': [
                    {'name': str(item).strip(), 'status': 'active'}
                    for item in subs
                    if str(item).strip()
                ]
            } if subs else {}
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
        max_size = 10 * 1024 * 1024
        allowed_extensions = ('.pdf', '.doc', '.docx')
        name = (value.name or '').lower()
        if not name.endswith(allowed_extensions):
            raise serializers.ValidationError('Resume must be a PDF, DOC, or DOCX file.')
        if value.size > max_size:
            raise serializers.ValidationError('Resume file size cannot exceed 10 MB.')
        return value

    def validate_cover_note(self, value):
        value = (value or '').strip()
        if len(value) > 500:
            raise serializers.ValidationError('Cover note cannot be longer than 500 characters.')
        return value


class JobOpeningSerializer(serializers.ModelSerializer):
    employment_type_display = serializers.CharField(source='get_employment_type_display', read_only=True)
    skills_list = serializers.SerializerMethodField()

    class Meta:
        model = JobOpening
        fields = [
            'id',
            'title',
            'team',
            'employment_type',
            'employment_type_display',
            'location',
            'short_description',
            'skills',
            'skills_list',
            'icon_key',
            'apply_url',
            'display_order',
            'is_active',
        ]

    def get_skills_list(self, obj):
        return [item.strip() for item in (obj.skills or '').split(',') if item.strip()]


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
    structured_data = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    is_updated = serializers.SerializerMethodField()
    updated_display = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    primary_category_slug = serializers.SerializerMethodField()
    reporter_assignments = serializers.SerializerMethodField()

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
            'id', 'created_at', 'published_at', 'updated_at', 'author',
            'posted_by_username', 'posted_by_fullname',
            'display_author_name',
            'author_display_name', 'author_display_position',
            'author_display_bio', 'author_display_photo',
            'author_display_twitter', 'author_display_linkedin',
            'author_display_instagram', 'author_display_facebook',
            'author_display_articles_count',
            'tags_list', 'secondary_keywords_list',
            'is_updated', 'updated_display',
        ]

    def get_field_names(self, declared_fields, info):
        field_names = list(super().get_field_names(declared_fields, info))
        for extra_name in (
            'primary_category_details',
            'category_details',
            'canonical_url',
            'public_url',
            'content_html',
            'structured_data',
            'updated_at',
            'is_updated',
            'updated_display',
            'category_slug',
            'primary_category_slug',
            'reporter_assignments',
            'posted_by_username',
            'posted_by_fullname',
            'display_author_name',
            'image_url',
            'tags_list',
            'secondary_keywords_list',
        ):
            if extra_name not in field_names:
                field_names.append(extra_name)
        return field_names

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

    def get_category_slug(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return str(getattr(cat, 'slug', '') or '') if cat else ''

    def get_primary_category_slug(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return str(getattr(cat, 'slug', '') or '') if cat else ''

    def get_content_html(self, obj):
        return get_article_render_content(obj)

    def get_structured_data(self, obj):
        return article_schema_payloads(obj)

    def get_effective_updated_at(self, obj):
        return _effective_updated_at(obj)

    def get_updated_at(self, obj):
        updated_at = self.get_effective_updated_at(obj)
        return updated_at.isoformat() if updated_at else None

    def get_updated_display(self, obj):
        return _format_updated_display(obj)

    def get_is_updated(self, obj):
        return _is_article_updated(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        rendered_content = get_article_render_content(instance)
        data['content'] = rendered_content
        data['content_clean'] = rendered_content
        data['content_raw'] = instance.content_raw or instance.content or ''
        data['content_html'] = rendered_content
        data['structured_data'] = article_schema_payloads(instance)
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
                raw_base = request.build_absolute_uri(obj.image.url) if request else obj.image.url
                base = _public_newsletter_asset_url(raw_base) or raw_base
                mtime = obj.image.storage.get_modified_time(obj.image.name)
                return f"{base}?v={int(mtime.timestamp())}"
            except Exception:
                try:
                    raw_url = request.build_absolute_uri(obj.image.url) if request else obj.image.url
                    return _public_newsletter_asset_url(raw_url) or raw_url
                except Exception:
                    return None
        return _public_newsletter_asset_url(obj.image_url) if obj.image_url else None

    def get_tags_list(self, obj):
        if not obj.tags:
            return []
        return [t.strip() for t in obj.tags.split(',') if t.strip()]

    def get_secondary_keywords_list(self, obj):
        if not obj.secondary_keywords:
            return []
        return [k.strip() for k in obj.secondary_keywords.split(',') if k.strip()]

    def get_reporter_assignments(self, obj):
        assignments = (
            obj.assignments
            .filter(role_type='reporter')
            .select_related('user')
            .order_by('assigned_at', 'id')
        )
        return [
            {
                'user_id': item.user_id,
                'name': item.user.get_full_name() or item.user.username,
                'deadline': item.deadline.isoformat() if item.deadline else None,
                'assignment_message': item.assignment_message or '',
            }
            for item in assignments
        ]

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
                raw_url = request.build_absolute_uri(obj.image.url) if request else obj.image.url
                return _public_newsletter_asset_url(raw_url) or raw_url
            except Exception:
                return _public_newsletter_asset_url(obj.image_url) or None
        return _public_newsletter_asset_url(obj.image_url)

    def get_primary_category(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return {'id': cat.id, 'name': cat.name, 'slug': cat.slug} if cat else None

    def get_category_slug(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return str(getattr(cat, 'slug', '') or '') if cat else ''

    def get_primary_category_slug(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return str(getattr(cat, 'slug', '') or '') if cat else ''

    def get_canonical_url(self, obj):
        final_url = article_url(obj)
        return normalized_canonical(obj, final_url)

    def get_public_url(self, obj):
        return article_url(obj)

class ArticleHomepageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    image_url    = serializers.SerializerMethodField()
    category     = serializers.SerializerMethodField()
    primary_category = serializers.SerializerMethodField()
    canonical_url = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    published_at = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    author_name  = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    is_updated = serializers.SerializerMethodField()
    updated_display = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    primary_category_slug = serializers.SerializerMethodField()
    categories   = ArticleCategorySerializer(many=True, read_only=True)

    class Meta:
        model  = Article
        fields = [
            'id', 'title', 'slug', 'subtitle',                 
            'image', 'image_url', 'image_alt',
            'category', 'primary_category', 'categories',
            'published_at', 'created_at', 'updated_at', 'date',
            'is_updated', 'updated_display',
            'category_slug', 'primary_category_slug',
            'canonical_url', 'public_url', 'meta_title', 'meta_description', 'focus_keyword',
            'secondary_keywords', 'noindex', 'nofollow', 'in_sitemap',
            'author_name', 'tags', 'is_paid',
            'selected_subcategories',
        ]

    def get_image(self, obj):
        return self.get_image_url(obj)

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            try:
                raw_url = request.build_absolute_uri(obj.image.url) if request else obj.image.url
                return _public_newsletter_asset_url(raw_url) or raw_url
            except Exception:
                return _public_newsletter_asset_url(obj.image_url) or None
        return _public_newsletter_asset_url(obj.image_url) or None

    def get_category(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return {'id': cat.id, 'name': cat.name, 'slug': cat.slug} if cat else None

    def get_primary_category(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return {'id': cat.id, 'name': cat.name, 'slug': cat.slug} if cat else None

    def get_category_slug(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return str(getattr(cat, 'slug', '') or '') if cat else ''

    def get_primary_category_slug(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return str(getattr(cat, 'slug', '') or '') if cat else ''

    def get_canonical_url(self, obj):
        final_url = article_url(obj)
        return normalized_canonical(obj, final_url)

    def get_public_url(self, obj):
        return article_url(obj)

    def get_effective_published_at(self, obj):
        return _effective_published_at(obj)

    def get_published_at(self, obj):
        published_at = self.get_effective_published_at(obj)
        return published_at.isoformat() if published_at else None

    def get_date(self, obj):
        published_at = self.get_effective_published_at(obj)
        if not published_at:
            return ''
        return timezone.localtime(published_at).strftime('%b %d, %Y')

    def get_author_name(self, obj):
        if obj.author_display_name and obj.author_display_name.strip():
            return obj.author_display_name.strip()
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return ''

    def get_effective_updated_at(self, obj):
        return _effective_updated_at(obj)

    def get_updated_at(self, obj):
        updated_at = self.get_effective_updated_at(obj)
        return updated_at.isoformat() if updated_at else None

    def get_updated_display(self, obj):
        return _format_updated_display(obj)

    def get_is_updated(self, obj):
        return _is_article_updated(obj)


class ArticleListSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    primary_category = serializers.SerializerMethodField()
    published_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    is_updated = serializers.SerializerMethodField()
    updated_display = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    primary_category_slug = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    canonical_url = serializers.SerializerMethodField()
    selected_subcategories = serializers.JSONField(read_only=True)
    matched_subcategory = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id',
            'title',
            'slug',
            'subtitle',
            'image_url',
            'image_alt',
            'primary_category',
            'published_at',
            'updated_at',
            'is_updated',
            'updated_display',
            'category_slug',
            'primary_category_slug',
            'public_url',
            'canonical_url',
            'selected_subcategories',
            'matched_subcategory',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            try:
                return request.build_absolute_uri(obj.image.url) if request else obj.image.url
            except Exception:
                return obj.image_url or None
        return obj.image_url or None

    def get_primary_category(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return {'id': cat.id, 'name': cat.name, 'slug': cat.slug} if cat else None

    def get_category_slug(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return str(getattr(cat, 'slug', '') or '') if cat else ''

    def get_primary_category_slug(self, obj):
        cat = obj.primary_category or obj.categories.first()
        return str(getattr(cat, 'slug', '') or '') if cat else ''

    def get_published_at(self, obj):
        published_at = _effective_published_at(obj)
        return published_at.isoformat() if published_at else None

    def get_updated_at(self, obj):
        updated_at = _effective_updated_at(obj)
        return updated_at.isoformat() if updated_at else None

    def get_is_updated(self, obj):
        return _is_article_updated(obj)

    def get_updated_display(self, obj):
        return _format_updated_display(obj)

    def get_public_url(self, obj):
        return article_url(obj)

    def get_canonical_url(self, obj):
        final_url = article_url(obj)
        return normalized_canonical(obj, final_url)

    def get_matched_subcategory(self, obj):
        return getattr(obj, 'matched_subcategory', '')


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


class LiveUpdateSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = LiveUpdate
        fields = [
            'id',
            'title',
            'summary',
            'is_active',
            'published_at',
            'date',
            'time',
            'created_at',
            'updated_at',
        ]

    def get_date(self, obj):
        if not obj.published_at:
            return ''
        return timezone.localtime(obj.published_at).strftime('%d %b %Y')

    def get_time(self, obj):
        if not obj.published_at:
            return ''
        return timezone.localtime(obj.published_at).strftime('%I:%M %p')
