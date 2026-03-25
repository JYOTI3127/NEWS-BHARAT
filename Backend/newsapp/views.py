from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.http import JsonResponse
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
from datetime import timedelta
import requests
from django.conf import settings
from django.core.paginator import Paginator
from rest_framework import status
from .serializers import CategorySerializer, ArticleSerializer, ArticleMinSerializer
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.contrib import messages
from .models import UserProfile, LoginAttemptLog
import os
import google.generativeai as genai
from django.urls import reverse

User = get_user_model()


# ═══════════════════════════════════════════════════════
# CATEGORY VIEWS
# ═══════════════════════════════════════════════════════

def category_list_page(request):
    categories = Category.objects.all()
    return render(request, 'articles/category_list.html', {'categories': categories})


def category_detail_page(request, slug):
    category = get_object_or_404(Category, slug=slug)
    articles = category.articles.filter(status='published').order_by('-created_at')
    paginator = Paginator(articles, 6)
    page_obj = paginator.get_page(request.GET.get('page'))
    return render(request, 'articles/category_detail.html', {
        'category': category,
        'page_obj': page_obj,
    })


@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def category_create(request):
    serializer = CategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
def category_update(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    serializer = CategorySerializer(cat, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def category_archive(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    cat.status = 'archived'
    cat.save(update_fields=['status'])
    return Response({'status': 'archived'})


@api_view(['POST'])
def category_restore(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    cat.status = 'active'
    cat.save(update_fields=['status'])
    return Response({'status': 'active'})


@api_view(['GET'])
def category_posts(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    articles = Article.objects.filter(
        categories=cat, status='published'
    ).order_by('-created_at')[:10]
    serializer = ArticleMinSerializer(articles, many=True, context={'request': request})
    return Response({
        'posts': serializer.data,
        'total': articles.count()
    })


# ═══════════════════════════════════════════════════════
# ARTICLE VIEWS
# ═══════════════════════════════════════════════════════

def _save_article_from_request(request, article=None):
    data  = request.POST
    files = request.FILES
    is_new = article is None

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

    article.status   = data.get('status', article.status if not is_new else 'draft')
    article.priority = int(data.get('priority', article.priority if not is_new else 5))
    article.is_paid  = data.get('is_paid', 'false').lower() in ('true', '1', 'on')

    deadline_val = data.get('deadline', '')
    if deadline_val:
        from django.utils.dateparse import parse_datetime
        article.deadline = parse_datetime(deadline_val)
    else:
        article.deadline = None

    assigned_id = data.get('assigned_to', '')
    if assigned_id:
        try:
            article.assigned_to_id = int(assigned_id)
        except (ValueError, TypeError):
            article.assigned_to = None
    else:
        article.assigned_to = None

    article.slug               = data.get('slug', '').strip()
    article.canonical_url      = data.get('canonical_url', '').strip()
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

    if 'image' in files and files['image']:
        article.image     = files['image']
        article.image_url = ''
    else:
        url_val = data.get('image_url', '').strip()
        if url_val and not url_val.startswith('blob:'):
            article.image_url = url_val

    subcategories_raw = data.get('subcategories', '{}')
    try:
        subcategories_dict = json.loads(subcategories_raw)
        article.selected_subcategories = subcategories_dict if isinstance(subcategories_dict, dict) else {}
    except (json.JSONDecodeError, TypeError):
        article.selected_subcategories = {}

    try:
        article.save()
    except Exception as e:
        return None, {'error': str(e)}

    category_ids_raw  = data.get('categories', '')
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

    if cat_ids:
        article.categories.set(cat_ids)
    elif 'categories' in data:
        article.categories.clear()

    return article, None


@api_view(['GET', 'POST'])
def article_list(request):
    if request.method == "GET":
        category = request.GET.get('category')
        articles = Article.objects.filter(status="published")
        if category:
            articles = articles.filter(categories__slug=category).distinct()
        serializer = ArticleSerializer(articles, many=True, context={'request': request})
        return Response(serializer.data)

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
    if not state:
        return Response({"error": "state parameter required"}, status=400)
    
    articles = Article.objects.filter(
        status='published',
        categories__slug='state-of-bharat',
    )
    
    filtered = [
        a for a in articles
        if state in (a.selected_subcategories or {}).get('subs', {}).get('3', [])
    ]
    
    serializer = ArticleMinSerializer(filtered, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def dashboard_articles(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Login required"}, status=401)

    if user.is_superuser:
        articles = Article.objects.all()
    else:
        profile = user.profile
        if profile.roles.filter(name="Reporter").exists():
            articles = Article.objects.filter(assigned_to=user)
        elif profile.roles.filter(name="Editor").exists():
            articles = Article.objects.all()
        else:
            articles = Article.objects.none()

    serializer = ArticleSerializer(articles, many=True)
    return Response(serializer.data)


def update_article_status(request, article):
    if not has_permission(request.user, "publish_article"):
        raise PermissionDenied("You don't have permission to publish.")
    article.status = "published"
    article.published_at = timezone.now()
    article.save()


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
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

    elif request.method == "PUT":
        if not request.user.is_authenticated:
            return Response({"error": "Login required"}, status=401)
        updated_article, error = _save_article_from_request(request, article=article)
        if error:
            return Response(error, status=400)
        serializer = ArticleSerializer(updated_article, context={'request': request})
        return Response(serializer.data)

    elif request.method == "DELETE":
        article.delete()
        return Response(status=204)


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

    try:
        ad_slot = HomepageSlot.objects.filter(slot_name='ad_banner').first()
    except Exception:
        ad_slot = None

    published_articles_for_picker = Article.objects.filter(
        status='published'
    ).select_related('author').prefetch_related('categories').order_by('-published_at')[:100]

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
        "ad_slot":                       ad_slot,
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
        slot.display_count = int(data.get('display_count', 4))
    except (ValueError, TypeError):
        slot.display_count = 4

    cat_id = data.get('category_id')
    slot.category_filter = Category.objects.filter(pk=cat_id).first() if cat_id else None

    slot.save()

    if mode == 'manual':
        manual_ids = data.get('manual_ids', [])
        if isinstance(manual_ids, list):
            slot.manual_articles.set(
                Article.objects.filter(pk__in=manual_ids, status='published')
            )
        else:
            slot.manual_articles.clear()
    else:
        slot.manual_articles.clear()

    return JsonResponse({'status': 'saved', 'slot': 'latest_news'})


@staff_member_required
@require_POST
def update_ad_slot(request):
    slot             = _get_or_create_slot('ad_banner')
    slot.mode        = 'manual'
    slot.ad_link_url = request.POST.get('ad_link_url', '').strip()
    slot.is_active   = request.POST.get('is_active', 'true').lower() in ('true', '1', 'on')

    if 'ad_image' in request.FILES and request.FILES['ad_image']:
        slot.ad_image     = request.FILES['ad_image']
        slot.ad_image_url = ''
    else:
        ad_url = request.POST.get('ad_image_url', '').strip()
        if ad_url and not ad_url.startswith('blob:'):
            slot.ad_image_url = ad_url

    slot.save()
    return JsonResponse({'status': 'saved', 'slot': 'ad_banner'})


# ═══════════════════════════════════════════════════════
# WEATHER, METALS, MARKET
# ═══════════════════════════════════════════════════════

@api_view(['GET'])
def weather_api(request):
    city   = request.GET.get("city", "Delhi")
    url    = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"}
    try:
        response = requests.get(url, params=params, timeout=5)
        data = response.json()
        if response.status_code != 200:
            return Response({"error": "City not found"}, status=400)
        return Response({
            "city":        city,
            "temperature": data["main"]["temp"],
            "feels_like":  data["main"]["feels_like"],
            "humidity":    data["main"]["humidity"],
            "description": data["weather"][0]["description"],
            "icon":        data["weather"][0]["icon"]
        })
    except Exception:
        return Response({"error": "Weather service unavailable"}, status=500)


@api_view(['GET'])
def metal_ticker(request):
    gold   = MetalRate.objects.filter(metal_type="gold").order_by('-created_at').first()
    silver = MetalRate.objects.filter(metal_type="silver").order_by('-created_at').first()
    return Response({
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
    })


from .utils import fetch_and_store_metal_rates, fetch_index_data


@api_view(['GET'])
def update_metal_rates(request):
    fetch_and_store_metal_rates()
    return Response({"message": "Rates updated successfully"})


@api_view(['GET'])
def market_indices(request):
    nifty  = fetch_index_data("^NSEI")
    sensex = fetch_index_data("^BSESN")
    return Response({"nifty": nifty, "sensex": sensex})


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

    first_cat = article.categories.first()

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
        "categories":   list(article.categories.values('id', 'name')),
        "author":       author_name,
        "status":       article.status,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "created_at":   article.created_at.isoformat()   if article.created_at   else None,
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
                fields=['title^5', 'title.autocomplete^3', 'categories.name^3', 'author.username^2', 'content'],
                type='best_fields', operator='or'),
            ESQ('multi_match', query=query,
                fields=['title.fuzzy^3', 'content.fuzzy'], fuzziness='AUTO', prefix_length=1),
            ESQ('match', **{'title.autocomplete': {'query': query, 'boost': 2}}),
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
        Q(content__icontains=query) |
        Q(author__username__icontains=query) |
        Q(categories__name__icontains=query)
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
# AI VIEWS  — Sabhi Google Gemini use karte hain (FREE)
# ═══════════════════════════════════════════════════════

def _get_gemini_model(model_name="gemini-2.0-flash-lite"):
    """Returns a configured Gemini GenerativeModel. Raises ValueError if key not set."""
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise ValueError("GEMINI_API_KEY not set in .env file")
    genai.configure(api_key=key)
    return genai.GenerativeModel(model_name)

def _gemini_error_response(e):
    """Converts Gemini exceptions to a JsonResponse."""
    err = str(e).lower()
    if "api_key" in err or "api key" in err or "authentication" in err:
        return JsonResponse({"error": "Invalid Gemini API key. Check GEMINI_API_KEY in .env"}, status=401)
    if "quota" in err or "rate" in err or "limit" in err:
        return JsonResponse({"error": "Gemini rate limit exceeded. Please wait a moment and retry."}, status=429)
    return JsonResponse({"error": f"Gemini error: {str(e)}"}, status=503)


@staff_member_required
@require_POST
def ai_spell_check(request):
    """Fix spelling errors only — Google Gemini 2.0 Flash (Free)"""
    try:
        data    = json.loads(request.body)
        content = data.get("content", "").strip()
        if not content:
            return JsonResponse({"error": "No content provided"}, status=400)

        model  = _get_gemini_model()
        prompt = (
            "You are a professional news editor. "
            "Fix ONLY spelling errors and typos in the given text.\n\n"
            "STRICT RULES:\n"
            "- Fix spelling errors and typos ONLY\n"
            "- Do NOT fix grammar or sentence structure\n"
            "- Do NOT change meaning, tone, or structure\n"
            "- Do NOT add or remove sentences\n"
            "- Return ONLY the corrected text, nothing else\n\n"
            f"Article text:\n{content}"
        )
        response  = model.generate_content(prompt)
        corrected = response.text.strip()
        return JsonResponse({"corrected": corrected})

    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=503)
    except Exception as e:
        return _gemini_error_response(e)


@staff_member_required
@require_POST
def ai_grammar_check(request):
    """Fix grammar, punctuation, sentence structure — Google Gemini 2.0 Flash (Free)"""
    try:
        data    = json.loads(request.body)
        content = data.get("content", "").strip()
        if not content:
            return JsonResponse({"error": "No content provided"}, status=400)

        model  = _get_gemini_model()
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
        response  = _get_gemini_model().generate_content(prompt)
        corrected = response.text.strip()

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
        return _gemini_error_response(e)


@staff_member_required
@require_POST
def ai_plagiarism_check(request):
    """Plagiarism / originality check — Google Gemini 2.0 Flash (Free)"""
    try:
        data = json.loads(request.body)
        text = data.get("text", "").strip()
        if not text or len(text) < 30:
            return JsonResponse({"error": "Content too short for plagiarism check"}, status=400)

        model  = _get_gemini_model()
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
        response = model.generate_content(prompt)
        raw      = response.text.strip()
        raw      = raw.replace("```json", "").replace("```", "").strip()
        result   = json.loads(raw)
        return JsonResponse(result)

    except (json.JSONDecodeError, ValueError) as e:
        return JsonResponse({"error": f"Could not parse AI response: {str(e)}"}, status=500)
    except Exception as e:
        return _gemini_error_response(e)


@staff_member_required
@require_POST
def ai_seo_keywords(request):
    """Suggest SEO keywords — Google Gemini 2.0 Flash (Free)"""
    try:
        data    = json.loads(request.body)
        title   = data.get("title", "").strip()
        content = data.get("content", "").strip()
        if not title and not content:
            return JsonResponse({"error": "No title or content provided"}, status=400)

        model  = _get_gemini_model()
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
        response = model.generate_content(prompt)
        raw      = response.text.strip()
        raw      = raw.replace("```json", "").replace("```", "").strip()
        keywords = json.loads(raw)
        if not isinstance(keywords, list):
            keywords = []
        return JsonResponse({"keywords": keywords[:12]})

    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"keywords": [], "error": "Could not parse AI response"}, status=200)
    except Exception as e:
        return _gemini_error_response(e)


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

    return render(request, 'admin/inbox.html', {
        'title':               'Inbox',
        'staff_users':         staff_users,
        'conversations':       conversations,
        'active_conversation': active_conversation,
        'messages':            conv_messages,
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
        return redirect(f'/inbox/?conv={existing.id}')

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


@staff_member_required
def online_status_view(request):
    users = User.objects.filter(is_staff=True).select_related('profile')
    data  = []
    for u in users:
        try:
            online = u.profile.is_online()
        except Exception:
            online = False
        data.append({'id': u.id, 'online': online})
    return JsonResponse(data, safe=False)


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

        url      = f"https://api.cricapi.com/v1/currentMatches?apikey={settings.CRICKET_API_KEY}&offset=0"
        response = requests.get(url, timeout=10)

        if response.status_code != 200:
            return Response({
                "error": f"Cricket API returned status {response.status_code}",
                "live": [], "upcoming": [], "recent": []
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        data = response.json()

        if data.get("status") != "success" or not data.get("data"):
            return Response({
                "error": "Invalid response from Cricket API",
                "live": [], "upcoming": [], "recent": []
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        matches  = data.get("data", [])
        live     = []
        upcoming = []
        recent   = []

        for match in matches:
            match_status = str(match.get("status", "")).lower()
            if "match over" in match_status or "won" in match_status or "beat" in match_status:
                recent.append(match)
            elif "upcoming" in match_status or "scheduled" in match_status:
                upcoming.append(match)
            else:
                live.append(match)

        return Response({
            "live":     live[:1],
            "upcoming": upcoming[:3],
            "recent":   recent[:3]
        })

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
