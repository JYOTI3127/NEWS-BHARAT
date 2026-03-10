from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .models import *
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

from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from .models import Category
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Category, Article
from .serializers import CategorySerializer, ArticleSerializer, ArticleMinSerializer


# All categories
def category_list_page(request):       # ← naam badla
    categories = Category.objects.all()
    return render(request, 'articles/category_list.html', {'categories': categories})

def category_detail_page(request, slug):   # ← naam badla
    category = get_object_or_404(Category, slug=slug)
    articles = category.get_articles()
    paginator = Paginator(articles, 6)
    page_obj = paginator.get_page(request.GET.get('page'))
    return render(request, 'articles/category_detail.html', {
        'category': category,
        'page_obj': page_obj,
    })


# ✅ Tumhara existing view — bas isme kuch nahi badla
@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


# ✅ CREATE
@api_view(['POST'])
def category_create(request):
    serializer = CategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ UPDATE
@api_view(['PUT'])
def category_update(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    serializer = CategorySerializer(cat, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ ARCHIVE
@api_view(['POST'])
def category_archive(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    cat.status = 'archived'
    cat.save(update_fields=['status'])
    return Response({'status': 'archived'})


# ✅ RESTORE
@api_view(['POST'])
def category_restore(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    cat.status = 'active'
    cat.save(update_fields=['status'])
    return Response({'status': 'active'})


# ✅ POSTS (category ke articles)
@api_view(['GET'])
def category_posts(request, cat_id):
    cat = get_object_or_404(Category, id=cat_id)
    articles = Article.objects.filter(
        category=cat, status='published'
    ).order_by('-created_at')[:10]
    serializer = ArticleMinSerializer(articles, many=True, context={'request': request})
    return Response({
        'posts': serializer.data,
        'total': cat.get_article_count()
    })

@api_view(['GET', 'POST'])
def article_list(request):

    if request.method == 'GET':
        user = request.user

        if not user.is_authenticated:
            return Response({"error": "Authentication required"}, status=401)

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

        serializer = ArticleSerializer(articles, many=True, context={'request': request})
        return Response(serializer.data)


    if request.method == 'POST':
        serializer = ArticleSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            serializer.save(author=request.user)
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


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
    total_authors = User.objects.filter(article_set__isnull=False).distinct().count()
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

@api_view(['GET', 'PUT', 'DELETE'])
def article_detail(request, pk):
    try:
        article = Article.objects.get(pk=pk)
    except Article.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if request.method == "GET":
        serializer = ArticleSerializer(article, context={'request': request})
        return Response(serializer.data)

    elif request.method == "PUT":
        serializer = ArticleSerializer(article, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    elif request.method == "DELETE":
        article.delete()
        return Response(status=204)

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

# ============================================================
#  views.py  —  Secure Login View
#  Handles:
#   - Password strength validation
#   - Rate limiting per IP
#   - Failed attempt tracking
#   - Account lockout (30 min after 3 wrong attempts)
#   - Credential regeneration (after 6 total attempts)
#   - 2FA check (if enabled)
#   - Remember Me (7-day session vs 30-min timeout)
#   - Screen message + Email notification on lockout/regen
#   - Full audit logging
# ============================================================

from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib import messages

from .models import UserProfile, LoginAttemptLog
from datetime import timedelta
import json


# ── Rate Limit Config ─────────────────────────────────────────
MAX_ATTEMPTS_PER_IP  = 10          # max login tries from one IP in the window
RATE_LIMIT_WINDOW    = 10          # minutes to look back


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def is_rate_limited(profile, ip):
    """
    Check if this IP has exceeded MAX_ATTEMPTS_PER_IP
    in the last RATE_LIMIT_WINDOW minutes.
    """
    now      = timezone.now()
    cutoff   = (now - timedelta(minutes=RATE_LIMIT_WINDOW)).isoformat()
    log      = profile.login_attempts_ip  # dict: { ip: [iso_timestamps] }

    timestamps = [t for t in log.get(ip, []) if t > cutoff]
    log[ip]    = timestamps                   # prune old entries
    profile.login_attempts_ip = log
    profile.save(update_fields=['login_attempts_ip'])

    return len(timestamps) >= MAX_ATTEMPTS_PER_IP


def record_ip_attempt(profile, ip):
    now  = timezone.now().isoformat()
    log  = profile.login_attempts_ip
    log.setdefault(ip, []).append(now)
    profile.login_attempts_ip = log
    profile.save(update_fields=['login_attempts_ip'])


# ── Email Notifications ───────────────────────────────────────

def send_lockout_email(user, lock_minutes=30):
    """Tell the user their account is locked."""
    if not user.email:
        return
    send_mail(
        subject="⚠️ News4Bharat — Account Locked",
        message=(
            f"Hello {user.get_full_name() or user.username},\n\n"
            f"Your account has been locked for {lock_minutes} minutes due to "
            f"multiple failed login attempts.\n\n"
            f"If this was not you, please contact the administrator immediately.\n\n"
            f"Your account will automatically unlock after {lock_minutes} minutes.\n\n"
            f"— News4Bharat Security Team"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_regeneration_email(user, new_uid, new_pass):
    """Send the brand-new credentials to the user after regeneration."""
    if not user.email:
        return
    send_mail(
        subject="🔐 News4Bharat — Your New Login Credentials",
        message=(
            f"Hello {user.get_full_name() or user.username},\n\n"
            f"Due to too many failed login attempts, your old credentials have been "
            f"permanently deleted and new ones have been generated.\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"  New User ID  : {new_uid}\n"
            f"  New Password : {new_pass}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Please log in with these new credentials immediately and keep them safe.\n"
            f"Do NOT share these with anyone.\n\n"
            f"If you did not request this, contact your administrator.\n\n"
            f"— News4Bharat Security Team"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


# ── Login View ────────────────────────────────────────────────

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

    # ── Step 1: Does user exist? ──────────────────────────────
    try:
        user_obj = User.objects.get(username=username)
        profile  = user_obj.profile
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        LoginAttemptLog.objects.create(
            username_tried=username, ip_address=ip,
            user_agent=ua, status='wrong_pass',
            note='Username not found'
        )
        messages.error(request, "Invalid username or password.")
        return render(request, 'newsapp/login.html')

    # ── Step 2: Rate limiting (per IP) ───────────────────────
    if is_rate_limited(profile, ip):
        LoginAttemptLog.objects.create(
            user=user_obj, username_tried=username,
            ip_address=ip, user_agent=ua,
            status='rate_limit',
            note=f'IP {ip} exceeded {MAX_ATTEMPTS_PER_IP} attempts'
        )
        messages.error(
            request,
            f"Too many attempts from your network. Please wait {RATE_LIMIT_WINDOW} minutes."
        )
        return render(request, 'newsapp/login.html')

    # ── Step 3: Is account locked? ────────────────────────────
    if profile.is_locked:
        LoginAttemptLog.objects.create(
            user=user_obj, username_tried=username,
            ip_address=ip, user_agent=ua,
            status='locked',
            note=f'Account locked until {profile.locked_until}'
        )
        messages.error(
            request,
            f"🔒 Account locked. Try again in {profile.lock_remaining_minutes} minute(s)."
        )
        return render(request, 'newsapp/login.html')

    # ── Step 4: Authenticate password ────────────────────────
    user = authenticate(request, username=username, password=password)

    if user is None:
        # Wrong password — record it
        record_ip_attempt(profile, ip)
        result = profile.record_failed_attempt()

        if result == 'regenerated':
            # New credentials generated — email them
            new_uid  = profile.user_id
            new_pass = profile.plain_password
            send_regeneration_email(user_obj, new_uid, new_pass)
            LoginAttemptLog.objects.create(
                user=user_obj, username_tried=username,
                ip_address=ip, user_agent=ua,
                status='regenerated',
                note='6 total failed attempts — credentials regenerated'
            )
            messages.error(
                request,
                "🚨 Too many failed attempts. Your old credentials are DELETED. "
                "New credentials have been sent to your registered email."
            )

        elif result == 'locked':
            send_lockout_email(user_obj)
            LoginAttemptLog.objects.create(
                user=user_obj, username_tried=username,
                ip_address=ip, user_agent=ua,
                status='locked',
                note='3 failed attempts — account locked 30 min'
            )
            messages.error(
                request,
                f"🔒 Account locked for 30 minutes due to {profile.failed_attempts} "
                f"failed attempts. A notification has been sent to your email."
            )

        else:
            remaining = 3 - profile.failed_attempts
            LoginAttemptLog.objects.create(
                user=user_obj, username_tried=username,
                ip_address=ip, user_agent=ua,
                status='wrong_pass',
                note=f'Attempt {profile.failed_attempts}/3'
            )
            messages.error(
                request,
                f"❌ Wrong password. {remaining} attempt(s) remaining before lockout."
            )

        return render(request, 'newsapp/login.html')

    # ── Step 5: 2FA check (if enabled) ───────────────────────
    if profile.is_2fa_enabled:
        if not totp_token:
            # Ask for 2FA token — render form with 2FA field visible
            return render(request, 'newsapp/login.html', {
                'show_2fa': True,
                'username': username,
                'password': password,
            })
        if not profile.verify_totp(totp_token):
            LoginAttemptLog.objects.create(
                user=user_obj, username_tried=username,
                ip_address=ip, user_agent=ua,
                status='2fa_fail',
                note='Wrong TOTP token'
            )
            messages.error(request, "❌ Invalid 2FA code. Please try again.")
            return render(request, 'newsapp/login.html', {
                'show_2fa': True,
                'username': username,
                'password': password,
            })

    # ── Step 6: All checks passed — log in ───────────────────
    profile.reset_failed_attempts()

    # Session timeout — Remember Me = 7 days, else = 30 min
    if remember_me:
        request.session.set_expiry(60 * 60 * 24 * 7)   # 7 days
        profile.remember_me = True
    else:
        request.session.set_expiry(60 * profile.session_timeout_min)  # 30 min default
        profile.remember_me = False
    profile.save(update_fields=['remember_me'])

    login(request, user)
    record_ip_attempt(profile, ip)   # record successful attempt too (for analytics)

    LoginAttemptLog.objects.create(
        user=user_obj, username_tried=username,
        ip_address=ip, user_agent=ua,
        status='success'
    )

    return redirect('dashboard')


# ── Logout ────────────────────────────────────────────────────

@login_required
def secure_logout_view(request):
    logout(request)
    messages.success(request, "You have been logged out successfully.")
    return redirect('login')


# ── My Credentials (user sees their own only) ─────────────────

@login_required
def my_credentials(request):
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        profile = None
    return render(request, 'newsapp/my_credentials.html', {'profile': profile})

import os
import json
import anthropic
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.admin.views.decorators import staff_member_required

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

@staff_member_required
@require_POST
def ai_spell_check(request):
    """
    POST /api/ai/spell-check/
    Body: { "content": "article text..." }
    Returns: { "corrected": "fixed text..." }
    """
    try:
        data = json.loads(request.body)
        content = data.get("content", "").strip()
        if not content:
            return JsonResponse({"error": "No content provided"}, status=400)

        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""You are a professional news editor. Fix ALL spelling and grammar mistakes in the following article text.

RULES:
- Fix spelling errors, grammar mistakes, punctuation issues
- Do NOT change the meaning, tone, or structure
- Do NOT add or remove sentences
- Return ONLY the corrected text, nothing else — no explanations, no preamble

Article text:
{content}"""
                }
            ]
        )

        corrected = message.content[0].text.strip()
        return JsonResponse({"corrected": corrected})

    except anthropic.APIError as e:
        return JsonResponse({"error": f"AI error: {str(e)}"}, status=503)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@staff_member_required
@require_POST
def ai_seo_keywords(request):
    """
    POST /api/ai/seo-keywords/
    Body: { "title": "...", "content": "..." }
    Returns: { "keywords": ["keyword1", "keyword2", ...] }
    """
    try:
        data = json.loads(request.body)
        title = data.get("title", "").strip()
        content = data.get("content", "").strip()

        if not title and not content:
            return JsonResponse({"error": "No title or content provided"}, status=400)

        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": f"""You are an SEO expert for a news website (Indian news context).

Analyze this article and suggest the 10 best SEO keywords/phrases.

Article Title: {title}
Article Content: {content[:1000]}

RULES:
- Return ONLY a JSON array of strings, nothing else
- Mix short keywords (1-2 words) and long-tail phrases (3-4 words)
- Focus on what Indian readers would search for
- Include both English and relevant Hinglish terms if appropriate
- Example format: ["keyword one", "keyword two", "long tail phrase here"]

Return the JSON array now:"""
                }
            ]
        )

        raw = message.content[0].text.strip()
        # Clean markdown if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        keywords = json.loads(raw)

        if not isinstance(keywords, list):
            keywords = []

        return JsonResponse({"keywords": keywords[:12]})

    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"keywords": [], "error": "Could not parse AI response"}, status=200)
    except anthropic.APIError as e:
        return JsonResponse({"error": f"AI error: {str(e)}"}, status=503)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@staff_member_required
def media_photos_api(request):
    """
    Saare articles ki images return karta hai.
    Sirf wahi articles jinka image field khali nahi hai.
    """
    articles = (
        Article.objects
        .exclude(image__isnull=True)
        .exclude(image__exact='')
        .order_by('-id')          # latest pehle
    )

    items = []
    for article in articles:
        try:
            items.append({
                'url':        request.build_absolute_uri(article.image.url),
                'name':       article.title,
                'article_id': article.id,
            })
        except Exception:
            pass   # broken image skip karo

    return JsonResponse({'items': items})


@staff_member_required
def media_videos_api(request):
    """
    Abhi video model nahi hai — empty list return karta hai.
    Future mein video field add karo to yahan update karna.
    """
    return JsonResponse({'items': []})




















