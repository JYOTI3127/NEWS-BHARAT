from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .models import *
from .serializers import CategorySerializer, ArticleSerializer
from .utils import has_permission
import json
from django.shortcuts import render,redirect
from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.db.models import F
import json
from datetime import timedelta
import requests
from django.conf import settings


@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def article_list(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    if user.is_superuser:
        articles = Article.objects.all()

    else:
        profile = user.userprofile

        # Reporter → sirf assigned articles
        if profile.roles.filter(name="Reporter").exists():
            articles = Article.objects.filter(assigned_to=user)

        # Editor → sab articles
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
    article.save()

def dashboard_view(request):

    if not request.user.is_staff:
        return redirect("admin:login")

    now = timezone.now()
    start_of_month = now.replace(day=1)
    week_ago = now - timedelta(days=7)

    # ───────────── KPI COUNTS ─────────────

    total_articles = Article.objects.count()
    published_articles = Article.objects.filter(status='published').count()
    review_articles = Article.objects.filter(status='review').count()
    fact_check_articles = Article.objects.filter(status='fact_check').count()
    draft_articles = Article.objects.filter(status='draft').count()
    scheduled_articles = Article.objects.filter(status='scheduled').count()
    archived_articles = Article.objects.filter(status='archived').count()
    rejected_articles = Article.objects.filter(status='rejected').count()
    paid_articles = Article.objects.filter(is_paid=True).count()

    overdue_articles = Article.objects.filter(
        deadline__lt=now
    ).exclude(status='published').count()

    published_this_week = Article.objects.filter(
        status='published',
        published_at__gte=week_ago
    ).count()

    published_this_month = Article.objects.filter(
        status='published',
        published_at__gte=start_of_month
    ).count()

    # ───────────── AUTHORS & CATEGORIES ─────────────

    User = get_user_model()
    total_authors = User.objects.filter(article__isnull=False).distinct().count()
    total_categories = Category.objects.count()

    # ───────────── RECENT ARTICLES ─────────────

    recent_articles = Article.objects.select_related(
        'category', 'author', 'assigned_to'
    ).order_by('-created_at')[:8]

    # ───────────── CATEGORY STATS ─────────────

    category_data = (
        Article.objects
        .values('category__name')
        .annotate(article_count=Count('id'))
        .order_by('-article_count')
    )

    max_count = max((c['article_count'] for c in category_data), default=1)

    category_stats = [
        {
            'name': c['category__name'],
            'article_count': c['article_count'],
            'pct': round((c['article_count'] / max_count) * 100, 1)
        }
        for c in category_data
    ]

    # ───────────── MONTHLY PUBLISH DATA ─────────────

    monthly_data = (
        Article.objects
        .filter(status='published', published_at__isnull=False)
        .annotate(month=TruncMonth('published_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    monthly_labels = []
    monthly_pub = []

    for m in monthly_data:
        monthly_labels.append(m['month'].strftime("%b %Y"))
        monthly_pub.append(m['count'])

    # Draft monthly (created basis)
    monthly_draft_qs = (
        Article.objects
        .filter(status='draft')
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    monthly_draft = [m['count'] for m in monthly_draft_qs]

    # ───────────── DONUT DATA ─────────────

    donut_data = [
        published_articles,
        draft_articles,
        review_articles,
        archived_articles,
        rejected_articles,
        fact_check_articles,
    ]

    # ───────────── FACT CHECK STATS ─────────────

    pending_fact_checks = FactCheck.objects.filter(status='pending').count()
    verified_fact_checks = FactCheck.objects.filter(status='verified').count()
    issues_fact_checks = FactCheck.objects.filter(status='issues_found').count()

    # ───────────── WORKFLOW LOGS ─────────────

    recent_logs = ArticleWorkflowLog.objects.select_related(
        'article', 'changed_by'
    ).order_by('-changed_at')[:6]

    # ───────────── TOP REPORTERS ─────────────

    top_reporters = ReporterPerformance.objects.select_related(
        'reporter'
    ).order_by('-published_articles')[:5]

    # ───────────── HOMEPAGE SLOTS (HYBRID) ─────────────

    homepage_slots = HomepageSlot.objects.filter(is_active=True)

    # ───────────── CONTEXT ─────────────

    context = {
        # KPIs
        "total_articles": total_articles,
        "published_articles": published_articles,
        "review_articles": review_articles,
        "fact_check_articles": fact_check_articles,
        "draft_articles": draft_articles,
        "scheduled_articles": scheduled_articles,
        "archived_articles": archived_articles,
        "rejected_articles": rejected_articles,
        "paid_articles": paid_articles,
        "overdue_articles": overdue_articles,
        "published_this_week": published_this_week,
        "published_this_month": published_this_month,

        # Meta
        "total_authors": total_authors,
        "total_categories": total_categories,

        # Tables
        "recent_articles": recent_articles,
        "recent_logs": recent_logs,
        "top_reporters": top_reporters,

        # Category
        "category_stats": category_stats,

        # Charts (JSON safe)
        "monthly_labels_json": json.dumps(monthly_labels),
        "monthly_pub_json": json.dumps(monthly_pub),
        "monthly_draft_json": json.dumps(monthly_draft),
        "donut_data_json": json.dumps(donut_data),

        # Fact check
        "pending_fact_checks": pending_fact_checks,
        "verified_fact_checks": verified_fact_checks,
        "issues_fact_checks": issues_fact_checks,

        # Homepage Control
        "homepage_slots": homepage_slots,
    }

    return render(request, "admin/index.html", context)

@api_view(['GET'])
def weather_api(request):
    city = request.GET.get("city", "Delhi")

    url = "https://api.openweathermap.org/data/2.5/weather"

    params = {
        "q": city,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric"
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        data = response.json()

        if response.status_code != 200:
            return Response({"error": "City not found"}, status=400)

        return Response({
            "city": city,
            "temperature": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"]
        })

    except Exception:
        return Response({"error": "Weather service unavailable"}, status=500)
    
@api_view(['GET'])
def metal_ticker(request):

    gold = MetalRate.objects.filter(
        metal_type="gold"
    ).order_by('-created_at').first()

    silver = MetalRate.objects.filter(
        metal_type="silver"
    ).order_by('-created_at').first()

    return Response({
        "gold": {
            "price": gold.price if gold else 0,
            "change": gold.change if gold else 0,
            "percent_change": gold.percent_change if gold else 0,
            "trend": gold.trend if gold else "neutral"
        },
        "silver": {
            "price": silver.price if silver else 0,
            "change": silver.change if silver else 0,
            "percent_change": silver.percent_change if silver else 0,
            "trend": silver.trend if silver else "neutral"
        }
    })

from .utils import fetch_and_store_metal_rates


@api_view(['GET'])
def update_metal_rates(request):
    fetch_and_store_metal_rates()
    return Response({"message": "Rates updated successfully"})

from .utils import fetch_index_data


@api_view(['GET'])
def market_indices(request):

    nifty = fetch_index_data("^NSEI")
    sensex = fetch_index_data("^BSESN")

    return Response({
        "nifty": nifty,
        "sensex": sensex
    })
    

# ═══════════════════════════════════════════════════════
# 1. DATE & TIME API
#    GET /api/datetime/
# ═══════════════════════════════════════════════════════

@require_GET
def datetime_api(request):
    """
    Returns current date, time, and day info.
    Frontend can call this every minute to keep it live.
    
    Response:
    {
        "date": "Tuesday, 24 February 2026",
        "time": "16:30",
        "day": "Tuesday",
        "month": "February",
        "year": 2026,
        "timestamp": "2026-02-24T16:30:00+05:30"
    }
    """
    now = timezone.localtime(timezone.now())

    return JsonResponse({
        "date":      now.strftime("%A, %d %B %Y"),       # Tuesday, 24 February 2026
        "date_short": now.strftime("%d %b %Y"),           # 24 Feb 2026
        "time":      now.strftime("%I:%M %p"),            # 04:30 PM
        "time_24":   now.strftime("%H:%M"),               # 16:30
        "day":       now.strftime("%A"),                  # Tuesday
        "day_short": now.strftime("%a"),                  # Tue
        "month":     now.strftime("%B"),                  # February
        "year":      now.year,
        "timestamp": now.isoformat(),                     # ISO 8601
    })


# ═══════════════════════════════════════════════════════
# 2. SEARCH API  (Elasticsearch + Django ORM fallback)
#    GET /api/search/?q=<query>&type=<all|article|category>&limit=<n>
# ═══════════════════════════════════════════════════════

def _format_article(article, highlight=None):
    content_text = article.content or ''
    excerpt = content_text[:120] + '...' if len(content_text) > 120 else content_text
    return {
        "id":           article.id,
        "title":        article.title,
        "slug":         getattr(article, 'slug', str(article.id)),
        "category":     article.category.name if article.category else None,
        "category_id":  article.category.id   if article.category else None,
        "author":       article.author.username if article.author else None,
        "status":       article.status,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "created_at":   article.created_at.isoformat()   if article.created_at   else None,
        "image":        str(article.image) if article.image else None,
        "excerpt":      highlight or excerpt,
        "is_paid":      getattr(article, 'is_paid', False),
    }


def _search_elasticsearch(query, status, limit):
    """Elasticsearch — typo tolerance + Hindi support."""
    from .documents import ArticleDocument
    from elasticsearch_dsl import Q as ESQ

    es_query = ArticleDocument.search()

    if status != 'all':
        es_query = es_query.filter('term', status=status)

    es_query = es_query.query(
        ESQ('bool',
            should=[
                # Exact/near-exact match
                ESQ('multi_match',
                    query=query,
                    fields=[
                        'title^5',
                        'title.autocomplete^3',
                        'category.name^3',
                        'author.username^2',
                        'content',
                    ],
                    type='best_fields',
                    operator='or',
                ),
                # Typo tolerance — "politcs" → "politics"
                ESQ('multi_match',
                    query=query,
                    fields=['title.fuzzy^3', 'content.fuzzy'],
                    fuzziness='AUTO',
                    prefix_length=1,
                ),
                # Partial match — "pol" → "politics"
                ESQ('match', **{'title.autocomplete': {'query': query, 'boost': 2}}),
            ],
            minimum_should_match=1,
        )
    )

    # Highlight matched text
    es_query = es_query.highlight(
        'title', 'content',
        fragment_size=120,
        pre_tags=['<mark>'],
        post_tags=['</mark>'],
    )

    es_query = es_query[:limit]
    response = es_query.execute()

    from .models import Article
    articles_data = []
    for hit in response:
        try:
            article = Article.objects.select_related('author', 'category').get(id=hit.meta.id)
            highlight_text = None
            if hasattr(hit.meta, 'highlight'):
                if hasattr(hit.meta.highlight, 'content'):
                    highlight_text = ' ... '.join(hit.meta.highlight.content)
                elif hasattr(hit.meta.highlight, 'title'):
                    highlight_text = hit.meta.highlight.title[0]
            articles_data.append(_format_article(article, highlight_text))
        except Exception:
            continue

    return articles_data


def _search_django_orm(query, status, limit):
    """Fallback ORM search jab Elasticsearch available na ho."""
    from .models import Article
    qs = Article.objects.filter(
        Q(title__icontains=query)   |
        Q(content__icontains=query) |
        Q(author__username__icontains=query) |
        Q(category__name__icontains=query)
    ).select_related('author', 'category')

    if status != 'all':
        qs = qs.filter(status=status)

    return [_format_article(a) for a in qs.order_by('-published_at', '-created_at')[:limit]]


@require_GET
def search_api(request):
    query  = request.GET.get('q', '').strip()
    type_  = request.GET.get('type', 'all')
    limit  = min(int(request.GET.get('limit', 8)), 20)
    status = request.GET.get('status', 'published')

    if len(query) < 2:
        return JsonResponse({
            "query": query, "total": 0,
            "articles": [], "categories": [],
            "error": "Query must be at least 2 characters"
        }, status=400)

    articles_data   = []
    categories_data = []
    search_engine   = "orm"

    # ── ARTICLE SEARCH ──────────────────────────────────
    if type_ in ('all', 'article'):
        try:
            articles_data = _search_elasticsearch(query, status, limit)
            search_engine = "elasticsearch"
        except Exception:
            # ES down ya not configured → ORM fallback
            articles_data = _search_django_orm(query, status, limit)
            search_engine = "orm_fallback"

    # ── CATEGORY SEARCH ─────────────────────────────────
    if type_ in ('all', 'category'):
        from .models import Category
        for cat in Category.objects.filter(
            Q(name__icontains=query)
        ).annotate(
            article_count=Count('article', filter=Q(article__status='published'))
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



























