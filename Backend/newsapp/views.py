from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.admin.views.decorators import staff_member_required
from .models import *
from .utils import has_permission
import json
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.db.models import F
from django.db.models import Case, When, IntegerField
from datetime import datetime, timedelta
import requests
from django.conf import settings
from django.core.paginator import Paginator
from rest_framework import status
from .serializers import *
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.contrib import messages
from .models import UserProfile, LoginAttemptLog
from .workflow import ALLOWED_TRANSITIONS
import os
import uuid
import re
from pathlib import Path
from openai import OpenAI
from django.urls import reverse
from django.utils.dateparse import parse_datetime
from django.core.cache import cache
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.images import get_image_dimensions
from django.core.files.storage import default_storage
from django.db.models import Prefetch
from zoneinfo import ZoneInfo
from .seo_direct import article_path, article_url, clean_url_segment, normalized_canonical
from django.utils.text import slugify
from .attendance import get_attendance_snapshot, pause_attendance, touch_attendance

User = get_user_model()
IST = ZoneInfo("Asia/Kolkata")


def _parse_ist_datetime(raw_value):
    raw_value = str(raw_value or '').strip()
    if not raw_value:
        return None

    parsed_value = parse_datetime(raw_value)
    if parsed_value is None:
        return None

    if timezone.is_naive(parsed_value):
        return timezone.make_aware(parsed_value, IST)

    return parsed_value.astimezone(IST)


def _unique_article_image_name(article, original_filename, extension):
    base_name = os.path.splitext(os.path.basename(original_filename or 'article-image'))[0]
    safe_base = slugify(base_name)[:45] or 'article-image'
    safe_slug = slugify(getattr(article, 'slug', '') or getattr(article, 'title', ''))[:45] or 'article'
    return f"{safe_slug}-{uuid.uuid4().hex[:10]}-{safe_base}{extension}"


def _unique_inline_image_name(original_filename, extension):
    base_name = os.path.splitext(os.path.basename(original_filename or 'inline-image'))[0]
    safe_base = slugify(base_name)[:45] or 'inline-image'
    return f"articles/inline/{safe_base}-{uuid.uuid4().hex[:10]}{extension}"


def _normalize_inline_image_format(uploaded_file):
    content_type = (getattr(uploaded_file, 'content_type', '') or '').lower().strip()
    extension = os.path.splitext(getattr(uploaded_file, 'name', '') or '')[1].lower()
    format_map = {
        'image/jpeg': ('JPEG', '.jpg', 'image/jpeg'),
        'image/jpg': ('JPEG', '.jpg', 'image/jpeg'),
        'image/png': ('PNG', '.png', 'image/png'),
        'image/webp': ('WEBP', '.webp', 'image/webp'),
    }
    extension_map = {
        '.jpg': ('JPEG', '.jpg', 'image/jpeg'),
        '.jpeg': ('JPEG', '.jpg', 'image/jpeg'),
        '.png': ('PNG', '.png', 'image/png'),
        '.webp': ('WEBP', '.webp', 'image/webp'),
    }

    if content_type in format_map:
        return format_map[content_type]
    if extension in extension_map:
        return extension_map[extension]
    raise ValidationError('Only JPG, PNG, and WEBP inline images are allowed.')


def _compress_uploaded_image(uploaded_file, output_name, output_format='WEBP', quality=78):
    from PIL import Image as PILImage
    import io

    uploaded_file.seek(0)
    img = PILImage.open(uploaded_file)

    if output_format in {"JPEG", "WEBP"} and img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    output = io.BytesIO()
    save_kwargs = {'format': output_format, 'optimize': True}
    if output_format in {'JPEG', 'WEBP'}:
        save_kwargs['quality'] = quality
    img.save(output, **save_kwargs)
    output.seek(0)
    return ContentFile(output.read(), name=output_name)


def _invalidate_article_caches(article, old_slug=None):
    try:
        if old_slug:
            cache.delete(f"article:slug:{old_slug}")
        if getattr(article, 'slug', None):
            cache.delete(f"article:slug:{article.slug}")
        cache.delete('articles:homepage:')
        cache.delete('categories:all:v2')
        cache.delete('categories:all:v3')
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern('articles:list:*')
            cache.delete_pattern('articles:homepage:*')
            cache.delete_pattern('categories:all:*')
        cat_slugs = list(article.categories.values_list('slug', flat=True))
        for cat_slug in cat_slugs:
            cache.delete(f"articles:homepage:{cat_slug}")
    except Exception:
        pass


def _invalidate_category_cache():
    cache.delete('categories:all:v2')
    cache.delete('categories:all:v3')
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern('categories:all:*')
    except Exception:
        pass


@api_view(['POST'])
def inline_image_upload(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return Response({"error": "Admin login required"}, status=401)

    uploaded_file = request.FILES.get('image')
    if not uploaded_file:
        return Response({"error": "Image file is required."}, status=400)

    content_type = (getattr(uploaded_file, 'content_type', '') or '').lower()
    if content_type and not content_type.startswith('image/'):
        return Response({"error": "Only image uploads are allowed."}, status=400)

    try:
        output_format, extension, response_content_type = _normalize_inline_image_format(uploaded_file)
        compressed_file = _compress_uploaded_image(
            uploaded_file,
            _unique_inline_image_name(uploaded_file.name, extension),
            output_format=output_format,
            quality=78,
        )
        stored_name = default_storage.save(compressed_file.name, compressed_file)
    except Exception as exc:
        return Response({"error": f"Inline image upload failed: {exc}"}, status=400)

    return Response({
        "url": default_storage.url(stored_name),
        "name": stored_name,
        "content_type": response_content_type,
    }, status=201)


def _normalize_meta_title(value):
    value = ' '.join(str(value or '').strip().split())
    if not value:
        return ''
    if len(value) <= 70:
        return value
    shortened = value[:70].rsplit(' ', 1)[0].strip()
    if len(shortened) < 30:
        shortened = value[:70].strip()
    return shortened


def _normalize_category_tree(value):
    if value in (None, ''):
        return {}

    if isinstance(value, str):
        text = value.strip()
        return text if text else ''

    if isinstance(value, list):
        normalized_list = []
        for item in value:
            normalized_item = _normalize_category_tree(item)
            if normalized_item in ({}, [], ''):
                continue
            normalized_list.append(normalized_item)
        return normalized_list

    if isinstance(value, dict):
        normalized_dict = {}
        for key, item in value.items():
            clean_key = str(key).strip()
            if not clean_key:
                continue
            normalized_item = _normalize_category_tree(item)
            if normalized_item in ({}, [], ''):
                continue
            normalized_dict[clean_key] = normalized_item
        return normalized_dict

    text = str(value).strip()
    return text if text else ''


def _validate_article_status_change(*, user, previous_status, requested_status):
    if getattr(user, 'is_superuser', False):
        return None

    requested_status = (requested_status or '').strip()
    previous_status = (previous_status or '').strip()

    if requested_status == 'published':
        return 'Only admin can publish articles.'

    if previous_status and requested_status and previous_status != requested_status:
        allowed = ALLOWED_TRANSITIONS.get(previous_status, [])
        if requested_status not in allowed:
            return f"You can't directly move from {previous_status} to {requested_status}."

    return None


def _category_tree_matches(value, query):
    query = str(query or '').strip().lower()
    if not query:
        return False

    if isinstance(value, str):
        return query in value.lower()

    if isinstance(value, list):
        return any(_category_tree_matches(item, query) for item in value)

    if isinstance(value, dict):
        return any(
            query in str(key).lower() or _category_tree_matches(item, query)
            for key, item in value.items()
        )

    return query in str(value).lower()


def _category_tree_match_paths(value, query, parent_path=''):
    matches = []
    query = str(query or '').strip().lower()

    if isinstance(value, str):
        if query and query in value.lower():
            matches.append(parent_path or value)
        return matches

    if isinstance(value, list):
        for item in value:
            item_label = item if isinstance(item, str) else ''
            item_path = f"{parent_path} > {item_label}".strip(' >') if item_label else parent_path
            matches.extend(_category_tree_match_paths(item, query, item_path))
        return matches

    if isinstance(value, dict):
        for key, item in value.items():
            current_path = f"{parent_path} > {key}".strip(' >')
            if query and query in str(key).lower():
                matches.append(current_path)
            matches.extend(_category_tree_match_paths(item, query, current_path))
        return matches

    text = str(value).strip()
    if text and query in text.lower():
        matches.append(parent_path or text)
    return matches


def _flatten_category_search_results(category, value, query, parent_path=''):
    results = []
    query = str(query or '').strip().lower()
    category_slug = clean_url_segment(category.slug)
    base_url = f"/category/{category_slug}/"

    def normalize_path(path):
        parts = [part.strip() for part in str(path or '').split('>') if part.strip()]
        parts = [part for part in parts if part.lower() != 'default']
        return ' > '.join(parts)

    if isinstance(value, str):
        label = value.strip()
        if label and query in label.lower():
            path = normalize_path(f"{parent_path} > {label}".strip(" >"))
            results.append({
                "type": "subcategory" if parent_path else "category",
                "label": label,
                "name": label,
                "slug": clean_url_segment(label),
                "parent_category": category.name,
                "parent_slug": category.slug,
                "path": path or label,
                "url": f"{base_url}?q={clean_url_segment(label)}",
            })
        return results

    if isinstance(value, list):
        for item in value:
            if isinstance(item, str):
                label = item.strip()
                if label and query in label.lower():
                    path = normalize_path(f"{parent_path} > {label}".strip(" >"))
                    results.append({
                        "type": "subcategory" if parent_path else "category",
                        "label": label,
                        "name": label,
                        "slug": clean_url_segment(label),
                        "parent_category": category.name,
                        "parent_slug": category.slug,
                        "path": path or label,
                        "url": f"{base_url}?q={clean_url_segment(label)}",
                    })
            else:
                results.extend(_flatten_category_search_results(category, item, query, parent_path))
        return results

    if isinstance(value, dict):
        for key, item in value.items():
            key_label = str(key).strip()
            current_path = f"{parent_path} > {key_label}".strip(" >")
            if key_label and query in key_label.lower():
                path = normalize_path(current_path)
                results.append({
                    "type": "subcategory" if parent_path else "category_section",
                    "label": key_label,
                    "name": key_label,
                    "slug": clean_url_segment(key_label),
                    "parent_category": category.name,
                    "parent_slug": category.slug,
                    "path": path or key_label,
                    "url": f"{base_url}?q={clean_url_segment(key_label)}",
                })
            results.extend(_flatten_category_search_results(category, item, query, current_path))
        return results

    return results


def _is_current_article_image_url(article, url_value, request=None):
    if not url_value or not getattr(article, 'image', None):
        return False

    candidates = []
    try:
        candidates.append(article.image.url)
        if request:
            candidates.append(request.build_absolute_uri(article.image.url))
    except Exception:
        pass

    try:
        candidates.append(article.image.storage.url(article.image.name))
    except Exception:
        pass

    normalized_value = str(url_value).split('?', 1)[0].rstrip('/')
    normalized_candidates = {
        str(candidate).split('?', 1)[0].rstrip('/')
        for candidate in candidates
        if candidate
    }
    return normalized_value in normalized_candidates


# ═══════════════════════════════════════════════════════
# CATEGORY VIEWS
# ═══════════════════════════════════════════════════════

@api_view(['GET'])
def category_list(request):
    cache_key = 'categories:all:v3'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)
    now = timezone.now()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    categories = Category.objects.annotate(
        article_count=Count(
            'articles',
            filter=Q(articles__status='published'),
            distinct=True,
        ),
        unique_total_articles=Count(
            'articles',
            filter=Q(articles__status='published'),
            distinct=True,
        ),
        published_this_month=Count(
            'articles',
            filter=Q(
                articles__status='published',
                articles__published_at__gte=start_of_month,
            ),
            distinct=True,
        ),
    )
    serializer = CategorySerializer(categories, many=True)
    cache.set(cache_key, serializer.data, 3600)  # 1 hour
    return Response(serializer.data)


def category_detail_page(request, slug):
    category = get_object_or_404(Category, slug=slug)
    articles = category.articles.filter(status='published').order_by('-created_at')
    paginator = Paginator(articles, 6)
    page_obj = paginator.get_page(request.GET.get('page'))
    return render(request, 'articles/category_detail.html', {
        'category': category,
        'page_obj': page_obj,
    })


@api_view(['POST'])
def contact_query_create(request):
    serializer = ContactQuerySerializer(data=request.data)
    if serializer.is_valid():
        query = serializer.save()
        return Response(
            {
                "message": "Contact query submitted successfully.",
                "id": query.id,
                "status": query.status,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def career_application_create(request):
    serializer = CareerApplicationSerializer(data=request.data)
    if serializer.is_valid():
        application = serializer.save()
        return Response(
            {
                "message": "Career application submitted successfully.",
                "id": application.id,
                "status": application.status,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def job_openings_list(request):
    jobs = JobOpening.objects.filter(is_active=True).order_by('display_order', 'title')
    serializer = JobOpeningSerializer(jobs, many=True)
    return Response({
        "count": jobs.count(),
        "results": serializer.data,
    })

@api_view(['POST'])
def category_create(request):
    serializer = CategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        _invalidate_category_cache()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
def category_update(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    serializer = CategorySerializer(cat, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        _invalidate_category_cache()
        return Response(serializer.data)
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def category_archive(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    cat.status = 'archived'
    cat.save(update_fields=['status'])
    _invalidate_category_cache()
    return Response({'status': 'archived'})


@api_view(['POST'])
def category_restore(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    cat.status = 'active'
    cat.save(update_fields=['status'])
    _invalidate_category_cache()
    return Response({'status': 'active'})


@api_view(['GET'])
def category_posts(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
 
    # select_related + prefetch_related → N+1 queries khatam
    articles = Article.objects.filter(
        categories=cat, status='published'
    ).select_related('author').prefetch_related('categories').order_by('-created_at')[:10]
 
    serializer = ArticleMinSerializer(articles, many=True, context={'request': request})
    return Response({
        'posts': serializer.data,
        'total': articles.count()
    })


# ═══════════════════════════════════════════════════════
# ARTICLE VIEWS
# ═══════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
def newsletters_api(request):
    if request.method == 'GET':
        newsletters = NewsletterCard.objects.all().order_by('-created_at')
        serializer = NewsletterCardSerializer(newsletters, many=True)
        return Response(serializer.data)

    if not request.user.is_authenticated or not request.user.is_staff:
        raise PermissionDenied('Only admin users can create newsletters.')

    serializer = NewsletterCardSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def newsletter_detail_api(request, newsletter_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise PermissionDenied('Only admin users can delete newsletters.')

    newsletter = get_object_or_404(NewsletterCard, pk=newsletter_id)
    newsletter.delete()
    return Response({'status': 'deleted', 'id': newsletter_id})


def _save_article_from_request(request, article=None):
    data  = request.POST
    files = request.FILES
    is_new = article is None
    old_slug = '' if is_new else (article.slug or '')
    old_published_at = None if is_new else article.published_at
    old_updated_at = None if is_new else article.updated_at
    previous_status = None if is_new else article.status
    publish_date_mode = str(data.get('publish_date_mode', 'now') or 'now').strip().lower()
    keep_original_publish_date = publish_date_mode == 'original' and old_published_at is not None
    restore_previous_timestamps = keep_original_publish_date and previous_status != 'published'

    category_ids_raw = data.get('categories', '')
    category_list_raw = data.getlist('categories')

    cat_ids = []
    if len(category_list_raw) > 1:
        for c in category_list_raw:
            for part in str(c).split(','):
                part = part.strip()
                if part:
                    try:
                        cat_ids.append(int(part))
                    except (ValueError, TypeError):
                        pass
    elif category_ids_raw:
        for part in str(category_ids_raw).split(','):
            part = part.strip()
            if part:
                try:
                    cat_ids.append(int(part))
                except (ValueError, TypeError):
                    pass

    primary_category_id = None
    raw_primary_category = str(data.get('primary_category', '')).strip()
    if raw_primary_category:
        try:
            primary_category_id = int(raw_primary_category)
        except (ValueError, TypeError):
            primary_category_id = None

    if cat_ids:
        if primary_category_id not in cat_ids:
            primary_category_id = cat_ids[0]
    else:
        primary_category_id = None

    title    = data.get('title', '').strip()
    subtitle = data.get('subtitle', '').strip()
    content  = data.get('content', '').strip()

    if not title or not content:
        return None, {'error': 'Title aur content required hain'}

    if is_new:
        article = Article(author=request.user)

    article.title    = title
    article.subtitle = subtitle
    article.content  = content

    requested_status = data.get('status', article.status if not is_new else 'draft')
    if previous_status == 'published' and requested_status not in {'archived', 'review'}:
        # Published articles may be sent back to review for editorial changes,
        # but stale editor requests must not silently downgrade them to draft
        # or any unrelated pre-publish state.
        requested_status = 'published'

    status_error = _validate_article_status_change(
        user=request.user,
        previous_status=previous_status,
        requested_status=requested_status,
    )
    if status_error:
        return None, {'error': status_error}

    article.status   = requested_status
    article.priority = int(data.get('priority', article.priority if not is_new else 5))
    article.is_paid  = data.get('is_paid', 'false').lower() in ('true', '1', 'on')

    deadline_val = data.get('deadline', '')
    if deadline_val:
        article.deadline = _parse_ist_datetime(deadline_val)
    else:
        article.deadline = None

    scheduled_at_val = data.get('scheduled_at', '').strip()
    if article.status == 'scheduled':
        if not scheduled_at_val:
            return None, {'error': 'Scheduled publish time is required for scheduled articles.'}

        parsed_scheduled_at = _parse_ist_datetime(scheduled_at_val)
        if parsed_scheduled_at is None:
            return None, {'error': 'Invalid scheduled publish time. Use IST date and time.'}

        if parsed_scheduled_at <= timezone.now():
            return None, {'error': 'Scheduled publish time must be in the future (IST).'}

        article.scheduled_at = parsed_scheduled_at
        article.published_at = None
    elif scheduled_at_val:
        parsed_scheduled_at = _parse_ist_datetime(scheduled_at_val)
        if parsed_scheduled_at is not None:
            article.scheduled_at = parsed_scheduled_at
        else:
            article.scheduled_at = None
    else:
        article.scheduled_at = None

    if article.status == 'published':
        article.scheduled_at = None
        if keep_original_publish_date:
            article.published_at = old_published_at
        elif old_published_at is not None:
            article.published_at = old_published_at
        else:
            article.published_at = timezone.now()

    assigned_id = data.get('assigned_to', '')
    if assigned_id:
        try:
            article.assigned_to_id = int(assigned_id)
        except (ValueError, TypeError):
            article.assigned_to = None
    else:
        article.assigned_to = None

    raw_slug = data.get('slug', '').strip()
    article.slug = slugify(raw_slug.strip('/').split('/')[-1])
    article.canonical_url      = normalize_article_canonical(data.get('canonical_url', ''), article.slug)
    article.meta_title         = _normalize_meta_title(data.get('meta_title', ''))
    article.meta_description   = data.get('meta_description', '').strip()
    article.focus_keyword      = data.get('focus_keyword', '').strip()
    article.secondary_keywords = data.get('secondary_keywords', '').strip()
    article.noindex            = data.get('noindex', 'false').lower() in ('true', '1', 'on')
    article.nofollow           = data.get('nofollow', 'false').lower() in ('true', '1', 'on')
    article.in_sitemap         = data.get('in_sitemap', 'true').lower() in ('true', '1', 'on')

    article.image_alt    = data.get('image_alt', '').strip()
    article.image_source = data.get('image_source', '').strip()
    article.tags         = data.get('tags', '').strip()

    article.author_display_name      = data.get('editor_name',      data.get('author_display_name', '')).strip()
    article.author_display_position  = data.get('editor_position',  data.get('author_display_position', '')).strip()
    article.author_display_bio       = data.get('editor_bio',       data.get('author_display_bio', '')).strip()
    article.author_display_photo     = data.get('editor_photo',     data.get('author_display_photo', '')).strip()
    article.author_display_twitter   = data.get('editor_twitter',   data.get('author_display_twitter', '')).strip()
    article.author_display_linkedin  = data.get('editor_linkedin',  data.get('author_display_linkedin', '')).strip()
    article.author_display_instagram = data.get('editor_instagram', data.get('author_display_instagram', '')).strip()
    article.author_display_facebook  = data.get('editor_facebook',  data.get('author_display_facebook', '')).strip()
    article.author_display_youtube   = data.get('editor_youtube',   data.get('author_display_youtube', '')).strip()
    article.author_display_reddit    = data.get('editor_reddit',    data.get('author_display_reddit', '')).strip()

    articles_count = data.get('editor_articles', data.get('author_display_articles_count', 0))
    try:
        article.author_display_articles_count = int(articles_count) if articles_count else 0
    except (ValueError, TypeError):
        article.author_display_articles_count = 0

    # ── IMAGE UPLOAD + COMPRESS ──
    if 'image' in files and files['image']:
        uploaded_file = files['image']
        try:
            from PIL import Image as PILImage
            import io
            from django.core.files.base import ContentFile

            img = PILImage.open(uploaded_file)

            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")

            if img.width > 1200:
                ratio = 1200 / img.width
                new_height = int(img.height * ratio)
                img = img.resize((1200, new_height), PILImage.LANCZOS)

            output = io.BytesIO()
            img.save(output, format='WEBP', quality=75, optimize=True)
            output.seek(0)

            original_name = _unique_article_image_name(article, uploaded_file.name, '.webp')
            article.image     = ContentFile(output.read(), name=original_name)
            article.image_url = ''

        except Exception:
            original_ext = os.path.splitext(uploaded_file.name or '')[1] or '.img'
            uploaded_file.name = _unique_article_image_name(article, uploaded_file.name, original_ext)
            article.image     = uploaded_file
            article.image_url = ''
    else:
        url_val = data.get('image_url', '').strip()
        if url_val and not url_val.startswith('blob:'):
            if not _is_current_article_image_url(article, url_val, request):
                article.image = None
                article.image_url = url_val
            elif article.image_url:
                article.image_url = ''

    subcategories_raw = data.get('subcategories', '{}')
    try:
        subcategories_dict = json.loads(subcategories_raw)
        article.selected_subcategories = subcategories_dict if isinstance(subcategories_dict, dict) else {}
    except (json.JSONDecodeError, TypeError):
        article.selected_subcategories = {}

    try:
        article.primary_category_id = primary_category_id
        article.save()
    except Exception as e:
        return None, {'error': str(e)}

    if restore_previous_timestamps and old_updated_at is not None:
        Article.objects.filter(pk=article.pk).update(
            published_at=old_published_at,
            updated_at=old_updated_at,
        )
        article.published_at = old_published_at
        article.updated_at = old_updated_at

    if cat_ids:
        article.categories.set(cat_ids)
        if article.primary_category_id != primary_category_id:
            article.primary_category_id = primary_category_id
            article.save(update_fields=['primary_category'])
    elif 'categories' in data:
        article.categories.clear()
        if article.primary_category_id is not None:
            article.primary_category = None
            article.save(update_fields=['primary_category'])

    # Cache invalidate
    _invalidate_article_caches(article, old_slug=old_slug)
    return article, None

@api_view(['GET', 'POST'])
def article_list(request):
    if request.method == "GET":
        category = request.GET.get('category')
        try:
            limit = max(1, min(int(request.GET.get('limit', 10)), 100))
        except (TypeError, ValueError):
            limit = 10
        try:
            page = max(1, int(request.GET.get('page', 1)))
        except (TypeError, ValueError):
            page = 1
        use_full_payload = str(request.GET.get('full', '')).lower() in {'1', 'true', 'yes'}

        cache_key = f"articles:list:v5:{category or 'all'}:{page}:{limit}:{'full' if use_full_payload else 'slim'}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        category_qs = Category.objects.only('id', 'name', 'slug')
        articles = (
            Article.objects.filter(status="published")
            .select_related('author', 'primary_category')
            .prefetch_related(Prefetch('categories', queryset=category_qs))
            .only(
                'id',
                'title',
                'slug',
                'subtitle',
                'image',
                'image_url',
                'image_alt',
                'published_at',
                'created_at',
                'updated_at',
                'primary_category__id',
                'primary_category__name',
                'primary_category__slug',
                'canonical_url',
                'author__username',
                'author__first_name',
                'author__last_name',
                'author_display_name',
            )
            .order_by('-updated_at', '-published_at', '-created_at')
        )
        if category:
            articles = articles.filter(categories__slug=category).distinct()

        total = articles.count()
        start = (page - 1) * limit
        end = start + limit
        serializer_class = ArticleHomepageSerializer if use_full_payload else ArticleListSerializer
        serializer = serializer_class(articles[start:end], many=True, context={'request': request})
        payload = {
            'count': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if limit else 0,
            'has_next': end < total,
            'has_previous': page > 1,
            'results': serializer.data,
        }
        cache.set(cache_key, payload, 300)
        return Response(payload)

    elif request.method == "POST":
        if not request.user.is_authenticated:
            return Response({"error": "Login required"}, status=401)
        article, error = _save_article_from_request(request)
        if error:
            return Response(error, status=400)
        serializer = ArticleSerializer(article, context={'request': request})
        return Response(serializer.data, status=201)

@api_view(['GET'])
def articles_by_state(request):
    state = request.GET.get('state')
 
    # State nahi di → states list return karo (same as before)
    if not state:
        try:
            category = Category.objects.get(slug='state-of-bharat')
            return Response(category.sub_categories)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)
 
    # Cache check
    cache_key = f"articles:state:v2:{state}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)
 
    # select_related + prefetch_related add kiya → N+1 queries band
    articles = Article.objects.filter(
        status='published',
        categories__slug='state-of-bharat',
    ).select_related('author').prefetch_related('categories').order_by('-updated_at', '-published_at', '-created_at')
 
    # Filtering logic bilkul same hai
    filtered = [
        a for a in articles
        if state in (a.selected_subcategories or {}).get('subs', {}).get('3', [])
    ]
 
    serializer = ArticleMinSerializer(filtered, many=True, context={'request': request})
    cache.set(cache_key, serializer.data, 300)  # 5 minute cache
    return Response(serializer.data)


@api_view(['GET'])
def articles_by_state(request):
    state = str(request.GET.get('state') or '').strip()
    try:
        limit = max(1, min(int(request.GET.get('limit', 10)), 100))
    except (TypeError, ValueError):
        limit = 10
    try:
        page = max(1, int(request.GET.get('page', 1)))
    except (TypeError, ValueError):
        page = 1

    try:
        category = Category.objects.get(slug='state-of-bharat')
    except Category.DoesNotExist:
        return Response({"error": "Category not found"}, status=404)

    def article_states(article):
        selected = article.selected_subcategories or {}
        states = selected.get('subs', {}).get('3', [])
        return states if isinstance(states, list) else []

    articles = list(
        Article.objects.filter(
            status='published',
            categories__slug='state-of-bharat',
        )
        .select_related('author', 'primary_category')
        .prefetch_related(Prefetch('categories', queryset=Category.objects.only('id', 'name', 'slug')))
        .only(
            'id',
            'title',
            'slug',
            'subtitle',
            'image',
            'image_url',
            'image_alt',
            'published_at',
            'created_at',
            'updated_at',
            'primary_category__id',
            'primary_category__name',
            'primary_category__slug',
            'selected_subcategories',
            'canonical_url',
            'author__username',
            'author__first_name',
            'author__last_name',
            'author_display_name',
        )
        .order_by('-updated_at', '-published_at', '-created_at')
        .distinct()
    )

    if not state:
        cache_key = "articles:state:index:v3"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        sub_categories = category.sub_categories if isinstance(category.sub_categories, dict) else {}
        configured_states = sub_categories.get('3', [])
        if not isinstance(configured_states, list):
            configured_states = []
        all_states = list(dict.fromkeys([
            *[str(item).strip() for item in configured_states if str(item).strip()],
            *[
                str(item).strip()
                for article in articles
                for item in article_states(article)
                if str(item).strip()
            ],
        ]))
        payload = {
            'count': len(all_states),
            'states': all_states,
            'results': {
                state_name: ArticleListSerializer(
                    [article for article in articles if state_name in article_states(article)][:3],
                    many=True,
                    context={'request': request},
                ).data
                for state_name in all_states
            },
        }
        cache.set(cache_key, payload, 300)
        return Response(payload)

    cache_key = f"articles:state:v3:{state}:{page}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    filtered = [article for article in articles if state in article_states(article)]
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    serializer = ArticleListSerializer(filtered[start:end], many=True, context={'request': request})
    payload = {
        'count': total,
        'page': page,
        'limit': limit,
        'total_pages': (total + limit - 1) // limit if limit else 0,
        'has_next': end < total,
        'has_previous': page > 1,
        'state': state,
        'results': serializer.data,
    }
    cache.set(cache_key, payload, 300)
    return Response(payload)


@api_view(['GET'])
def dashboard_articles(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Login required"}, status=401)
 
    cache_key = f"dashboard:articles:{user.id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)
 
    if user.is_superuser:
        articles = Article.objects.all().order_by('-created_at')[:50]
    else:
        profile = user.profile
        if profile.roles.filter(name="Reporter").exists():
            articles = Article.objects.filter(
                assigned_to=user
            ).order_by('-created_at')[:50]
        elif profile.roles.filter(name="Editor").exists():
            articles = Article.objects.all().order_by('-created_at')[:50]
        else:
            articles = Article.objects.none()

    serializer = ArticleMinSerializer(articles, many=True, context={'request': request})
    cache.set(cache_key, serializer.data, 120) 
    return Response(serializer.data)


@api_view(['GET'])
def dashboard_stats_api(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return Response({"error": "Login required"}, status=401)

    now = timezone.now()
    overdue = Article.objects.filter(
        deadline__lt=now,
        status__in=['draft', 'review', 'fact_check', 'legal', 'approved', 'scheduled'],
    ).exclude(status='published').count()
    draft = Article.objects.filter(status='draft').count()
    review = Article.objects.filter(status__in=['review', 'fact_check', 'legal', 'approved']).count()
    scheduled = Article.objects.filter(status='scheduled').count()
    archived = Article.objects.filter(status='archived').count()
    rejected = Article.objects.filter(status='rejected').count()
    published = Article.objects.filter(status='published').count()

    return Response({
        'total_articles': Article.objects.count(),
        'published': published,
        'drafts': draft,
        'scheduled': scheduled,
        'archived': archived,
        'rejected': rejected,
        'paid': Article.objects.filter(is_paid=True).count(),
        'overdue': overdue,
        'authors': User.objects.filter(articles_authored__isnull=False).distinct().count(),
        'categories': Category.objects.count(),
        'in_pipeline': draft + review + scheduled,
    })


def update_article_status(request, article):
    if not request.user.is_superuser:
        raise PermissionDenied("Only admin can publish articles.")
    article.status = "published"
    article.published_at = timezone.now()
    article.save()


@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
def article_detail(request, pk):
    try:
        article = Article.objects.get(pk=pk)
    except Article.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if request.method == "GET":
        serializer = ArticleSerializer(article, context={'request': request})
        return Response(serializer.data)

    elif request.method == "POST":
        try:
            update_article_status(request, article)
            serializer = ArticleSerializer(article, context={'request': request})
            return Response({"message": "Article published successfully", "data": serializer.data})
        except PermissionDenied as e:
            return Response({"error": str(e)}, status=403)
        except Exception as e:
            return Response({"error": f"Failed to publish: {str(e)}"}, status=400)

    elif request.method in ["PUT", "PATCH"]:
        if not request.user.is_authenticated:
            return Response({"error": "Login required"}, status=401)
        updated_article, error = _save_article_from_request(request, article=article)
        if error:
            return Response(error, status=400)
        serializer = ArticleSerializer(updated_article, context={'request': request})
        return Response(serializer.data)

    elif request.method == "DELETE":
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({"error": "Login required"}, status=401)
        article.delete()
        return Response(status=204)

from django.shortcuts import render, get_object_or_404
from newsapp.models import Article
from newsapp.seo_direct import MetaEngine, SchemaEngine

def normalize_article_canonical(raw_value, slug):
    canonical = (raw_value or '').strip()
    if not canonical or not slug:
        return canonical

    legacy_url = f"https://news4bharat.com/news/{slug}"
    legacy_article_url = f"https://news4bharat.com/article/{slug}"
    if canonical.rstrip('/') == legacy_url.rstrip('/') or canonical.rstrip('/') == legacy_article_url.rstrip('/'):
        return ""
    return canonical

def article_detail_page(request, slug, category_slug=None):
    article_qs = Article.objects.filter(
        status="published",
    ).filter(
        Q(slug=slug) | Q(slug__endswith=f"/{slug}")
    )
    article = article_qs.filter(slug=slug).first() or article_qs.first()
    if article is None:
        raise Http404("No Article matches the given query.")

    first_cat = article.primary_category or article.categories.first()
    canonical_category = clean_url_segment(first_cat.slug) if first_cat else None
    if category_slug and canonical_category and category_slug != canonical_category:
        return redirect(article_path(article), permanent=True)

    meta = MetaEngine.for_article(article)
    schemas = [
        SchemaEngine.news_article(article),
        SchemaEngine.breadcrumb(article),
    ]

    seo_head = MetaEngine.render_head(meta, schemas)

    return render(request, 'article.html', {
        'article': article,
        'seo_head': seo_head
    })


# ═══════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════

def dashboard_view(request):
    if not request.user.is_staff:
        return redirect("admin:login")

    now            = timezone.now()
    start_of_month = now.replace(day=1)
    week_ago       = now - timedelta(days=7)

    total_articles      = Article.objects.count()
    published_articles  = Article.objects.filter(status='published').count()
    review_articles     = Article.objects.filter(status='review').count()
    fact_check_articles = Article.objects.filter(status='fact_check').count()
    draft_articles      = Article.objects.filter(status='draft').count()
    scheduled_articles  = Article.objects.filter(status='scheduled').count()
    archived_articles   = Article.objects.filter(status='archived').count()
    rejected_articles   = Article.objects.filter(status='rejected').count()
    paid_articles       = Article.objects.filter(is_paid=True).count()

    overdue_articles = Article.objects.filter(
        deadline__lt=now
    ).exclude(status='published').count()

    published_this_week = Article.objects.filter(
        status='published', published_at__gte=week_ago
    ).count()

    published_this_month = Article.objects.filter(
        status='published', published_at__gte=start_of_month
    ).count()

    total_authors    = User.objects.filter(articles_authored__isnull=False).distinct().count()
    total_categories = Category.objects.count()

    recent_articles = Article.objects.prefetch_related('categories').select_related(
        'author', 'assigned_to'
    ).order_by('-created_at')[:8]

    category_data = (
        Article.objects
        .values('categories__name')
        .annotate(article_count=Count('id'))
        .exclude(categories__name__isnull=True)
        .order_by('-article_count')
    )
    max_count = max((c['article_count'] for c in category_data), default=1)
    category_stats = [
        {
            'name':          c['categories__name'],
            'article_count': c['article_count'],
            'pct':           round((c['article_count'] / max_count) * 100, 1)
        }
        for c in category_data
    ]

    monthly_data = (
        Article.objects
        .filter(status='published', published_at__isnull=False)
        .annotate(month=TruncMonth('published_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    monthly_labels = [m['month'].strftime("%b %Y") for m in monthly_data]
    monthly_pub    = [m['count'] for m in monthly_data]

    monthly_draft_qs = (
        Article.objects
        .filter(status='draft')
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    monthly_draft = [m['count'] for m in monthly_draft_qs]

    donut_data = [
        published_articles, draft_articles, review_articles,
        archived_articles, rejected_articles, fact_check_articles,
    ]

    try:
        pending_fact_checks  = FactCheck.objects.filter(status='pending').count()
        verified_fact_checks = FactCheck.objects.filter(status='verified').count()
        issues_fact_checks   = FactCheck.objects.filter(status='issues_found').count()
    except Exception:
        pending_fact_checks = verified_fact_checks = issues_fact_checks = 0

    recent_logs = ArticleWorkflowLog.objects.select_related(
        'article', 'changed_by'
    ).order_by('-changed_at')[:6]

    try:
        top_reporters = ReporterPerformance.objects.select_related(
            'reporter'
        ).order_by('-published_articles')[:5]
    except Exception:
        top_reporters = []

    try:
        hero_slot = HomepageSlot.objects.filter(slot_name='hero').select_related(
            'article', 'overlay_article_1', 'overlay_article_2', 'overlay_article_3',
        ).first()
    except Exception:
        hero_slot = None

    try:
        latest_slot = HomepageSlot.objects.filter(slot_name='latest_news').select_related(
            'category_filter'
        ).first()
    except Exception:
        latest_slot = None

    latest_manual_articles = []
    if latest_slot and latest_slot.mode == 'manual':
        try:
            latest_manual_articles = list(_ordered_slot_manual_articles(latest_slot))
        except Exception:
            latest_manual_articles = []

    try:
        ad_slot = HomepageSlot.objects.filter(slot_name='ad_banner').first()
    except Exception:
        ad_slot = None

    try:
        saved_banners = {
            banner.placement: banner
            for banner in HomepageAdBanner.objects.filter(
                placement__in=[placement for placement, _label in HomepageAdBanner.PLACEMENT_CHOICES]
            )
        }
        ad_banner_rows = [
            {
                'placement': placement,
                'label': label,
                'width': HomepageAdBanner.PLACEMENT_DIMENSIONS[placement][0],
                'height': HomepageAdBanner.PLACEMENT_DIMENSIONS[placement][1],
                'breakpoint': HomepageAdBanner.PLACEMENT_BREAKPOINTS[placement],
                'banner': saved_banners.get(placement),
            }
            for placement, label in HomepageAdBanner.PLACEMENT_CHOICES
        ]
    except Exception:
        ad_banner_rows = []

    published_articles_for_picker = (
        Article.objects.filter(status='published')
        .select_related('author')
        .prefetch_related('categories')
        .order_by('-updated_at', '-published_at', '-created_at')[:100]
    )

    categories = Category.objects.filter(status='active').order_by('name')

    context = {
        "total_articles":                total_articles,
        "published_articles":            published_articles,
        "review_articles":               review_articles,
        "fact_check_articles":           fact_check_articles,
        "draft_articles":                draft_articles,
        "scheduled_articles":            scheduled_articles,
        "archived_articles":             archived_articles,
        "rejected_articles":             rejected_articles,
        "paid_articles":                 paid_articles,
        "overdue_articles":              overdue_articles,
        "published_this_week":           published_this_week,
        "published_this_month":          published_this_month,
        "total_authors":                 total_authors,
        "total_categories":              total_categories,
        "recent_articles":               recent_articles,
        "recent_logs":                   recent_logs,
        "top_reporters":                 top_reporters,
        "category_stats":                category_stats,
        "monthly_labels_json":           json.dumps(monthly_labels),
        "monthly_pub_json":              json.dumps(monthly_pub),
        "monthly_draft_json":            json.dumps(monthly_draft),
        "donut_data_json":               json.dumps(donut_data),
        "pending_fact_checks":           pending_fact_checks,
        "verified_fact_checks":          verified_fact_checks,
        "issues_fact_checks":            issues_fact_checks,
        "hero_slot":                     hero_slot,
        "latest_slot":                   latest_slot,
        "latest_manual_articles":        latest_manual_articles,
        "ad_slot":                       ad_slot,
        "ad_banner_rows":                ad_banner_rows,
        "ad_page_choices":               HomepageAdBanner.PAGE_CHOICES,
        "published_articles_for_picker": published_articles_for_picker,
        "categories":                    categories,
        "mp3_categories":                categories,
    }
    return render(request, "admin/index.html", context)


# ═══════════════════════════════════════════════════════
# HOMEPAGE CONTROL VIEWS
# ═══════════════════════════════════════════════════════

def _get_or_create_slot(slot_name):
    slot, _ = HomepageSlot.objects.get_or_create(
        slot_name=slot_name,
        defaults={'mode': 'auto', 'is_active': True}
    )
    return slot


def _normalize_latest_manual_ids(raw_ids, max_count):
    if not isinstance(raw_ids, list):
        return []

    cleaned = []
    for raw_id in raw_ids:
        try:
            article_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        if article_id not in cleaned:
            cleaned.append(article_id)
        if len(cleaned) >= max_count:
            break
    return cleaned


def _ordered_slot_manual_articles(slot):
    manual_order = [
        article_id for article_id in (getattr(slot, 'manual_order', []) or [])
        if isinstance(article_id, int)
    ]
    if not manual_order:
        return Article.objects.none()

    preserved_order = Case(
        *[When(pk=article_id, then=position) for position, article_id in enumerate(manual_order)],
        output_field=IntegerField(),
    )
    return (
        Article.objects.filter(pk__in=manual_order, status='published')
        .select_related('author', 'primary_category')
        .prefetch_related('categories')
        .order_by(preserved_order)
    )


def _latest_news_queryset(slot):
    count = max(1, min(int(getattr(slot, 'display_count', 4) or 4), 12))
    if slot.mode == 'manual':
        return _ordered_slot_manual_articles(slot)[:count]

    queryset = (
        Article.objects.filter(status='published')
        .select_related('author', 'primary_category')
        .prefetch_related('categories')
    )
    if getattr(slot, 'category_filter_id', None):
        queryset = queryset.filter(categories=slot.category_filter_id)
    return queryset.order_by('-updated_at', '-published_at', '-created_at')[:count]


def _normalize_ad_target_pages(raw_pages):
    allowed_pages = {page for page, _label in HomepageAdBanner.PAGE_CHOICES}
    if isinstance(raw_pages, str):
        try:
            parsed = json.loads(raw_pages)
            raw_pages = parsed if isinstance(parsed, list) else [raw_pages]
        except json.JSONDecodeError:
            raw_pages = [raw_pages]
    if not isinstance(raw_pages, list):
        raw_pages = []

    pages = [
        page for page in dict.fromkeys(str(page).strip() for page in raw_pages)
        if page in allowed_pages
    ]
    return pages or list(HomepageAdBanner.DEFAULT_TARGET_PAGES)


@staff_member_required
@require_POST
def update_hero_slot(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    slot      = _get_or_create_slot('hero')
    slot.mode = 'manual'

    main_id = data.get('main_article_id')
    if main_id:
        try:
            slot.article = Article.objects.get(pk=main_id, status='published')
        except Article.DoesNotExist:
            return JsonResponse({'error': 'Main article not found'}, status=404)
    else:
        slot.article = None

    ov1 = data.get('overlay_article_1')
    slot.overlay_article_1 = Article.objects.filter(pk=ov1, status='published').first() if ov1 else None

    ov2 = data.get('overlay_article_2')
    slot.overlay_article_2 = Article.objects.filter(pk=ov2, status='published').first() if ov2 else None

    ov3 = data.get('overlay_article_3')
    slot.overlay_article_3 = Article.objects.filter(pk=ov3, status='published').first() if ov3 else None

    slot.save()
    return JsonResponse({'status': 'saved', 'slot': 'hero'})


@require_GET
def homepage_hero_current(request):
    slot = (
        HomepageSlot.objects.filter(slot_name='hero')
        .select_related('article', 'overlay_article_1', 'overlay_article_2', 'overlay_article_3')
        .first()
    )
    if not slot:
        slot = _get_or_create_slot('hero')

    def serialize_article(article):
        if not article:
            return None
        return ArticleHomepageSerializer(article, context={'request': request}).data

    return JsonResponse({
        'slot': 'hero',
        'mode': getattr(slot, 'mode', 'manual') or 'manual',
        'main_article_id': getattr(slot, 'article_id', None),
        'overlay_article_1_id': getattr(slot, 'overlay_article_1_id', None),
        'overlay_article_2_id': getattr(slot, 'overlay_article_2_id', None),
        'overlay_article_3_id': getattr(slot, 'overlay_article_3_id', None),
        'main_article': serialize_article(getattr(slot, 'article', None)),
        'overlay_article_1': serialize_article(getattr(slot, 'overlay_article_1', None)),
        'overlay_article_2': serialize_article(getattr(slot, 'overlay_article_2', None)),
        'overlay_article_3': serialize_article(getattr(slot, 'overlay_article_3', None)),
    })


@staff_member_required
@require_POST
def update_latest_news_slot(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    slot      = _get_or_create_slot('latest_news')
    mode      = data.get('mode', 'auto')
    slot.mode = mode

    try:
        slot.display_count = max(1, min(int(data.get('display_count', 4)), 12))
    except (ValueError, TypeError):
        slot.display_count = 4

    cat_id = data.get('category_id')
    slot.category_filter = Category.objects.filter(pk=cat_id).first() if cat_id else None

    manual_ids = _normalize_latest_manual_ids(data.get('manual_ids', []), slot.display_count)
    slot.manual_order = manual_ids if mode == 'manual' else []
    slot.save()

    if mode == 'manual':
        slot.manual_articles.set(
            Article.objects.filter(pk__in=manual_ids, status='published')
        )
    else:
        slot.manual_articles.clear()

    return JsonResponse({'status': 'saved', 'slot': 'latest_news'})


@require_GET
def homepage_latest_news_current(request):
    slot = (
        HomepageSlot.objects.filter(slot_name='latest_news')
        .select_related('category_filter')
        .first()
    )
    if not slot:
        slot = _get_or_create_slot('latest_news')

    articles = _latest_news_queryset(slot)
    serializer = ArticleHomepageSerializer(articles, many=True, context={'request': request})
    return JsonResponse({
        'slot': 'latest_news',
        'mode': slot.mode,
        'display_count': slot.display_count,
        'category': (
            {
                'id': slot.category_filter_id,
                'name': slot.category_filter.name,
                'slug': slot.category_filter.slug,
            }
            if slot.category_filter_id else None
        ),
        'manual_order': list(getattr(slot, 'manual_order', []) or []),
        'articles': serializer.data,
    })


def _serialize_homepage_ad_banner(request, banner):
    image_url = request.build_absolute_uri(banner.image.url) if banner.image else banner.image_url
    target_pages = _normalize_ad_target_pages(getattr(banner, 'target_pages', []))
    target_page_labels = dict(HomepageAdBanner.PAGE_CHOICES)
    item = {
        'placement': banner.placement,
        'size': banner.size,
        'width': banner.width,
        'height': banner.height,
        'breakpoint': banner.breakpoint,
        'target_pages': target_pages,
        'target_page_labels': [target_page_labels.get(page, page) for page in target_pages],
        'is_active': bool(banner.is_active and image_url),
        'stored_is_active': bool(banner.is_active),
        'image_url': image_url or '',
        'ad_image_url': image_url or '',
        'image': image_url or '',
        'ad_image': image_url or '',
        'link_url': banner.link_url or '',
        'alt': banner.alt or 'Sponsored advertisement',
        'updated_at': banner.updated_at.isoformat() if banner.updated_at else None,
    }
    return item


def _empty_homepage_ad_banner(placement):
    width, height = HomepageAdBanner.PLACEMENT_DIMENSIONS.get(placement, (None, None))
    target_pages = list(HomepageAdBanner.DEFAULT_TARGET_PAGES)
    target_page_labels = dict(HomepageAdBanner.PAGE_CHOICES)
    return {
        'placement': placement,
        'size': f'{width}x{height}' if width and height else '',
        'width': width,
        'height': height,
        'breakpoint': HomepageAdBanner.PLACEMENT_BREAKPOINTS.get(placement, ''),
        'target_pages': target_pages,
        'target_page_labels': [target_page_labels.get(page, page) for page in target_pages],
        'is_active': False,
        'stored_is_active': False,
        'image_url': '',
        'ad_image_url': '',
        'image': '',
        'ad_image': '',
        'link_url': '',
        'alt': 'Sponsored advertisement',
        'updated_at': None,
    }


def _homepage_ad_banner_payload(request, banners, placements=None):
    banner_by_placement = {banner.placement: banner for banner in banners}
    placement_list = placements or [placement for placement, _label in HomepageAdBanner.PLACEMENT_CHOICES]
    items = [
        _serialize_homepage_ad_banner(request, banner_by_placement[placement])
        if placement in banner_by_placement else _empty_homepage_ad_banner(placement)
        for placement in placement_list
    ]
    return {
        'banners': items,
        'by_placement': {item['placement']: item for item in items},
    }


def _validate_remote_ad_image_url(image_url, placement):
    expected_width, expected_height = HomepageAdBanner.PLACEMENT_DIMENSIONS[placement]
    try:
        response = requests.get(
            image_url,
            timeout=8,
            headers={'User-Agent': 'News4BharatAdmin/1.0'},
        )
        response.raise_for_status()
        width, height = get_image_dimensions(ContentFile(response.content))
    except Exception:
        return f'Could not verify {placement} image URL. Please upload the image file or use a reachable URL.'

    if width != expected_width or height != expected_height:
        return f'{placement} URL image must be exactly {expected_width}x{expected_height}px, got {width}x{height}px.'
    return ''


def _validate_ad_banner_for_save(banner, *, validate_image=False):
    if validate_image:
        banner.full_clean()
    else:
        banner.clean_fields(exclude=['image'])
        banner.validate_unique()
        banner.validate_constraints()


@staff_member_required
@require_POST
def update_ad_slot(request):
    slot             = _get_or_create_slot('ad_banner')
    slot.mode        = 'manual'
    slot.is_active   = request.POST.get('is_active', 'false').lower() in ('true', '1', 'on')
    slot.save()

    saved_banners = []
    errors = {}
    has_placement_payload = any(
        request.FILES.get(f'ad_image_{placement}')
        or f'ad_image_url_{placement}' in request.POST
        or f'ad_link_url_{placement}' in request.POST
        or f'ad_alt_{placement}' in request.POST
        or f'is_active_{placement}' in request.POST
        for placement, _label in HomepageAdBanner.PLACEMENT_CHOICES
    )

    if has_placement_payload:
        for placement, _label in HomepageAdBanner.PLACEMENT_CHOICES:
            banner, _created = HomepageAdBanner.objects.get_or_create(placement=placement)
            previous_image_name = banner.image.name if banner.image else ''
            banner.link_url = request.POST.get(f'ad_link_url_{placement}', '').strip()
            banner.alt = request.POST.get(f'ad_alt_{placement}', 'Sponsored advertisement').strip() or 'Sponsored advertisement'
            banner.is_active = request.POST.get(f'is_active_{placement}', 'false').lower() in ('true', '1', 'on')
            banner.target_pages = _normalize_ad_target_pages(
                request.POST.get(f'ad_pages_{placement}', '')
            )

            upload = request.FILES.get(f'ad_image_{placement}')
            image_url = request.POST.get(f'ad_image_url_{placement}', '').strip()
            media_changed = False

            if upload:
                banner.image = upload
                banner.image_url = ''
                media_changed = True
            elif image_url and not image_url.startswith('blob:'):
                if image_url != (banner.image_url or '') or banner.image:
                    url_error = _validate_remote_ad_image_url(image_url, placement)
                    if url_error:
                        errors[placement] = [url_error]
                        continue
                    banner.image = None
                    banner.image_url = image_url
                    media_changed = True

            try:
                if media_changed or (banner.image and banner.image.name != previous_image_name):
                    _validate_ad_banner_for_save(banner, validate_image=True)
                else:
                    _validate_ad_banner_for_save(banner, validate_image=False)
                banner.save()
                saved_banners.append(banner)
            except ValidationError as exc:
                errors[placement] = exc.message_dict if hasattr(exc, 'message_dict') else exc.messages

    if not saved_banners and ('ad_image' in request.FILES or request.POST.get('ad_image_url')):
        legacy_banner, _created = HomepageAdBanner.objects.get_or_create(placement=HomepageAdBanner.HOME_TOP)
        legacy_has_error = False
        previous_image_name = legacy_banner.image.name if legacy_banner.image else ''
        media_changed = False
        legacy_banner.link_url = request.POST.get('ad_link_url', '').strip()
        legacy_banner.alt = request.POST.get('alt', 'Sponsored advertisement').strip() or 'Sponsored advertisement'
        legacy_banner.is_active = slot.is_active
        legacy_banner.target_pages = _normalize_ad_target_pages(request.POST.get('ad_pages', ''))
        if request.FILES.get('ad_image'):
            legacy_banner.image = request.FILES['ad_image']
            legacy_banner.image_url = ''
            media_changed = True
        else:
            legacy_url = request.POST.get('ad_image_url', '').strip()
            if legacy_url and not legacy_url.startswith('blob:'):
                if legacy_url != (legacy_banner.image_url or '') or legacy_banner.image:
                    url_error = _validate_remote_ad_image_url(legacy_url, HomepageAdBanner.HOME_TOP)
                    if url_error:
                        errors[HomepageAdBanner.HOME_TOP] = [url_error]
                        legacy_has_error = True
                    else:
                        legacy_banner.image = None
                        legacy_banner.image_url = legacy_url
                        media_changed = True
        if not legacy_has_error:
            try:
                if media_changed or (legacy_banner.image and legacy_banner.image.name != previous_image_name):
                    _validate_ad_banner_for_save(legacy_banner, validate_image=True)
                else:
                    _validate_ad_banner_for_save(legacy_banner, validate_image=False)
                legacy_banner.save()
                saved_banners.append(legacy_banner)
            except ValidationError as exc:
                errors[HomepageAdBanner.HOME_TOP] = exc.message_dict if hasattr(exc, 'message_dict') else exc.messages

    if errors:
        return JsonResponse({'error': 'Invalid banner size', 'errors': errors}, status=400)

    banners = HomepageAdBanner.objects.filter(placement__in=[placement for placement, _label in HomepageAdBanner.PLACEMENT_CHOICES])
    payload = _homepage_ad_banner_payload(request, banners)
    first_active = next((item for item in payload['banners'] if item['is_active']), None)
    return JsonResponse({
        'status': 'saved',
        'slot': 'ad_banner',
        'is_active': bool(first_active),
        'image_url': first_active['image_url'] if first_active else '',
        'link_url': first_active['link_url'] if first_active else '',
        'banners': payload['banners'],
        'by_placement': payload['by_placement'],
        'updated_at': slot.updated_at.isoformat() if slot.updated_at else None,
    })


# ═══════════════════════════════════════════════════════
@require_GET
def homepage_ad_banner(request):
    requested_placement = (request.GET.get('placement') or '').strip()
    requested_page = (request.GET.get('page') or '').strip()
    allowed_pages = {page for page, _label in HomepageAdBanner.PAGE_CHOICES}
    requested_page = requested_page if requested_page in allowed_pages else ''
    allowed_placements = [placement for placement, _label in HomepageAdBanner.PLACEMENT_CHOICES]

    if requested_placement:
        if requested_placement not in allowed_placements:
            return JsonResponse({'placement': requested_placement, 'is_active': False})
        banner = HomepageAdBanner.objects.filter(placement=requested_placement).first()
        item = _serialize_homepage_ad_banner(request, banner) if banner else _empty_homepage_ad_banner(requested_placement)
        if requested_page and requested_page not in item['target_pages']:
            return JsonResponse({'placement': requested_placement, 'page': requested_page, 'is_active': False})
        if not item['is_active']:
            return JsonResponse({'placement': requested_placement, 'is_active': False})
        return JsonResponse({
            'placement': item['placement'],
            'page': requested_page,
            'is_active': True,
            'image_url': item['image_url'],
            'ad_image_url': item['ad_image_url'],
            'image': item['image'],
            'ad_image': item['ad_image'],
            'link_url': item['link_url'],
            'alt': item['alt'],
            'target_pages': item['target_pages'],
        })

    requested_size = (request.GET.get('size') or '').strip()
    placements = allowed_placements
    if requested_size:
        placements = [
            placement for placement in allowed_placements
            if f"{HomepageAdBanner.PLACEMENT_DIMENSIONS[placement][0]}x{HomepageAdBanner.PLACEMENT_DIMENSIONS[placement][1]}" == requested_size
        ] or allowed_placements

    banners = HomepageAdBanner.objects.filter(placement__in=placements)
    payload = _homepage_ad_banner_payload(request, banners, placements=placements)
    if requested_page:
        filtered_items = [
            item for item in payload['banners']
            if requested_page in item['target_pages']
        ]
        payload = {
            'banners': filtered_items,
            'by_placement': {item['placement']: item for item in filtered_items},
        }
    first_active = next((item for item in payload['banners'] if item['is_active']), None)

    return JsonResponse({
        'page': requested_page,
        'is_active': bool(first_active),
        'has_slot': bool(payload['banners']),
        'stored_is_active': any(item['stored_is_active'] for item in payload['banners']),
        'image_url': first_active['image_url'] if first_active else '',
        'ad_image_url': first_active['ad_image_url'] if first_active else '',
        'image': first_active['image'] if first_active else '',
        'ad_image': first_active['ad_image'] if first_active else '',
        'link_url': first_active['link_url'] if first_active else '',
        'placement': first_active['placement'] if first_active else '',
        'size': first_active['size'] if first_active else '',
        'width': first_active['width'] if first_active else None,
        'height': first_active['height'] if first_active else None,
        'alt': first_active['alt'] if first_active else 'Sponsored advertisement',
        'banners': payload['banners'],
        'by_placement': payload['by_placement'],
        'updated_at': first_active['updated_at'] if first_active else None,
    })


# WEATHER, METALS, MARKET
# ═══════════════════════════════════════════════════════

@api_view(['GET'])
def weather_api(request):
    city = (request.GET.get("city") or "Delhi").strip() or "Delhi"
    cache_key = f"weather:{city.strip().lower() or 'delhi'}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)
    api_key = getattr(settings, "OPENWEATHER_API_KEY", "").strip()
    if not api_key:
        return Response({"error": "OPENWEATHER_API_KEY is not configured"}, status=503)
    url    = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": api_key, "units": "metric"}
    try:
        response = external_get(url, params=params, timeout=5)
        data = response.json()
        if response.status_code != 200:
            message = data.get("message") if isinstance(data, dict) else None
            if response.status_code in (401, 403):
                return Response({"error": "OpenWeather API key is invalid or unauthorized"}, status=503)
            return Response({"error": message or "City not found"}, status=400)
        payload = {
            "city":        city,
            "temperature": data["main"]["temp"],
            "feels_like":  data["main"]["feels_like"],
            "humidity":    data["main"]["humidity"],
            "description": data["weather"][0]["description"],
            "icon":        data["weather"][0]["icon"]
        }
        cache.set(cache_key, payload, 600)
        return Response(payload)
    except Exception:
        return Response({"error": "Weather service unavailable"}, status=500)


@api_view(['GET'])
def metal_ticker(request):
    cache_key = "metal_ticker:latest"
    force_refresh = request.GET.get("refresh") in {"1", "true", "yes"}
    cached = cache.get(cache_key)
    cached_is_valid = (
        isinstance(cached, dict)
        and is_valid_metal_price("gold", cached.get("gold", {}).get("price"))
        and is_valid_metal_price("silver", cached.get("silver", {}).get("price"))
    )
    cached_is_error = isinstance(cached, dict) and bool(cached.get("error"))
    if cached_is_valid and not force_refresh:
        return Response(cached)
    if cached_is_error and not force_refresh:
        return Response(cached)
    if cached is not None and not cached_is_valid:
        cache.delete(cache_key)
    refresh_error = None
    gold = latest_valid_metal_rate("gold")
    silver = latest_valid_metal_rate("silver")
    if gold and silver and not force_refresh:
        payload = {
            "gold": {
                "price":          gold.price,
                "change":         gold.change,
                "percent_change": gold.percent_change,
                "trend":          gold.trend
            },
            "silver": {
                "price":          silver.price,
                "change":         silver.change,
                "percent_change": silver.percent_change,
                "trend":          silver.trend
            },
            "stale": True,
        }
        cache.set(cache_key, payload, 600)
        return Response(payload)
    if not force_refresh:
        payload = {
            "gold": {"price": 0, "change": 0, "percent_change": 0, "trend": "neutral"},
            "silver": {"price": 0, "change": 0, "percent_change": 0, "trend": "neutral"},
            "error": "Metal refresh is paused. Use refresh=1 to fetch new rates.",
        }
        cache.set(cache_key, payload, 600)
        return Response(payload)
    try:
        fetch_and_store_metal_rates(force_refresh=force_refresh)
    except Exception as exc:
        refresh_error = str(exc)
    gold = latest_valid_metal_rate("gold")
    silver = latest_valid_metal_rate("silver")
    payload = {
        "gold": {
            "price":          gold.price if gold else 0,
            "change":         gold.change if gold else 0,
            "percent_change": gold.percent_change if gold else 0,
            "trend":          gold.trend if gold else "neutral"
        },
        "silver": {
            "price":          silver.price if silver else 0,
            "change":         silver.change if silver else 0,
            "percent_change": silver.percent_change if silver else 0,
            "trend":          silver.trend if silver else "neutral"
        }
    }
    if refresh_error and not (gold and silver):
        payload["error"] = refresh_error
    cache.set(cache_key, payload, 600)
    return Response(payload)

from .utils import external_get, fetch_and_store_metal_rates, fetch_live_index_data, is_valid_metal_price, latest_valid_metal_rate


@api_view(['GET'])
def update_metal_rates(request):
    fetch_and_store_metal_rates(force_refresh=True)
    cache.delete("metal_ticker:latest")
    return Response({"message": "Rates updated successfully"})


@api_view(['GET'])
def market_indices(request):
    force_refresh = request.GET.get("refresh") in {"1", "true", "yes"}
    nifty_symbols = getattr(
        settings,
        'TWELVE_DATA_NIFTY_SYMBOLS',
        [{"symbol": "NIFTYBEES", "exchange": "NSE"}],
    )
    sensex_symbols = getattr(
        settings,
        'TWELVE_DATA_SENSEX_SYMBOLS',
        [{"symbol": "SENSEXETF", "exchange": "NSE"}],
    )
    usd_inr_symbols = getattr(
        settings,
        'TWELVE_DATA_USDINR_SYMBOLS',
        ["USD/INR", "USDINR"],
    )
    try:
        nifty = fetch_live_index_data(nifty_symbols, cache_prefix='market_index:nifty', force_refresh=force_refresh)
    except Exception as exc:
        nifty = {
            "error": str(exc),
            "price": 0,
            "change": 0,
            "percent_change": 0,
            "trend": "neutral",
        }

    try:
        sensex = fetch_live_index_data(sensex_symbols, cache_prefix='market_index:sensex', force_refresh=force_refresh)
    except Exception as exc:
        sensex = {
            "error": str(exc),
            "price": 0,
            "change": 0,
            "percent_change": 0,
            "trend": "neutral",
        }

    try:
        usd_inr = fetch_live_index_data(usd_inr_symbols, cache_prefix='market_index:usd_inr', force_refresh=force_refresh)
    except Exception as exc:
        usd_inr = {
            "error": str(exc),
            "price": 0,
            "change": 0,
            "percent_change": 0,
            "trend": "neutral",
        }

    return Response({"nifty": nifty, "sensex": sensex, "usd_inr": usd_inr})


# ═══════════════════════════════════════════════════════
# DATE & TIME API
# ═══════════════════════════════════════════════════════

@require_GET
def datetime_api(request):
    now = timezone.localtime(timezone.now())
    return JsonResponse({
        "date":       now.strftime("%A, %d %B %Y"),
        "date_short": now.strftime("%d %b %Y"),
        "time":       now.strftime("%I:%M %p"),
        "time_24":    now.strftime("%H:%M"),
        "day":        now.strftime("%A"),
        "day_short":  now.strftime("%a"),
        "month":      now.strftime("%B"),
        "year":       now.year,
        "timestamp":  now.isoformat(),
    })


# ═══════════════════════════════════════════════════════
# SEARCH API
# ═══════════════════════════════════════════════════════

def _format_article(article, request=None, highlight=None):
    content_text = article.content or ''
    excerpt = content_text[:120] + '...' if len(content_text) > 120 else content_text

    img_url = None
    if article.image:
        try:
            base  = request.build_absolute_uri(article.image.url) if request else article.image.url
            mtime = article.image.storage.get_modified_time(article.image.name)
            img_url = f"{base}?v={int(mtime.timestamp())}"
        except Exception:
            img_url = request.build_absolute_uri(article.image.url) if request else article.image.url

    first_cat = article.primary_category or article.categories.first()

    author_name = ''
    if article.author_display_name and article.author_display_name.strip():
        author_name = article.author_display_name.strip()
    elif article.author:
        author_name = article.author.get_full_name() or article.author.username

    return {
        "id":           article.id,
        "title":        article.title,
        "slug":         getattr(article, 'slug', str(article.id)),
        "category":     first_cat.name if first_cat else None,
        "category_id":  first_cat.id   if first_cat else None,
        "primary_category": {
            "id": first_cat.id,
            "name": first_cat.name,
            "slug": first_cat.slug,
        } if first_cat else None,
        "categories":   list(article.categories.values('id', 'name')),
        "author":       author_name,
        "status":       article.status,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "created_at":   article.created_at.isoformat()   if article.created_at   else None,
        "canonical_url": normalized_canonical(article, article_url(article)),
        "public_url":    article_url(article),
        "image":        img_url,
        "image_alt":    article.image_alt or '',
        "image_source": article.image_source or '',
        "excerpt":      highlight or excerpt,
        "is_paid":      getattr(article, 'is_paid', False),
        "tags":         [t.strip() for t in article.tags.split(',') if t.strip()] if article.tags else [],
    }


def _search_elasticsearch(query, status, limit, request=None):
    from .documents import ArticleDocument
    from elasticsearch_dsl import Q as ESQ
    es_query = ArticleDocument.search()
    if status != 'all':
        es_query = es_query.filter('term', status=status)
    es_query = es_query.query(
        ESQ('bool', should=[
            ESQ('multi_match', query=query,
                fields=['title^5', 'slug^4', 'title.autocomplete^3', 'categories.name^3', 'author.username^2', 'content'],
                type='best_fields', operator='or'),
            ESQ('multi_match', query=query,
                fields=['title.fuzzy^3', 'slug^3', 'content.fuzzy'], fuzziness='AUTO', prefix_length=1),
            ESQ('match', **{'title.autocomplete': {'query': query, 'boost': 2}}),
            ESQ('match', **{'slug': {'query': query, 'boost': 3}}),
        ], minimum_should_match=1)
    )
    es_query = es_query.highlight('title', 'content', fragment_size=120,
                                  pre_tags=['<mark>'], post_tags=['</mark>'])
    es_query = es_query[:limit]
    response = es_query.execute()
    articles_data = []
    for hit in response:
        try:
            article = Article.objects.prefetch_related('categories').select_related('author').get(id=hit.meta.id)
            highlight_text = None
            if hasattr(hit.meta, 'highlight'):
                if hasattr(hit.meta.highlight, 'content'):
                    highlight_text = ' ... '.join(hit.meta.highlight.content)
                elif hasattr(hit.meta.highlight, 'title'):
                    highlight_text = hit.meta.highlight.title[0]
            articles_data.append(_format_article(article, request, highlight_text))
        except Exception:
            continue
    return articles_data


def _search_django_orm(query, status, limit, request=None):
    qs = Article.objects.filter(
        Q(title__icontains=query) |
        Q(slug__icontains=query)
        # content, author, categories hatao
    ).select_related('author').prefetch_related('categories').distinct()
    
    if status != 'all':
        qs = qs.filter(status=status)
    
    return [_format_article(a, request) for a in qs.order_by('-published_at', '-created_at')[:limit]]


@require_GET
def search_api(request):
    query    = request.GET.get('q', '').strip()
    type_    = request.GET.get('type', 'all')
    limit    = min(int(request.GET.get('limit', 8)), 20)
    s_status = request.GET.get('status', 'published')

    if len(query) < 2:
        return JsonResponse({"query": query, "total": 0, "articles": [], "categories": [],
                             "error": "Query must be at least 2 characters"}, status=400)

    articles_data   = []
    categories_data = []
    search_engine   = "orm"

    if type_ in ('all', 'article'):
        try:
            articles_data = _search_elasticsearch(query, s_status, limit, request)
            search_engine = "elasticsearch"
        except Exception:
            articles_data = _search_django_orm(query, s_status, limit, request)
            search_engine = "orm_fallback"

    if type_ in ('all', 'category'):
        for cat in Category.objects.filter(Q(name__icontains=query)).annotate(
            article_count=Count('articles', filter=Q(articles__status='published'))
        ).order_by('-article_count')[:limit]:
            categories_data.append({
                "id":            cat.id,
                "name":          cat.name,
                "slug":          getattr(cat, 'slug', str(cat.id)),
                "article_count": cat.article_count,
            })

    return JsonResponse({
        "query":         query,
        "total":         len(articles_data) + len(categories_data),
        "articles":      articles_data,
        "categories":    categories_data,
        "search_engine": search_engine,
    })


@require_GET
def live_category_search_api(request):
    query = request.GET.get('q', '').strip()
    query_lower = query.lower()
    limit = min(int(request.GET.get('limit', 10)), 20)

    if len(query) < 2:
        return JsonResponse({
            "query": query,
            "total": 0,
            "categories": [],
            "error": "Query must be at least 2 characters"
        }, status=400)

    categories_qs = (
        Category.objects.filter(status='active')
        .annotate(article_count=Count('articles', filter=Q(articles__status='published')))
        .order_by('-article_count', 'name')
    )

    matching_categories = []
    flattened_results = []
    seen_result_keys = set()
    for cat in categories_qs:
        sub_tree = _normalize_category_tree(cat.sub_categories)
        matches_self = query_lower in (cat.name or '').lower() or query_lower in (cat.slug or '').lower()
        matches_tree = _category_tree_matches(sub_tree, query)
        if matches_self or matches_tree:
            matching_categories.append((cat, sub_tree))
            if matches_self:
                result = {
                    "type": "category",
                    "label": cat.name,
                    "name": cat.name,
                    "slug": cat.slug,
                    "parent_category": None,
                    "parent_slug": None,
                    "path": cat.name,
                    "url": f"/category/{clean_url_segment(cat.slug)}/",
                    "article_count": cat.article_count,
                    "description": cat.description or "",
                }
                key = ("category", cat.slug)
                if key not in seen_result_keys:
                    seen_result_keys.add(key)
                    flattened_results.append(result)

            for item in _flatten_category_search_results(cat, sub_tree, query):
                key = (item.get("type"), item.get("path"))
                if key in seen_result_keys:
                    continue
                seen_result_keys.add(key)
                item["article_count"] = cat.article_count
                item["description"] = cat.description or ""
                flattened_results.append(item)

        if len(flattened_results) >= limit and len(matching_categories) >= limit:
            break

    categories_data = [
        {
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description or "",
            "article_count": cat.article_count,
            "url": f"/category/{clean_url_segment(cat.slug)}/",
            "sub_categories": sub_tree if isinstance(sub_tree, (dict, list)) else {},
            "matched_sub_categories": _category_tree_match_paths(sub_tree, query),
        }
        for cat, sub_tree in matching_categories
    ]

    return JsonResponse({
        "query": query,
        "total": len(flattened_results[:limit]),
        "results": flattened_results[:limit],
        "categories": categories_data,
    })


@require_GET
def live_article_search_api(request):
    query = request.GET.get('q', '').strip()
    limit = min(int(request.GET.get('limit', 10)), 20)

    if len(query) < 2:
        return JsonResponse({
            "query": query,
            "total": 0,
            "articles": [],
            "error": "Query must be at least 2 characters"
        }, status=400)

    try:
        articles_data = _search_elasticsearch(query, 'published', limit, request)
        search_engine = "elasticsearch"
    except Exception:
        articles_data = _search_django_orm(query, 'published', limit, request)
        search_engine = "orm_fallback"

    return JsonResponse({
        "query": query,
        "total": len(articles_data),
        "articles": articles_data,
        "search_engine": search_engine,
    })


# ═══════════════════════════════════════════════════════
# LOGIN / LOGOUT / CREDENTIALS
# ═══════════════════════════════════════════════════════

MAX_ATTEMPTS_PER_IP = 10
RATE_LIMIT_WINDOW   = 10  # minutes


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def is_rate_limited(profile, ip):
    now        = timezone.now()
    cutoff     = (now - timedelta(minutes=RATE_LIMIT_WINDOW)).isoformat()
    log        = profile.login_attempts_ip
    timestamps = [t for t in log.get(ip, []) if t > cutoff]
    log[ip]    = timestamps
    profile.login_attempts_ip = log
    profile.save(update_fields=['login_attempts_ip'])
    return len(timestamps) >= MAX_ATTEMPTS_PER_IP


def record_ip_attempt(profile, ip):
    now = timezone.now().isoformat()
    log = profile.login_attempts_ip
    log.setdefault(ip, []).append(now)
    profile.login_attempts_ip = log
    profile.save(update_fields=['login_attempts_ip'])


def send_lockout_email(user, lock_minutes=30):
    if not user.email:
        return
    send_mail(
        subject="⚠️ News4Bharat — Account Locked",
        message=(
            f"Hello {user.get_full_name() or user.username},\n\n"
            f"Your account has been locked for {lock_minutes} minutes due to "
            f"multiple failed login attempts.\n\n"
            f"If this was not you, please contact the administrator immediately.\n\n"
            f"— News4Bharat Security Team"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_regeneration_email(user, new_uid, new_pass):
    if not user.email:
        return
    send_mail(
        subject="🔐 News4Bharat — Your New Login Credentials",
        message=(
            f"Hello {user.get_full_name() or user.username},\n\n"
            f"Due to too many failed login attempts, your old credentials have been "
            f"permanently deleted and new ones have been generated.\n\n"
            f"  New User ID  : {new_uid}\n"
            f"  New Password : {new_pass}\n\n"
            f"Please log in with these new credentials immediately.\n\n"
            f"— News4Bharat Security Team"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def secure_login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method != 'POST':
        return render(request, 'newsapp/login.html')

    username    = request.POST.get('username', '').strip()
    password    = request.POST.get('password', '').strip()
    remember_me = request.POST.get('remember_me') == 'on'
    totp_token  = request.POST.get('totp_token', '').strip()
    ip          = get_client_ip(request)
    ua          = request.META.get('HTTP_USER_AGENT', '')

    try:
        user_obj = User.objects.get(username=username)
        profile  = user_obj.profile
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        LoginAttemptLog.objects.create(username_tried=username, ip_address=ip,
                                       user_agent=ua, status='wrong_pass', note='Username not found')
        messages.error(request, "Invalid username or password.")
        return render(request, 'newsapp/login.html')

    if is_rate_limited(profile, ip):
        LoginAttemptLog.objects.create(user=user_obj, username_tried=username, ip_address=ip,
                                       user_agent=ua, status='rate_limit',
                                       note=f'IP {ip} exceeded {MAX_ATTEMPTS_PER_IP} attempts')
        messages.error(request, f"Too many attempts from your network. Please wait {RATE_LIMIT_WINDOW} minutes.")
        return render(request, 'newsapp/login.html')

    if profile.is_locked:
        LoginAttemptLog.objects.create(user=user_obj, username_tried=username, ip_address=ip,
                                       user_agent=ua, status='locked',
                                       note=f'Account locked until {profile.locked_until}')
        messages.error(request, f"🔒 Account locked. Try again in {profile.lock_remaining_minutes} minute(s).")
        return render(request, 'newsapp/login.html')

    user = authenticate(request, username=username, password=password)

    if user is None:
        record_ip_attempt(profile, ip)
        result = profile.record_failed_attempt()
        if result == 'regenerated':
            send_regeneration_email(user_obj, profile.user_id, profile.plain_password)
            LoginAttemptLog.objects.create(user=user_obj, username_tried=username, ip_address=ip,
                                           user_agent=ua, status='regenerated',
                                           note='6 total failed attempts — credentials regenerated')
            messages.error(request, "🚨 Too many failed attempts. New credentials sent to your email.")
        elif result == 'locked':
            send_lockout_email(user_obj)
            LoginAttemptLog.objects.create(user=user_obj, username_tried=username, ip_address=ip,
                                           user_agent=ua, status='locked',
                                           note='3 failed attempts — account locked 30 min')
            messages.error(request, "🔒 Account locked for 30 minutes. A notification has been sent to your email.")
        else:
            remaining = 3 - profile.failed_attempts
            LoginAttemptLog.objects.create(user=user_obj, username_tried=username, ip_address=ip,
                                           user_agent=ua, status='wrong_pass',
                                           note=f'Attempt {profile.failed_attempts}/3')
            messages.error(request, f"❌ Wrong password. {remaining} attempt(s) remaining before lockout.")
        return render(request, 'newsapp/login.html')

    if profile.is_2fa_enabled:
        if not totp_token:
            return render(request, 'newsapp/login.html', {
                'show_2fa': True, 'username': username, 'password': password,
            })
        if not profile.verify_totp(totp_token):
            LoginAttemptLog.objects.create(user=user_obj, username_tried=username, ip_address=ip,
                                           user_agent=ua, status='2fa_fail', note='Wrong TOTP token')
            messages.error(request, "❌ Invalid 2FA code. Please try again.")
            return render(request, 'newsapp/login.html', {
                'show_2fa': True, 'username': username, 'password': password,
            })

    profile.reset_failed_attempts()
    if remember_me:
        request.session.set_expiry(60 * 60 * 24 * 7)
        profile.remember_me = True
    else:
        request.session.set_expiry(60 * profile.session_timeout_min)
        profile.remember_me = False
    profile.save(update_fields=['remember_me'])

    login(request, user)
    record_ip_attempt(profile, ip)
    LoginAttemptLog.objects.create(user=user_obj, username_tried=username,
                                   ip_address=ip, user_agent=ua, status='success')
    return redirect('dashboard')


@login_required
def secure_logout_view(request):
    pause_attendance(request.user)
    logout(request)
    messages.success(request, "You have been logged out successfully.")
    return redirect('login')


@login_required
def my_credentials(request):
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        profile = None
    return render(request, 'newsapp/my_credentials.html', {'profile': profile})


# ═══════════════════════════════════════════════════════
# AI VIEWS  - OpenAI gpt-5.4-mini
# ═══════════════════════════════════════════════════════

def _get_openai_client():
    """Returns a configured OpenAI client. Raises ValueError if key not set."""
    api_key = getattr(settings, "OPENAI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set in .env file")
    return OpenAI(api_key=api_key)


def _generate_ai_text(prompt, *, max_output_tokens=1200):
    client = _get_openai_client()
    response = client.responses.create(
        model=getattr(settings, "OPENAI_MODEL", "gpt-5.4-mini"),
        input=prompt,
        max_output_tokens=max_output_tokens,
    )
    return (response.output_text or "").strip()


def _openai_error_response(e):
    """Converts OpenAI exceptions to a JsonResponse."""
    err = str(e).lower()
    if "api_key" in err or "api key" in err or "authentication" in err:
        return JsonResponse({"error": "Invalid OpenAI API key. Check OPENAI_API_KEY in .env"}, status=401)
    if "quota" in err or "rate" in err or "limit" in err:
        return JsonResponse({"error": "OpenAI rate limit exceeded. Please wait a moment and retry."}, status=429)
    return JsonResponse({"error": f"OpenAI error: {str(e)}"}, status=503)


_SENTENCE_RE = re.compile(r"[^.!?\n]+(?:[.!?]+|$)")
_WORD_RE = re.compile(r"[A-Za-z']+")
_AI_GENERIC_PHRASES = [
    "in recent memory",
    "in recent years",
    "plays a key role",
    "plays a crucial role",
    "it remains to be seen",
    "underscores the importance",
    "highlights the importance",
    "stands as a testament",
    "offers a glimpse",
    "serves as a reminder",
    "is worth noting",
    "from this perspective",
    "at the same time",
    "in simple terms",
]
_AI_TRANSITIONS = {
    "however",
    "moreover",
    "furthermore",
    "additionally",
    "meanwhile",
    "overall",
    "therefore",
    "consequently",
    "notably",
}


def _collect_sentences(content):
    sentences = []
    for match in _SENTENCE_RE.finditer(content or ""):
        original = match.group(0)
        stripped = original.strip()
        if len(stripped) < 30:
            continue
        start_offset = original.find(stripped)
        start = match.start() + max(start_offset, 0)
        end = start + len(stripped)
        sentences.append(
            {
                "start": start,
                "end": end,
                "text": stripped,
            }
        )
    return sentences


def _estimate_ai_likeness(content):
    text = str(content or "").strip()
    if not text:
        return 0, "Content is empty."

    sentences = [item["text"] for item in _collect_sentences(text)]
    if not sentences:
        sentences = [segment.strip() for segment in re.split(r"[\n]+", text) if segment.strip()]

    lower_text = text.lower()
    words = _WORD_RE.findall(text)
    word_count = len(words)
    sentence_word_counts = [len(_WORD_RE.findall(sentence)) for sentence in sentences if sentence]
    sentence_count = len(sentence_word_counts)

    score = 12
    notes = []

    generic_hits = sum(lower_text.count(phrase) for phrase in _AI_GENERIC_PHRASES)
    if generic_hits:
        score += min(24, generic_hits * 5)
        notes.append("some generic phrasing")

    transition_hits = 0
    repeated_starters = {}
    for sentence in sentences:
        starter_match = re.match(r"\s*([A-Za-z']+)", sentence)
        if not starter_match:
            continue
        starter = starter_match.group(1).lower()
        repeated_starters[starter] = repeated_starters.get(starter, 0) + 1
        if starter in _AI_TRANSITIONS:
            transition_hits += 1
    if transition_hits:
        score += min(10, transition_hits * 2)
        notes.append("heavy transition-led flow")

    repeated_starter_hits = sum(count - 1 for count in repeated_starters.values() if count >= 3)
    if repeated_starter_hits:
        score += min(10, repeated_starter_hits * 2)
        notes.append("repetitive sentence openings")

    if sentence_word_counts:
        avg_len = sum(sentence_word_counts) / len(sentence_word_counts)
        if avg_len >= 30:
            score += 16
            notes.append("long sentence rhythm")
        elif avg_len >= 24:
            score += 10
            notes.append("slightly over-extended sentences")

        if len(sentence_word_counts) >= 4:
            variance = sum((count - avg_len) ** 2 for count in sentence_word_counts) / len(sentence_word_counts)
            std_dev = variance ** 0.5
            if std_dev < 5:
                score += 10
                notes.append("very even sentence cadence")
            elif std_dev < 7:
                score += 5
                notes.append("slightly uniform sentence cadence")

        long_sentences = sum(1 for count in sentence_word_counts if count >= 32)
        if long_sentences >= 2:
            score += min(12, long_sentences * 3)
            notes.append("multiple heavy sentences")

    if word_count >= 220 and text.count("\n\n") <= 1:
        score += 8
        notes.append("dense block structure")

    repeated_phrases = 0
    trigrams = {}
    normalized_words = [word.lower() for word in words]
    for index in range(len(normalized_words) - 2):
        trigram = " ".join(normalized_words[index:index + 3])
        trigrams[trigram] = trigrams.get(trigram, 0) + 1
    repeated_phrases = sum(count - 1 for count in trigrams.values() if count >= 3)
    if repeated_phrases:
        score += min(10, repeated_phrases * 2)
        notes.append("noticeable phrase repetition")

    score = max(0, min(100, int(round(score))))

    if score <= 20:
        summary = "This already reads fairly natural and human."
    elif score <= 40:
        summary = "This reads mostly natural, with a few lines that still sound templated."
    elif score <= 60:
        summary = "This has a mixed tone, with several lines that still feel AI-polished."
    elif score <= 80:
        summary = "This still sounds noticeably AI-shaped in rhythm and phrasing."
    else:
        summary = "This reads heavily AI-shaped right now and needs stronger rewriting."

    if notes:
        summary = f"{summary} Main signals: {', '.join(notes[:2])}."

    return score, summary


def _index_exact_sentence_suggestions(content, raw_suggestions, default_reason):
    sentences = _collect_sentences(content)
    indexed = []
    used_starts = set()

    for item in raw_suggestions:
        if not isinstance(item, dict):
            continue

        original = str(item.get("original", "")).strip()
        suggestion = str(item.get("suggestion", "")).strip()
        reason = str(item.get("reason", "")).strip()
        if not original or not suggestion or original == suggestion:
            continue

        match_sentence = next(
            (
                sentence
                for sentence in sentences
                if sentence["text"] == original and sentence["start"] not in used_starts
            ),
            None,
        )
        if not match_sentence:
            continue

        used_starts.add(match_sentence["start"])
        indexed.append(
            {
                "start": match_sentence["start"],
                "end": match_sentence["end"],
                "original": original,
                "suggestion": suggestion,
                "reason": reason or default_reason,
            }
        )

    return indexed


@staff_member_required
@require_POST
def ai_humanize_article(request):
    """Review AI-sounding copy and return sentence-level humanization suggestions."""
    try:
        data = json.loads(request.body)
        content = data.get("content", "").strip()
        analyze_only = bool(data.get("analyze_only"))
        if not content:
            return JsonResponse({"error": "No content provided"}, status=400)

        ai_score, summary = _estimate_ai_likeness(content)

        if analyze_only:
            return JsonResponse(
                {
                    "ai_score": ai_score,
                    "summary": summary,
                    "suggestions": [],
                    "count": 0,
                }
            )

        prompt = (
            "You are a senior newsroom editor reviewing article copy that may sound AI-generated. "
            "The user will provide plain article text.\n\n"
            "Return ONLY valid JSON in this exact shape:\n"
            '{"suggestions":[{"original":"exact sentence from article","suggestion":"more natural rewrite of that same sentence","reason":"short reason"}]}\n\n'
            "Rules:\n"
            "- Include at most 10 suggestions\n"
            "- Each original must be copied exactly from the article\n"
            "- Prioritize the highest-impact sentences first so one review pass gives the strongest improvement\n"
            "- Suggest only sentences that genuinely sound robotic, repetitive, generic, overly polished, or unnatural\n"
            "- Keep meaning, facts, names, dates, quotes, and claims unchanged\n"
            "- Do not rewrite the full article\n"
            "- Do not suggest changes for sentences that already sound natural\n"
            "- Rewrite suggestions should sound sharper, more natural, and more newsroom-like without becoming casual\n"
            "- Be aggressive about improving robotic wording while preserving facts and editorial meaning\n"
            "- Do not return markdown or any extra commentary\n\n"
            f"Article:\n{content[:7000]}"
        )
        raw = _generate_ai_text(prompt, max_output_tokens=2200)
        raw = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(raw)

        raw_suggestions = parsed.get("suggestions", []) if isinstance(parsed, dict) else []

        indexed = _index_exact_sentence_suggestions(
            content,
            raw_suggestions,
            "Sounds more natural",
        )

        return JsonResponse(
            {
                "ai_score": ai_score,
                "summary": summary or "Review the suggested lines and apply only the ones you want.",
                "suggestions": indexed[:10],
                "count": len(indexed[:10]),
            }
        )

    except (json.JSONDecodeError, ValueError) as e:
        return JsonResponse({"error": f"Could not parse AI response: {str(e)}"}, status=500)
    except Exception as e:
        return _openai_error_response(e)


@staff_member_required
@require_POST
def ai_grammar_check(request):
    """Fix grammar, punctuation, sentence structure with OpenAI."""
    try:
        data    = json.loads(request.body)
        content = data.get("content", "").strip()
        if not content:
            return JsonResponse({"error": "No content provided"}, status=400)

        prompt = (
            "You are a professional news editor specializing in grammar correction. "
            "The user will give you HTML article content. "
            "Fix ALL grammar mistakes, punctuation errors, tense consistency, "
            "subject-verb agreement, article usage (a/an/the), preposition usage, "
            "and sentence clarity issues.\n\n"
            "STRICT RULES:\n"
            "- Preserve ALL HTML tags exactly as they are (do not add, remove, or modify tags)\n"
            "- Fix ONLY grammar and punctuation, not spelling\n"
            "- Do NOT change factual content, names, numbers, or dates\n"
            "- Do NOT restructure paragraphs\n"
            "- Return ONLY the corrected HTML, nothing else — no explanation, no preamble\n\n"
            f"HTML article content:\n{content}"
        )
        corrected = _generate_ai_text(prompt, max_output_tokens=2200)

        if corrected.startswith("```"):
            parts     = corrected.split("```")
            corrected = parts[1] if len(parts) >= 2 else corrected.lstrip("`")
            if corrected.startswith("html"):
                corrected = corrected[4:]
            corrected = corrected.strip()

        return JsonResponse({"corrected": corrected})

    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=503)
    except Exception as e:
        return _openai_error_response(e)


@staff_member_required
@require_POST
def ai_sentence_suggestions(request):
    """Suggest improved sentence rewrites without rewriting the whole article."""
    try:
        data = json.loads(request.body)
        content = data.get("content", "").strip()
        if not content:
            return JsonResponse({"error": "No content provided"}, status=400)

        if not _collect_sentences(content):
            return JsonResponse({"suggestions": [], "count": 0})

        prompt = (
            "You are a professional news editor. "
            "Review the article and suggest only the sentences that would clearly benefit "
            "from a readability, grammar, or clarity rewrite.\n\n"
            "Return ONLY valid JSON with this shape:\n"
            '{"suggestions":[{"original":"exact sentence from article","suggestion":"improved sentence","reason":"short reason"}]}\n\n'
            "Rules:\n"
            "- Use the exact original sentence text from the article\n"
            "- Suggest at most 5 sentences\n"
            "- Do not include sentences that are already fine\n"
            "- Keep the meaning and facts unchanged\n"
            "- Keep reasons very short\n\n"
            f"Article:\n{content[:5000]}"
        )
        raw = _generate_ai_text(prompt, max_output_tokens=1400)
        raw = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(raw)
        raw_suggestions = parsed.get("suggestions", []) if isinstance(parsed, dict) else []

        indexed = _index_exact_sentence_suggestions(
            content,
            raw_suggestions,
            "Improves clarity",
        )

        return JsonResponse({"suggestions": indexed[:5], "count": len(indexed[:5])})

    except (json.JSONDecodeError, ValueError) as e:
        return JsonResponse({"error": f"Could not parse AI response: {str(e)}"}, status=500)
    except Exception as e:
        return _openai_error_response(e)


@staff_member_required
@require_POST
def ai_plagiarism_check(request):
    """Plagiarism / originality check with OpenAI."""
    try:
        data = json.loads(request.body)
        text = data.get("text", "").strip()
        if not text or len(text) < 30:
            return JsonResponse({"error": "Content too short for plagiarism check"}, status=400)

        prompt = (
            "You are a plagiarism detection assistant. "
            "Analyze the text and estimate its originality/plagiarism score.\n"
            "Respond ONLY in valid JSON (no markdown, no backticks, no extra text):\n"
            '{"score":<0-100>,"level":"<low|medium|high>",'
            '"label":"<Original|Mostly Original|Partially Copied|Likely Plagiarized>",'
            '"analysis":"<2-3 lines>","tips":"<1 short tip>"}\n'
            "Score guide: 0-20=low plagiarism (original), 21-60=medium, 61-100=high plagiarism.\n\n"
            f"Text to check:\n{text[:3000]}"
        )
        raw = _generate_ai_text(prompt, max_output_tokens=600)
        raw      = raw.replace("```json", "").replace("```", "").strip()
        result   = json.loads(raw)
        return JsonResponse(result)

    except (json.JSONDecodeError, ValueError) as e:
        return JsonResponse({"error": f"Could not parse AI response: {str(e)}"}, status=500)
    except Exception as e:
        return _openai_error_response(e)


@staff_member_required
@require_POST
def ai_seo_keywords(request):
    """Suggest SEO keywords with OpenAI."""
    try:
        data    = json.loads(request.body)
        title   = data.get("title", "").strip()
        content = data.get("content", "").strip()
        if not title and not content:
            return JsonResponse({"error": "No title or content provided"}, status=400)

        prompt = (
            "You are an SEO expert for an Indian news website.\n"
            "Suggest 10 best SEO keywords for this article.\n"
            "Mix short (1-2 words) and long-tail (3-4 words) phrases.\n"
            "Focus on what Indian readers search for.\n"
            "Return ONLY a valid JSON array of strings — no markdown, no explanation.\n"
            'Example: ["keyword one", "keyword two", "long tail phrase here"]\n\n'
            f"Title: {title}\n"
            f"Content: {content[:1000]}"
        )
        raw = _generate_ai_text(prompt, max_output_tokens=500)
        raw      = raw.replace("```json", "").replace("```", "").strip()
        keywords = json.loads(raw)
        if not isinstance(keywords, list):
            keywords = []
        return JsonResponse({"keywords": keywords[:12]})

    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"keywords": [], "error": "Could not parse AI response"}, status=200)
    except Exception as e:
        return _openai_error_response(e)


# ═══════════════════════════════════════════════════════
# SETTINGS API
# ═══════════════════════════════════════════════════════

@staff_member_required
@require_POST
def save_tag_creation_perm(request):
    try:
        data       = json.loads(request.body)
        permission = data.get('permission', 'editor')
        if permission not in ('superuser', 'editor', 'reporter'):
            return JsonResponse({'error': 'Invalid permission value'}, status=400)
        try:
            from .models import SiteSettings
            settings_obj, _ = SiteSettings.objects.get_or_create(pk=1)
            settings_obj.tag_create_perm = permission
            settings_obj.save()
        except Exception:
            pass
        return JsonResponse({'status': 'saved', 'permission': permission})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ═══════════════════════════════════════════════════════
# MEDIA VIEWS
# ═══════════════════════════════════════════════════════

@staff_member_required
def media_photos_api(request):
    articles = Article.objects.exclude(image__isnull=True).exclude(image__exact='').order_by('-id')
    items = []
    for article in articles:
        try:
            items.append({
                'url':        request.build_absolute_uri(article.image.url),
                'name':       article.title,
                'article_id': article.id,
            })
        except Exception:
            pass
    return JsonResponse({'items': items})


@staff_member_required
def media_videos_api(request):
    return JsonResponse({'items': []})


# ═══════════════════════════════════════════════════════
# INBOX VIEWS
# ═══════════════════════════════════════════════════════

@staff_member_required
def inbox_view(request):
    staff_users = User.objects.filter(is_staff=True).exclude(pk=request.user.pk).select_related('profile')
    for u in staff_users:
        try:
            u.online_status = u.profile.is_online()
        except Exception:
            u.online_status = False

    conversations = Conversation.objects.filter(
        conversationmember__user=request.user
    ).prefetch_related(
        'members', 'messages', 'messages__sender',
    ).order_by('-updated_at').distinct()

    conv_id             = request.GET.get("conv")
    active_conversation = None
    conv_messages       = []

    if conv_id:
        try:
            active_conversation = conversations.get(id=conv_id)
        except Conversation.DoesNotExist:
            active_conversation = None

    if not active_conversation and conversations.exists():
        active_conversation = conversations.first()

    if active_conversation:
        conv_messages = active_conversation.messages.select_related("sender").order_by("created_at")

    staff_users_data = [
        {
            'id': u.id,
            'name': u.get_full_name() or u.username,
            'role': 'Superuser' if u.is_superuser else 'Staff',
            'color': '#6264a7',
            'online': bool(getattr(u, 'online_status', False)),
        }
        for u in staff_users
    ]

    conversations_data = []
    for conv in conversations:
        member_ids = list(conv.members.values_list('id', flat=True))
        other_member_ids = [member_id for member_id in member_ids if member_id != request.user.id]
        messages_data = [
            {
                'from': msg.sender_id,
                'text': msg.text or '',
                'time': timezone.localtime(msg.created_at).strftime('%H:%M'),
            }
            for msg in conv.messages.all().order_by('created_at')
        ]
        conversations_data.append({
            'id': conv.id,
            'type': conv.conv_type,
            'name': conv.name or '',
            'userId': other_member_ids[0] if conv.conv_type == 'private' and other_member_ids else None,
            'members': member_ids,
            'unread': 0,
            'messages': messages_data,
        })

    return render(request, 'admin/inbox.html', {
        'title':               'Inbox',
        'staff_users':         staff_users,
        'conversations':       conversations,
        'active_conversation': active_conversation,
        'messages':            conv_messages,
        'staff_users_json':    json.dumps(staff_users_data),
        'conversations_json':  json.dumps(conversations_data),
    })


@staff_member_required
def new_chat(request):
    users = User.objects.filter(is_staff=True).exclude(id=request.user.id).order_by('first_name', 'username')
    return render(request, 'admin/new_chat.html', {'title': 'New Chat', 'all_users': users})


@staff_member_required
def start_conversation(request, user_id):
    other_user = get_object_or_404(User, id=user_id)
    existing   = Conversation.objects.filter(
        conv_type='private', conversationmember__user=request.user
    ).filter(conversationmember__user=other_user).first()

    if existing:
        return redirect(f"{reverse('admin_inbox')}?conv={existing.id}")

    conv = Conversation.objects.create(conv_type='private')
    ConversationMember.objects.create(conversation=conv, user=request.user)
    ConversationMember.objects.create(conversation=conv, user=other_user)
    return redirect(f"{reverse('admin_inbox')}?conv={conv.id}")


@staff_member_required
@require_POST
def send_message(request):
    conv_id = request.POST.get("conversation_id")
    text    = request.POST.get("text", "").strip()

    if not conv_id or not text:
        return JsonResponse({"error": "Missing data"}, status=400)

    try:
        conv = Conversation.objects.get(id=conv_id)
    except Conversation.DoesNotExist:
        return JsonResponse({"error": "Conversation not found"}, status=404)

    if not ConversationMember.objects.filter(conversation=conv, user=request.user).exists():
        return JsonResponse({"error": "Not a member"}, status=403)

    msg = Message.objects.create(
        conversation=conv, sender=request.user,
        receiver=None, text=text, message_type='text',
    )
    conv.updated_at = timezone.now()
    conv.save(update_fields=["updated_at"])

    for member in conv.members.exclude(id=request.user.id):
        Notification.objects.create(
            user=member, notif_type="message", title="New Message",
            message=f"{request.user.get_full_name() or request.user.username} sent a message",
            icon="💬", action_url="/admin/inbox/",
        )

    return JsonResponse({"status": "ok", "msg_id": msg.id, "time": msg.created_at.strftime("%H:%M")})


@staff_member_required
@require_POST
def create_group(request):
    name       = request.POST.get('name', '').strip()
    member_ids = request.POST.getlist('member_ids')

    if not name or len(member_ids) < 2:
        return JsonResponse({'error': 'Group name aur kam se kam 2 members chahiye'}, status=400)

    conv = Conversation.objects.create(conv_type='group', name=name)
    ConversationMember.objects.create(conversation=conv, user=request.user)

    for uid in member_ids:
        try:
            u = User.objects.get(id=int(uid))
            ConversationMember.objects.get_or_create(conversation=conv, user=u)
        except (User.DoesNotExist, ValueError):
            pass

    return JsonResponse({'ok': True, 'redirect': f"{reverse('admin_inbox')}?conv={conv.id}"})


# ═══════════════════════════════════════════════════════
# NOTIFICATIONS VIEW
# ═══════════════════════════════════════════════════════

@staff_member_required
def notifications_view(request):
    notifications = Notification.objects.filter(
        user=request.user, is_archived=False
    ).order_by('-created_at')

    archived_notifications = Notification.objects.filter(
        user=request.user, is_archived=True
    ).order_by('-created_at')

    unread_notifications = notifications.filter(is_read=False).count()

    unread_messages = Message.objects.filter(
        conversation__conversationmember__user=request.user
    ).exclude(sender=request.user).filter(is_read=False).count()

    notifications_today = Notification.objects.filter(
        user=request.user, created_at__date=timezone.now().date()
    ).count()

    return render(request, 'admin/notifications.html', {
        'title':                  'Notifications',
        'notifications':          notifications,
        'archived_notifications': archived_notifications,
        'unread_notifications':   unread_notifications,
        'unread_messages':        unread_messages,
        'notifications_today':    notifications_today,
    })


@login_required
def mark_notification_read(request, id):
    if request.method == "POST":
        try:
            notif         = Notification.objects.get(id=id, user=request.user)
            notif.is_read = True
            notif.save()
            return JsonResponse({"status": "read"})
        except Notification.DoesNotExist:
            return JsonResponse({"error": "not found"}, status=404)


@login_required
def archive_notification(request, id):
    if request.method == "POST":
        try:
            notif             = Notification.objects.get(id=id, user=request.user)
            notif.is_archived = True
            notif.is_read     = True
            notif.save()
            return JsonResponse({"status": "archived"})
        except Notification.DoesNotExist:
            return JsonResponse({"error": "not found"}, status=404)


@login_required
def unarchive_notification(request, id):
    if request.method == "POST":
        try:
            notif             = Notification.objects.get(id=id, user=request.user)
            notif.is_archived = False
            notif.save()
            return JsonResponse({"status": "restored"})
        except Notification.DoesNotExist:
            return JsonResponse({"error": "not found"}, status=404)


@login_required
def mark_all_notifications_read(request):
    if request.method == "POST":
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return JsonResponse({"status": "all_read"})
    return JsonResponse({"error": "method not allowed"}, status=405)


@staff_member_required
def notification_status_api(request):
    attendance_snapshot = get_attendance_snapshot(request.user)
    unread_notifications_qs = Notification.objects.filter(
        user=request.user,
        is_archived=False,
        is_read=False,
    )
    unread_messages_qs = Message.objects.filter(
        conversation__conversationmember__user=request.user
    ).exclude(sender=request.user).filter(is_read=False)

    latest_unread = unread_notifications_qs.order_by('-created_at', '-id').first()

    return JsonResponse({
        "unread_notifications": unread_notifications_qs.count(),
        "unread_messages": unread_messages_qs.count(),
        "latest_unread_notification_id": latest_unread.id if latest_unread else None,
        "attendance": {
            "is_active": attendance_snapshot["is_active"],
            "display_seconds": attendance_snapshot["display_seconds"],
            "started_at": attendance_snapshot["started_at"].isoformat() if attendance_snapshot["started_at"] else None,
            "last_activity_at": attendance_snapshot["last_activity_at"].isoformat() if attendance_snapshot["last_activity_at"] else None,
        },
    })


def custom_permission_denied_view(request, exception=None):
    if request.path.startswith('/api/'):
        return JsonResponse({
            "error": "You do not have access to this page. Please contact admin regarding this access."
        }, status=403)

    return render(
        request,
        'admin/access_denied.html',
        {
            'title': 'Access Denied',
            'requested_path': request.path,
        },
        status=403,
    )


@staff_member_required
def online_status_view(request):
    users = User.objects.filter(is_staff=True).select_related('profile')
    data  = []
    for u in users:
        try:
            online = get_attendance_snapshot(u)["is_active"] or u.profile.is_online()
        except Exception:
            online = False
        data.append({'id': u.id, 'online': online})
    return JsonResponse(data, safe=False)


@staff_member_required
def attendance_status_api(request):
    snapshot = get_attendance_snapshot(request.user)
    return JsonResponse({
        "is_active": snapshot["is_active"],
        "display_seconds": snapshot["display_seconds"],
        "started_at": snapshot["started_at"].isoformat() if snapshot["started_at"] else None,
        "last_activity_at": snapshot["last_activity_at"].isoformat() if snapshot["last_activity_at"] else None,
    })


@staff_member_required
def attendance_heartbeat_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "method not allowed"}, status=405)

    touch_attendance(request.user)
    snapshot = get_attendance_snapshot(request.user)
    return JsonResponse({
        "status": "ok",
        "is_active": snapshot["is_active"],
        "display_seconds": snapshot["display_seconds"],
    })


@staff_member_required
def attendance_disconnect_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "method not allowed"}, status=405)

    pause_attendance(request.user)
    snapshot = get_attendance_snapshot(request.user)
    return JsonResponse({
        "status": "paused",
        "is_active": snapshot["is_active"],
        "display_seconds": snapshot["display_seconds"],
    })


# ═══════════════════════════════════════════════════════
# LIVE CRICKET
# ═══════════════════════════════════════════════════════

@api_view(['GET'])
def live_cricket(request):
    try:
        if not settings.CRICKET_API_KEY:
            return Response({
                "error": "Cricket API key not configured",
                "live": [], "upcoming": [], "recent": []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        cache_key = "cricket_live_data:v3"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        urls = [
            f"https://api.cricapi.com/v1/cricScore?apikey={settings.CRICKET_API_KEY}",
            f"https://api.cricapi.com/v1/currentMatches?apikey={settings.CRICKET_API_KEY}&offset=0",
        ]

        matches = []
        last_status_code = None
        for url in urls:
            response = requests.get(url, timeout=15)
            last_status_code = response.status_code
            if response.status_code != 200:
                continue
            candidate = response.json()
            if candidate.get("status") == "success" and candidate.get("data"):
                matches.extend(candidate.get("data", []))

        if not matches:
            return Response({
                "error": f"Cricket API returned status {last_status_code}",
                "live": [], "upcoming": [], "recent": []
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        live     = []
        upcoming = []
        recent   = []
        seen_match_keys = set()

        def clean_team_name(value):
            value = str(value or '').strip()
            if not value or value.lower() in ('tbd', 'to be decided', 'unknown'):
                return ''
            return value

        def team_names_from_match(match):
            teams = match.get('teams') if isinstance(match.get('teams'), list) else []
            team_info = match.get('teamInfo') if isinstance(match.get('teamInfo'), list) else []
            names = [
                clean_team_name(match.get('t1')),
                clean_team_name(match.get('t2')),
            ]
            names.extend(clean_team_name(team.get('name')) for team in team_info if isinstance(team, dict))
            names.extend(clean_team_name(team) for team in teams)

            if len([name for name in names if name]) < 2:
                raw_name = str(match.get('name') or match.get('title') or '')
                for separator in (' vs ', ' v '):
                    if separator in raw_name.lower():
                        parts = re.split(separator, raw_name, maxsplit=1, flags=re.IGNORECASE)
                        names.extend(clean_team_name(part) for part in parts[:2])
                        break

            unique = []
            for name in names:
                if name and name.lower() not in [item.lower() for item in unique]:
                    unique.append(name)
            return unique[:2]

        def clean_score(value):
            value = str(value or '').strip()
            if not value or value.lower() in ('tbd', '-', 'yet to bat', 'null', 'none'):
                return ''
            return value

        def score_text(score):
            if not isinstance(score, dict):
                return ''
            runs = score.get('r')
            wickets = score.get('w')
            overs = score.get('o')
            if runs in (None, ''):
                return ''
            text = str(runs)
            if wickets not in (None, ''):
                text = f"{text}/{wickets}"
            if overs not in (None, ''):
                text = f"{text} ({overs})"
            return text

        def normalize_scores(match, normalized):
            normalized['t1s'] = clean_score(match.get('t1s'))
            normalized['t2s'] = clean_score(match.get('t2s'))

            scores = match.get('score') if isinstance(match.get('score'), list) else []
            for score in scores:
                text = score_text(score)
                if not text:
                    continue
                inning = str(score.get('inning') or '').lower()
                t1 = normalized['t1'].lower()
                t2 = normalized['t2'].lower()

                if t1 and t1 in inning:
                    normalized['t1s'] = normalized['t1s'] or text
                elif t2 and t2 in inning:
                    normalized['t2s'] = normalized['t2s'] or text
                elif not normalized['t1s']:
                    normalized['t1s'] = text
                elif not normalized['t2s']:
                    normalized['t2s'] = text

            normalized['score'] = scores
            return normalized

        def match_datetime(match):
            raw_value = match.get('dateTimeGMT') or match.get('date') or match.get('startDate')
            parsed = parse_datetime(str(raw_value or ''))
            if parsed is None:
                return None
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, ZoneInfo("UTC"))
            return parsed

        def has_real_score(match):
            return bool(
                clean_score(match.get('t1s'))
                or clean_score(match.get('t2s'))
                or match.get('score')
            )

        def normalize_match(match):
            teams = team_names_from_match(match)
            if len(teams) < 2:
                return None

            normalized = dict(match)
            normalized['t1'] = teams[0]
            normalized['t2'] = teams[1]
            normalized['name'] = normalized.get('name') or f"{teams[0]} vs {teams[1]}"
            normalized['venue'] = normalized.get('venue') or normalized.get('venueInfo') or ''
            normalized['_has_real_teams'] = True
            normalized['_start_time'] = match_datetime(match)
            normalized = normalize_scores(match, normalized)
            if normalized['_start_time']:
                normalized['dateTimeIST'] = normalized['_start_time'].astimezone(IST).isoformat()
                normalized['startTimeIST'] = normalized['_start_time'].astimezone(IST).strftime('%d %b %Y, %I:%M %p')
            return normalized

        def match_bucket(match, status_text):
            has_result = (
                match.get('matchEnded')
                or any(token in status_text for token in ('match over', 'won', 'beat', 'result', 'completed'))
            )
            if has_result:
                return 'recent'

            starts_at = match.get('_start_time')
            now = timezone.now()
            if starts_at and starts_at.astimezone(IST) > now.astimezone(IST) + timedelta(minutes=10):
                return 'upcoming'

            is_started = match.get('matchStarted') is True
            looks_live = any(token in status_text for token in ('live', 'ongoing', 'in progress', 'stumps', 'innings break'))
            if is_started or looks_live:
                if has_real_score(match) or is_started:
                    return 'live'

            return 'upcoming'

        for match in matches:
            match = normalize_match(match)
            if not match:
                continue

            match_key = match.get('id') or f"{match.get('name')}|{match.get('dateTimeGMT') or match.get('date')}"
            if match_key in seen_match_keys:
                continue
            seen_match_keys.add(match_key)

            match_status = str(match.get("status", "") or match.get("matchStatus", "") or "").lower()
            series_name = str(match.get("series", "") or match.get("series_name", "") or "").lower()
            match_name = str(match.get("name", "") or match.get("title", "") or "").lower()

            # Prefer IPL matches when available in the feed.
            is_ipl = "ipl" in series_name or "indian premier league" in series_name or "ipl" in match_name

            bucket = match_bucket(match, match_status)
            if bucket == 'recent':
                recent.append(match)
            elif bucket == 'upcoming':
                upcoming.append(match)
            else:
                live.append(match)

            match["_is_ipl"] = is_ipl

        def public_match(match):
            return {key: value for key, value in match.items() if not key.startswith('_')}

        def prioritize_ipl(items):
            return sorted(items, key=lambda item: (
                0 if item.get("_is_ipl") else 1,
                0 if item.get("_has_real_teams") else 1,
            ))

        def prioritize_upcoming(items):
            return sorted(items, key=lambda item: (
                0 if item.get("_is_ipl") else 1,
                item.get("_start_time") or datetime.max.replace(tzinfo=ZoneInfo("UTC")),
            ))

        def prioritize_recent(items):
            return sorted(items, key=lambda item: (
                0 if item.get("_is_ipl") else 1,
                -(item.get("_start_time").timestamp() if item.get("_start_time") else 0),
            ))

        result = {
            "live":     [public_match(item) for item in prioritize_ipl(live)[:1]],
            "upcoming": [public_match(item) for item in prioritize_upcoming(upcoming)[:3]],
            "recent":   [public_match(item) for item in prioritize_recent(recent)[:3]]
        }
        cache.set(cache_key, result, 1800)
        return Response(result)

    except requests.exceptions.Timeout:
        return Response({
            "error": "Cricket API request timed out",
            "live": [], "upcoming": [], "recent": []
        }, status=status.HTTP_504_GATEWAY_TIMEOUT)
    except requests.exceptions.RequestException as e:
        return Response({
            "error": f"Failed to fetch cricket data: {str(e)}",
            "live": [], "upcoming": [], "recent": []
        }, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        return Response({
            "error": f"Unexpected error: {str(e)}",
            "live": [], "upcoming": [], "recent": []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@staff_member_required
def media_library_view(request):
    categories = Category.objects.filter(status='active').order_by('name')
    return render(request, 'admin/media_library.html', {
        'mp3_categories': categories,
    })


@staff_member_required
def newsletter_view(request):
    category_qs = Category.objects.only('id', 'name', 'slug')
    articles = (
        Article.objects.filter(status='published')
        .select_related('author')
        .prefetch_related(Prefetch('categories', queryset=category_qs))
        .only(
            'id',
            'title',
            'slug',
            'subtitle',
            'image',
            'image_url',
            'image_alt',
            'published_at',
            'created_at',
            'updated_at',
            'canonical_url',
            'meta_title',
            'meta_description',
            'focus_keyword',
            'secondary_keywords',
            'noindex',
            'nofollow',
            'in_sitemap',
            'author__username',
            'author__first_name',
            'author__last_name',
            'author_display_name',
            'tags',
            'is_paid',
            'selected_subcategories',
        )
        .order_by('-published_at', '-created_at')[:80]
    )
    articles_json = json.dumps(
        ArticleHomepageSerializer(articles, many=True, context={'request': request}).data
    )
    return render(request, 'admin/newsletter.html', {
        'articles_json': articles_json,
        'newsletter_asset_version': timezone.now().strftime('%Y%m%d%H%M'),
    })


import logging
from django.core.mail import EmailMultiAlternatives, get_connection
from email.mime.image import MIMEImage
from email.utils import formataddr
from datetime import datetime
from urllib.parse import quote
from django.core import signing
from django.urls import reverse
 
logger = logging.getLogger(__name__)

NEWSLETTER_SUBSCRIBE_SALT = 'news4bharat.newsletter.subscribe'
NEWSLETTER_SUBSCRIBE_URL_PLACEHOLDER = '__NEWSLETTER_SUBSCRIBE_URL__'
NEWSLETTER_SUBSCRIBE_FORM_URL_PLACEHOLDER = '__NEWSLETTER_SUBSCRIBE_FORM_URL__'


def _newsletter_html_debug_urls(html_content, limit=8):
    urls = {'images': [], 'links': []}
    for attr_name, _quote_char, attr_value in re.findall(
        r'\b(src|href)=(["\'])(?!#)([^"\']+)\2',
        str(html_content or ''),
        flags=re.IGNORECASE,
    ):
        key = 'images' if attr_name.lower() == 'src' else 'links'
        if attr_value not in urls[key]:
            urls[key].append(attr_value)
        urls[key] = urls[key][:limit]
    return urls


def _embed_newsletter_images(html_content, max_images=12, max_image_bytes=2 * 1024 * 1024):
    """
    Email clients like Gmail can block/fail remote images. For SMTP sends, embed
    newsletter images as inline CID attachments so the visual email matches the
    downloaded HTML instead of showing the image alt text.
    """
    attachments = []
    seen = {}

    def replace_img_src(match):
        quote_char, image_url = match.groups()
        image_url = str(image_url or '').strip()
        if (
            not image_url
            or image_url.startswith(('cid:', 'data:'))
            or len(attachments) >= max_images
        ):
            return match.group(0)

        if image_url in seen:
            return f'src={quote_char}cid:{seen[image_url]}{quote_char}'

        try:
            response = requests.get(
                image_url,
                headers={'User-Agent': 'News4BharatNewsletter/1.0'},
                timeout=12,
                stream=True,
            )
            response.raise_for_status()
            content_type = (response.headers.get('Content-Type') or '').split(';', 1)[0].strip().lower()
            if not content_type.startswith('image/'):
                return match.group(0)

            content = response.raw.read(max_image_bytes + 1, decode_content=True)
            if not content or len(content) > max_image_bytes:
                return match.group(0)

            cid = f"n4b-{uuid.uuid4().hex}@news4bharat"
            image = MIMEImage(content, _subtype=content_type.split('/', 1)[1])
            image.add_header('Content-ID', f'<{cid}>')
            image.add_header('Content-Disposition', 'inline')
            attachments.append(image)
            seen[image_url] = cid
            return f'src={quote_char}cid:{cid}{quote_char}'
        except Exception as exc:
            logger.warning(f"Newsletter image embed failed for {image_url}: {exc}")
            return match.group(0)

    html_with_inline_images = re.sub(
        r'\bsrc=(["\'])(https?://[^"\']+)\1',
        replace_img_src,
        str(html_content or ''),
        flags=re.IGNORECASE,
    )
    return html_with_inline_images, attachments
 
 
def _auth(request):
    """Simple API key check"""
    key = request.headers.get('X-API-Key') or request.GET.get('api_key')
    expected = getattr(settings, 'NEWSLETTER_API_KEY', None)
    if expected and key != expected:
        return False
    return True


def _normalize_emails(emails):
    if isinstance(emails, str):
        emails = [emails]
    return list(dict.fromkeys([
        str(email).strip().lower()
        for email in (emails or [])
        if str(email).strip()
    ]))


def _build_subscribe_token(email):
    return signing.dumps({'email': str(email).strip().lower()}, salt=NEWSLETTER_SUBSCRIBE_SALT)


def _build_subscribe_url(request, email):
    token = _build_subscribe_token(email)
    base_url = _get_newsletter_subscribe_base_url()
    return f"{base_url}?token={quote(token)}"


def _normalize_subscription_email(email):
    normalized = str(email or '').strip().lower()
    if not normalized:
        return ''
    validate_email(normalized)
    return normalized


def _get_newsletter_subscribe_base_url():
    api_base_url = str(
        getattr(settings, 'NEWSLETTER_API_BASE_URL', '')
        or getattr(settings, 'NEWSLETTER_SUBSCRIBE_BASE_URL', '')
        or 'https://news4bharat.cloud'
    ).rstrip('/')
    return f"{api_base_url}{reverse('newsletter_subscribe')}"


def _get_newsletter_site_home_url():
    return str(getattr(settings, 'NEWSLETTER_SITE_URL', '') or getattr(settings, 'SEO_SITE_URL', '') or 'https://news4bharat.com').rstrip('/')


def _render_subscribe_form_html(request, email='', error=''):
    safe_email = str(email or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
    safe_error = str(error or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    form_action = _get_newsletter_subscribe_base_url()
    error_html = ''
    if safe_error:
        error_html = f'<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#dc2626;">{safe_error}</p>'
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscribe | News4Bharat</title>
</head>
<body style="margin:0;padding:32px;background:#f5f7fb;font-family:Arial,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1950DF;margin-bottom:12px;">News4Bharat Newsletter</div>
    <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#111827;">Subscribe To Our Newsletter</h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">Enter your email address below and we'll save it for future News4Bharat newsletters.</p>
    {error_html}
    <form action="{form_action}" method="get" style="margin:0;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <input type="email" name="email" value="{safe_email}" placeholder="Enter your email address" required style="flex:1;min-width:240px;padding:14px 18px;border:1px solid #bfdbfe;border-radius:999px;font-size:15px;color:#111827;background:#eff6ff;outline:none;box-sizing:border-box;">
        <button type="submit" style="border:none;border-radius:999px;background:#3b82f6;color:#ffffff;font-size:15px;font-weight:700;padding:14px 24px;cursor:pointer;">Subscribe</button>
      </div>
    </form>
  </div>
</body>
</html>"""


def _is_ajax_subscribe_request(request):
    return (
        request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        or str(request.GET.get('ajax') or '').strip() == '1'
    )


def _render_subscribe_success_html(email):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscribed | News4Bharat</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;color:#111827;">
  <div style="max-width:480px;width:100%;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:36px 28px;text-align:center;">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:999px;background:#16a34a;color:#ffffff;font-size:30px;font-weight:700;line-height:1;margin-bottom:18px;">✓</div>
    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1950DF;margin-bottom:10px;">News4Bharat Newsletter</div>
    <h1 style="margin:0 0 8px;font-size:30px;line-height:1.2;color:#15803d;">Subscribed</h1>
    <p style="margin:0;font-size:16px;line-height:1.7;color:#4b5563;">You have successfully subscribed to our newsletter.</p>
  </div>
</body>
</html>"""


@require_GET
def subscribe_newsletter(request):
    token = (request.GET.get('token') or '').strip()
    manual_email = str(request.GET.get('email') or '').strip().lower()
    wants_json = _is_ajax_subscribe_request(request)

    if not token and not manual_email:
        return HttpResponse(_render_subscribe_form_html(request))

    if token:
        try:
            payload = signing.loads(token, salt=NEWSLETTER_SUBSCRIBE_SALT, max_age=60 * 60 * 24 * 365 * 5)
        except signing.BadSignature:
            return HttpResponse('Invalid or expired subscription link.', status=400)
        email = str(payload.get('email') or '').strip().lower()
    else:
        email = manual_email

    try:
        email = _normalize_subscription_email(email)
    except ValidationError:
        if wants_json:
            return JsonResponse({'ok': False, 'error': 'Please enter a valid email address.'}, status=400)
        return HttpResponse(
            _render_subscribe_form_html(
                request,
                email=manual_email,
                error='Please enter a valid email address.',
            ),
            status=400,
        )

    Newsletter.objects.update_or_create(
        email=email,
        defaults={
            'is_active': True,
            'source': 'manual_form' if manual_email and not token else 'email_cta',
        },
    )
    if wants_json:
        return JsonResponse({
            'ok': True,
            'message': 'You have successfully subscribed to our newsletter',
            'email': email,
        })
    return redirect(_get_newsletter_site_home_url())
 
 
@csrf_exempt
@require_POST
def send_newsletter(request):
    """
    POST /api/newsletter/send/
    Body:
    {
        "recipients": ["a@example.com", "b@example.com"],
        "subject": "News4Bharat Weekly: ...",
        "html": "<html>...</html>",
        "chosen_articles": {"hero": "article-slug", "b1": "slug2"}
    }
    """
    # Auth check (optional - settings mein NEWSLETTER_API_KEY set karo)
    # if not _auth(request):
    #     return JsonResponse({'error': 'Unauthorized'}, status=401)
 
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
 
    recipients = body.get('recipients', [])
    is_test = bool(body.get('is_test'))
    subject = str(body.get('subject') or body.get('email_subject') or '').replace('\r', ' ').replace('\n', ' ').strip()
    if not subject:
        subject = 'News4Bharat Weekly Newsletter'
    html_content = body.get('html', '')
    chosen = body.get('chosen_articles', {})
    recipients = _normalize_emails(recipients)

    if not is_test:
        subscriber_emails = list(
            Newsletter.objects.filter(is_active=True)
            .values_list('email', flat=True)
        )
        recipients = _normalize_emails([*recipients, *subscriber_emails])

    original_recipient_count = len(recipients)
    max_recipients = max(1, int(getattr(settings, 'NEWSLETTER_MAX_RECIPIENTS', 300) or 300))
    recipient_limit_warning = ''
    skipped_recipient_count = 0
    if original_recipient_count > max_recipients:
        skipped_recipient_count = original_recipient_count - max_recipients
        recipients = recipients[:max_recipients]
        recipient_limit_warning = (
            f'Only the first {max_recipients} recipients will receive this newsletter. '
            f'The remaining {skipped_recipient_count} recipients were not sent.'
        )

    if not recipients:
        return JsonResponse({'error': 'No recipients provided'}, status=400)
 
    if not html_content:
        return JsonResponse({'error': 'No HTML content provided'}, status=400)

    sender_email = (
        getattr(settings, 'NEWSLETTER_FROM_EMAIL', '').strip()
        or getattr(settings, 'DEFAULT_FROM_EMAIL', '').strip()
        or getattr(settings, 'EMAIL_HOST_USER', '').strip()
    )
    if not sender_email:
        return JsonResponse({'error': 'Email sender is not configured'}, status=500)
    from_email = formataddr((
        getattr(settings, 'NEWSLETTER_FROM_NAME', 'News4Bharat'),
        sender_email,
    ))
 
    # Plain text fallback
    plain_text = f"""
News4Bharat Weekly Newsletter
{datetime.now().strftime('%d %B %Y')}
 
{subject}
 
Please use an HTML-capable email client to read this newsletter.
Website: https://news4bharat.com
    """.strip()
 
    success = []
    failed = []
    brevo_message_ids = []
    debug_urls = {'images': [], 'links': []}
    trace_id = uuid.uuid4().hex[:12]
    brevo_no_tracking_headers = {
        'X-Mailin-Track': '0',
        'X-Mailin-Track-Clicks': '0',
        'X-Mailin-Track-Opens': '0',
        'X-SIB-Track': '0',
        'X-SIB-Track-Clicks': '0',
        'X-SIB-Track-Opens': '0',
    }
    requested_provider = getattr(settings, 'NEWSLETTER_SEND_PROVIDER', 'smtp')
    requested_provider = str(requested_provider or 'smtp').strip().lower()
    brevo_api_key = getattr(settings, 'BREVO_API_KEY', '')
    use_brevo_api = bool(brevo_api_key) and requested_provider not in {'smtp', 'newsletter_smtp'}
    send_provider = 'brevo_api' if use_brevo_api else 'newsletter_smtp'
    newsletter_log = None
    try:
        newsletter_log = _save_history(
            subject,
            recipients,
            chosen,
            0,
            0,
            success_emails=[],
            failed_emails=[],
            trace_id=trace_id,
        )
    except Exception as e:
        logger.warning(f"Could not create newsletter history: {e}")

    if use_brevo_api:
        for email in recipients:
            try:
                personalized_html = html_content.replace(
                    NEWSLETTER_SUBSCRIBE_URL_PLACEHOLDER,
                    _build_subscribe_url(request, email),
                )
                personalized_html = personalized_html.replace(
                    NEWSLETTER_SUBSCRIBE_FORM_URL_PLACEHOLDER,
                    _get_newsletter_subscribe_base_url(),
                )
                if not debug_urls['images'] and not debug_urls['links']:
                    debug_urls = _newsletter_html_debug_urls(personalized_html)
                payload = {
                    'sender': {
                        'name': getattr(settings, 'NEWSLETTER_FROM_NAME', 'News4Bharat'),
                        'email': sender_email,
                    },
                    'to': [{'email': email}],
                    'subject': subject,
                    'htmlContent': personalized_html,
                    'textContent': plain_text,
                    'trackOpens': False,
                    'trackClicks': False,
                    'headers': {
                        'X-News4Bharat-Newsletter-Trace': trace_id,
                        'X-News4Bharat-Newsletter-Log': str(getattr(newsletter_log, 'id', '') or ''),
                        **brevo_no_tracking_headers,
                    },

                    'tags': ['newsletter', 'test' if is_test else 'newsletter-send'],
                }
                response = requests.post(
                    'https://api.brevo.com/v3/smtp/email',
                    headers={
                        'accept': 'application/json',
                        'api-key': brevo_api_key,
                        'content-type': 'application/json',
                    },
                    json=payload,
                    timeout=30,
                )
                try:
                    response_data = response.json()
                except Exception:
                    response_data = {'raw': response.text}
                if not 200 <= response.status_code < 300:
                    failed.append({
                        'email': email,
                        'error': response_data,
                        'status_code': response.status_code,
                    })
                    logger.error(f"Newsletter Brevo API failed for {email}: {response.status_code} {response_data}")
                    continue
                message_id = response_data.get('messageId') or response_data.get('message_id') or ''
                success.append(email)
                brevo_message_ids.append({'email': email, 'message_id': message_id})
                logger.info(f"Newsletter Brevo API accepted for {email}: {message_id}")
            except Exception as e:
                failed.append({'email': email, 'error': str(e)})
                logger.error(f"Newsletter Brevo API exception for {email}: {e}")
    else:
        smtp_host = getattr(settings, 'NEWSLETTER_SMTP_HOST', '') or getattr(settings, 'EMAIL_HOST', '')
        smtp_port = int(getattr(settings, 'NEWSLETTER_SMTP_PORT', 587) or 587)
        smtp_use_tls = bool(getattr(settings, 'NEWSLETTER_SMTP_USE_TLS', True))
        smtp_user = getattr(settings, 'NEWSLETTER_SMTP_USER', '')
        smtp_password = getattr(settings, 'NEWSLETTER_SMTP_PASSWORD', '')

        if not smtp_host or not smtp_user or not smtp_password:
            failed = [{
                'email': email,
                'error': 'Newsletter SMTP is not configured. Please set NEWSLETTER_SMTP_HOST, NEWSLETTER_SMTP_USER, and NEWSLETTER_SMTP_PASSWORD.',
            } for email in recipients]
            logger.error("Newsletter SMTP is not configured")
        else:
            connection = get_connection(
                host=smtp_host,
                port=smtp_port,
                username=smtp_user,
                password=smtp_password,
                use_tls=smtp_use_tls,
                fail_silently=False,
            )
            try:
                connection.open()
                for email in recipients:
                    try:
                        personalized_html = html_content.replace(
                            NEWSLETTER_SUBSCRIBE_URL_PLACEHOLDER,
                            _build_subscribe_url(request, email),
                        )
                        personalized_html = personalized_html.replace(
                            NEWSLETTER_SUBSCRIBE_FORM_URL_PLACEHOLDER,
                            _get_newsletter_subscribe_base_url(),
                        )
                        if not debug_urls['images'] and not debug_urls['links']:
                            debug_urls = _newsletter_html_debug_urls(personalized_html)
                        personalized_html, inline_images = _embed_newsletter_images(personalized_html)
                        msg = EmailMultiAlternatives(
                            subject=subject,
                            body=plain_text,
                            from_email=from_email,
                            to=[email],
                            connection=connection,
                            headers={
                                'X-News4Bharat-Newsletter-Trace': trace_id,
                                'X-News4Bharat-Newsletter-Log': str(getattr(newsletter_log, 'id', '') or ''),
                                **brevo_no_tracking_headers,
                            },
                        )
                        if inline_images:
                            msg.mixed_subtype = 'related'
                        msg.attach_alternative(personalized_html, "text/html")
                        for inline_image in inline_images:
                            msg.attach(inline_image)
                        msg.send(fail_silently=False)
                        success.append(email)
                        logger.info(f"Newsletter sent to {email}")
                    except Exception as e:
                        failed.append({'email': email, 'error': str(e)})
                        logger.error(f"Newsletter failed for {email}: {e}")
            except Exception as e:
                if not success and not failed:
                    failed = [{'email': email, 'error': str(e)} for email in recipients]
                logger.error(f"Newsletter SMTP connection failed: {e}")
            finally:
                try:
                    connection.close()
                except Exception:
                    pass
 
    try:
        if newsletter_log:
            newsletter_log.sent_count = len(success)
            newsletter_log.failed_count = len(failed)
            newsletter_log.success_emails = success
            newsletter_log.failed_emails = failed
            newsletter_log.brevo_message_ids = brevo_message_ids
            newsletter_log.event_history = [
                *list(newsletter_log.event_history or []),
                {
                    'event': f'{send_provider}_accepted' if success else f'{send_provider}_failed',
                    'email': '',
                    'subject': subject,
                    'at': timezone.localtime(timezone.now()).strftime('%d/%m/%Y %I:%M %p'),
                    'raw_event': f'django_{send_provider}_send',
                    'reason': (
                        f'{len(success)} accepted by {send_provider}, {len(failed)} failed'
                        + (f'; {recipient_limit_warning}' if recipient_limit_warning else '')
                    ),
                }
            ]
            newsletter_log.save(update_fields=[
                'sent_count', 'failed_count', 'success_emails', 'failed_emails',
                'brevo_message_ids', 'event_history'
            ])
    except Exception as e:
        logger.warning(f"Could not update newsletter history: {e}")
 
    sent_at = timezone.now()
    response_status = 200 if success else 502
    return JsonResponse({
        'status': 'done',
        'ok': bool(success),
        'sent': len(success),
        'failed': len(failed),
        'success_emails': success,
        'failed_emails': failed,
        'sent_at': sent_at.isoformat(),
        'sent_at_ist': timezone.localtime(sent_at).strftime('%d/%m/%Y %I:%M %p'),
        'log_id': getattr(newsletter_log, 'id', None),
        'trace_id': trace_id,
        'provider': send_provider,
        'brevo_message_ids': brevo_message_ids,
        'debug_sent_image_urls': debug_urls['images'],
        'debug_sent_link_urls': debug_urls['links'],
        'recipient_limit': max_recipients,
        'requested_recipients': original_recipient_count,
        'skipped_recipients': skipped_recipient_count,
        'warning': recipient_limit_warning,
        'note': 'Brevo API accepted means Brevo created a message id. Delivered/bounced updates require Brevo webhook events.',
    }, status=response_status)
 
 
def _save_history(subject, recipients, chosen, sent_count, failed_count, success_emails=None, failed_emails=None, trace_id=''):
    """Newsletter history save karna — NewsletterLog model use karo"""
    try:
        from newsapp.models import NewsletterLog
        return NewsletterLog.objects.create(
            trace_id=trace_id,
            subject=subject,
            recipients=recipients,
            chosen_articles=chosen,
            sent_count=sent_count,
            failed_count=failed_count,
            success_emails=success_emails or [],
            failed_emails=failed_emails or [],
        )
    except ImportError:
        return None  # Model nahi bana toh skip
 
 
@require_GET
def newsletter_history(request):
    """
    GET /api/newsletter/history/
    Last 20 sent newsletters
    """
    try:
        from newsapp.models import NewsletterLog
        limit = min(int(request.GET.get('limit', 30)), 100)
        logs = []
        for item in NewsletterLog.objects.order_by('-sent_at')[:limit]:
            sent_at_local = timezone.localtime(item.sent_at)
            logs.append({
                'id': item.id,
                'trace_id': item.trace_id,
                'subject': item.subject,
                'recipients': item.recipients or [],
                'success_emails': item.success_emails or [],
                'failed_emails': item.failed_emails or [],
                'delivered_emails': item.delivered_emails or [],
                'opened_emails': item.opened_emails or [],
                'clicked_emails': item.clicked_emails or [],
                'bounced_emails': item.bounced_emails or [],
                'brevo_message_ids': item.brevo_message_ids or [],
                'event_history': (item.event_history or [])[-50:],
                'sent_count': item.sent_count,
                'failed_count': item.failed_count,
                'delivered_count': item.delivered_count,
                'opened_count': item.opened_count,
                'clicked_count': item.clicked_count,
                'bounced_count': item.bounced_count,
                'sent_at': item.sent_at.isoformat(),
                'sent_at_ist': sent_at_local.strftime('%d/%m/%Y %I:%M %p'),
            })
        return JsonResponse({'history': logs})
    except Exception as e:
        return JsonResponse({'history': [], 'note': str(e)})


def _append_unique_email(items, email):
    normalized = str(email or '').strip().lower()
    current = list(items or [])
    if normalized and normalized not in current:
        current.append(normalized)
    return current


def _newsletter_event_name(raw_event):
    event = str(raw_event or '').strip().lower().replace('-', '_')
    if event in {'hard_bounce', 'soft_bounce', 'blocked', 'invalid_email'}:
        return 'bounced'
    if event in {'delivered', 'opened', 'click', 'clicked'}:
        return 'clicked' if event == 'click' else event
    if event in {'sent', 'request', 'deferred'}:
        return event
    return event or 'unknown'


def _find_newsletter_log_for_event(email, subject, log_id=None, message_id=''):
    from newsapp.models import NewsletterLog

    if log_id:
        match = NewsletterLog.objects.filter(id=log_id).first()
        if match:
            return match

    trace_id = ''
    if isinstance(log_id, str) and not log_id.isdigit():
        trace_id = log_id
    if trace_id:
        match = NewsletterLog.objects.filter(trace_id=trace_id).first()
        if match:
            return match

    message_id = str(message_id or '').strip()
    if message_id:
        match = NewsletterLog.objects.filter(
            brevo_message_ids__contains=[{'email': str(email or '').strip().lower(), 'message_id': message_id}]
        ).first()
        if match:
            return match
        for item in NewsletterLog.objects.order_by('-sent_at')[:100]:
            for stored in item.brevo_message_ids or []:
                if str(stored.get('message_id') or '').strip() == message_id:
                    return item

    qs = NewsletterLog.objects.order_by('-sent_at')
    if subject:
        qs = qs.filter(subject__icontains=str(subject).strip()[:120])
    if email:
        email = str(email).strip().lower()
        qs = qs.filter(recipients__contains=[email])
    return qs.first()


@csrf_exempt
@require_POST
def newsletter_brevo_webhook(request):
    """
    Brevo transactional webhook endpoint.
    Configure Brevo events for delivered, opened, clicked, hard_bounce, soft_bounce, blocked.
    """
    try:
        payload = json.loads(request.body or '{}')
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Invalid JSON'}, status=400)

    events = payload if isinstance(payload, list) else [payload]
    updated = 0

    for event_payload in events:
        if not isinstance(event_payload, dict):
            continue
        email = str(
            event_payload.get('email')
            or event_payload.get('recipient')
            or event_payload.get('to')
            or ''
        ).strip().lower()
        subject = str(event_payload.get('subject') or '').strip()
        event = _newsletter_event_name(event_payload.get('event'))
        message_id = str(
            event_payload.get('message-id')
            or event_payload.get('messageId')
            or event_payload.get('message_id')
            or event_payload.get('Message-ID')
            or ''
        ).strip()
        log_id = (
            event_payload.get('newsletter_log_id')
            or event_payload.get('log_id')
            or event_payload.get('trace_id')
            or event_payload.get('X-News4Bharat-Newsletter-Trace')
        )
        log = _find_newsletter_log_for_event(email, subject, log_id=log_id, message_id=message_id)
        if not log:
            continue

        event_record = {
            'event': event,
            'email': email,
            'message_id': message_id,
            'subject': subject or log.subject,
            'at': timezone.localtime(timezone.now()).strftime('%d/%m/%Y %I:%M %p'),
            'raw_event': event_payload.get('event'),
            'reason': event_payload.get('reason') or event_payload.get('message') or event_payload.get('error') or '',
        }

        if event == 'delivered':
            log.delivered_emails = _append_unique_email(log.delivered_emails, email)
        elif event == 'opened':
            log.opened_emails = _append_unique_email(log.opened_emails, email)
        elif event == 'clicked':
            log.clicked_emails = _append_unique_email(log.clicked_emails, email)
        elif event == 'bounced':
            log.bounced_emails = _append_unique_email(log.bounced_emails, email)

        history = list(log.event_history or [])
        history.append(event_record)
        log.event_history = history[-500:]
        log.delivered_count = len(log.delivered_emails or [])
        log.opened_count = len(log.opened_emails or [])
        log.clicked_count = len(log.clicked_emails or [])
        log.bounced_count = len(log.bounced_emails or [])
        log.save(update_fields=[
            'delivered_emails', 'opened_emails', 'clicked_emails', 'bounced_emails',
            'event_history', 'delivered_count', 'opened_count', 'clicked_count', 'bounced_count'
        ])
        updated += 1

    return JsonResponse({'ok': True, 'updated': updated})

@api_view(['GET'])
def article_detail_by_slug(request, slug):
    normalized_slug = clean_url_segment(slug)
    cache_key = f"article:slug:{normalized_slug}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)
    try:
        article = Article.objects.select_related(
            'author', 'primary_category'
        ).prefetch_related('categories').filter(
            status='published'
        ).filter(
            Q(slug=normalized_slug) | Q(slug__endswith=f"/{normalized_slug}")
        ).order_by('-published_at').first()
    except Article.DoesNotExist:
        article = None
    if article is None:
        return Response({"error": "Not found"}, status=404)
    serializer = ArticleSerializer(article, context={'request': request})
    cache.set(cache_key, serializer.data, 300)
    return Response(serializer.data)

# ── Web Push Notifications ──
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pywebpush import webpush, WebPushException
from .models import PushNotificationLog, PushSubscription

@csrf_exempt
def save_push_subscription(request):
    """Frontend se subscription aayegi - yahan save hogi"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            endpoint = data.get("endpoint")
            p256dh   = data.get("keys", {}).get("p256dh")
            auth     = data.get("keys", {}).get("auth")
            subscriber_name = str(data.get("subscriber_name") or data.get("name") or "").strip()
            subscriber_email = str(data.get("subscriber_email") or data.get("email") or "").strip().lower()

            if request.user.is_authenticated:
                full_name = request.user.get_full_name().strip()
                subscriber_name = subscriber_name or full_name or request.user.username
                subscriber_email = subscriber_email or str(request.user.email or "").strip().lower()

            if not all([endpoint, p256dh, auth]):
                return JsonResponse({"status": "error", "message": "Invalid data"}, status=400)

            subscription, created = PushSubscription.objects.update_or_create(
                endpoint=endpoint,
                defaults={
                    "p256dh": p256dh,
                    "auth": auth,
                    "subscriber_name": subscriber_name,
                    "subscriber_email": subscriber_email,
                    "is_active": True,
                }
            )
            return JsonResponse({
                "status": "success",
                "created": created,
                "subscription_id": subscription.id,
                "subscriber_name": subscription.subscriber_name,
                "subscriber_email": subscription.subscriber_email,
            })

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error"}, status=405)


def get_vapid_public_key(request):
    """Frontend ko public key deta hai"""
    from django.conf import settings
    return JsonResponse({
        "public_key": settings.VAPID_PUBLIC_KEY
    })


def _resolve_vapid_private_key():
    private_key = str(getattr(settings, "VAPID_PRIVATE_KEY", "") or "").strip()
    if not private_key:
        return ""

    key_path = Path(private_key)
    if key_path.is_file():
        return str(key_path)

    if not key_path.is_absolute():
        base_dir = Path(getattr(settings, "BASE_DIR", Path.cwd()))
        candidate = base_dir / private_key
        if candidate.is_file():
            return str(candidate)

    return private_key


def send_push_to_all(title, body, url, icon="/logo.png", return_report=False):
    """Naya article publish hone pe yeh call hoga"""
    from django.conf import settings

    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        message = "Push notification skipped: VAPID keys are not configured"
        print(message)
        report = {
            "ok": False,
            "message": message,
            "total": 0,
            "sent": 0,
            "failed": 0,
            "failed_ids": [],
        }
        return report if return_report else None

    vapid_private_key = _resolve_vapid_private_key()

    subscriptions = PushSubscription.objects.filter(is_active=True)

    if not subscriptions.exists():
        message = "No subscribers found"
        print(message)
        report = {
            "ok": False,
            "message": message,
            "total": 0,
            "sent": 0,
            "failed": 0,
            "failed_ids": [],
        }
        return report if return_report else None

    failed = []
    sent_ids = []
    failure_details = []
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth":   sub.auth
                    }
                },
                data=json.dumps({
                    "title": title,
                    "body":  body,
                    "url":   url,
                    "icon":  icon
                }),
                vapid_private_key=vapid_private_key,
                vapid_claims=settings.VAPID_CLAIMS
            )
            PushNotificationLog.objects.create(
                subscription=sub,
                title=title,
                body=body,
                target_url=url,
                icon=icon,
                status=PushNotificationLog.STATUS_SENT,
            )
            sub.sent_count += 1
            sub.last_sent_at = timezone.now()
            sub.last_status = PushNotificationLog.STATUS_SENT
            sub.save(update_fields=["sent_count", "last_sent_at", "last_status"])
            sent_ids.append(sub.id)
        except WebPushException as e:
            error_message = str(e)
            if "410" in error_message or "404" in error_message:
                # Record preserve karte hue expired subscription ko inactive mark karo.
                sub.is_active = False
            failed.append(sub.id)
            failure_details.append({
                "subscription_id": sub.id,
                "endpoint": sub.endpoint[:120],
                "error": error_message,
            })
            PushNotificationLog.objects.create(
                subscription=sub,
                title=title,
                body=body,
                target_url=url,
                icon=icon,
                status=PushNotificationLog.STATUS_FAILED,
                error_message=error_message,
            )
            sub.failed_count += 1
            sub.last_sent_at = timezone.now()
            sub.last_status = PushNotificationLog.STATUS_FAILED
            sub.save(update_fields=["is_active", "failed_count", "last_sent_at", "last_status"])
            print(f"Failed for sub {sub.id}: {e}")

    success_count = subscriptions.count() - len(failed)
    print(f"✅ Sent: {success_count} | ❌ Failed: {len(failed)}")
    report = {
        "ok": success_count > 0,
        "message": "Push send completed",
        "total": subscriptions.count(),
        "sent": success_count,
        "sent_ids": sent_ids,
        "failed": len(failed),
        "failed_ids": failed,
        "failures": failure_details,
    }
    return report if return_report else None


@staff_member_required
@require_POST
def send_test_push_notification(request):
    payload = {
        "title": request.POST.get("title") or "News4Bharat Test Alert",
        "body": request.POST.get("body") or "Ye backend se bheja gaya test push hai.",
        "url": request.POST.get("url") or "https://news4bharat.com/",
        "icon": request.POST.get("icon") or "/logo.png",
    }
    report = send_push_to_all(return_report=True, **payload)
    return JsonResponse({
        "status": "ok" if report and report.get("ok") else "error",
        "payload": payload,
        "report": report or {},
    }, status=200 if report and report.get("total", 0) >= 0 else 500)
