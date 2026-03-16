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
import anthropic
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
    articles = category.get_articles()
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
        category=cat, status='published'
    ).order_by('-created_at')[:10]
    serializer = ArticleMinSerializer(articles, many=True, context={'request': request})
    return Response({
        'posts': serializer.data,
        'total': cat.get_article_count()
    })


# ═══════════════════════════════════════════════════════
# ARTICLE VIEWS
# ═══════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
def article_list(request):
    if request.method == "GET":
        articles = Article.objects.filter(status="published")
        serializer = ArticleSerializer(articles, many=True)
        return Response(serializer.data)
    elif request.method == "POST":
        serializer = ArticleSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
    from django.utils import timezone
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
        # Handle publish action
        try:
            update_article_status(request, article)
            serializer = ArticleSerializer(article, context={'request': request})
            return Response({"message": "Article published successfully", "data": serializer.data})
        except PermissionDenied as e:
            return Response({"error": str(e)}, status=403)
        except Exception as e:
            return Response({"error": f"Failed to publish: {str(e)}"}, status=400)
    elif request.method == "PUT":
        serializer = ArticleSerializer(article, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    elif request.method == "DELETE":
        article.delete()
        return Response(status=204)


# ═══════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════

def dashboard_view(request):
    if not request.user.is_staff:
        return redirect("admin:login")

    now = timezone.now()
    start_of_month = now.replace(day=1)
    week_ago = now - timedelta(days=7)

    total_articles       = Article.objects.count()
    published_articles   = Article.objects.filter(status='published').count()
    review_articles      = Article.objects.filter(status='review').count()
    fact_check_articles  = Article.objects.filter(status='fact_check').count()
    draft_articles       = Article.objects.filter(status='draft').count()
    scheduled_articles   = Article.objects.filter(status='scheduled').count()
    archived_articles    = Article.objects.filter(status='archived').count()
    rejected_articles    = Article.objects.filter(status='rejected').count()
    paid_articles        = Article.objects.filter(is_paid=True).count()

    overdue_articles = Article.objects.filter(
        deadline__lt=now
    ).exclude(status='published').count()

    published_this_week = Article.objects.filter(
        status='published', published_at__gte=week_ago
    ).count()

    published_this_month = Article.objects.filter(
        status='published', published_at__gte=start_of_month
    ).count()

    total_authors    = User.objects.filter(article_set__isnull=False).distinct().count()
    total_categories = Category.objects.count()

    recent_articles = Article.objects.select_related(
        'category', 'author', 'assigned_to'
    ).order_by('-created_at')[:8]

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

    pending_fact_checks  = FactCheck.objects.filter(status='pending').count()
    verified_fact_checks = FactCheck.objects.filter(status='verified').count()
    issues_fact_checks   = FactCheck.objects.filter(status='issues_found').count()

    recent_logs = ArticleWorkflowLog.objects.select_related(
        'article', 'changed_by'
    ).order_by('-changed_at')[:6]

    top_reporters = ReporterPerformance.objects.select_related(
        'reporter'
    ).order_by('-published_articles')[:5]

    homepage_slots = HomepageSlot.objects.filter(is_active=True)

    context = {
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
        "total_authors": total_authors,
        "total_categories": total_categories,
        "recent_articles": recent_articles,
        "recent_logs": recent_logs,
        "top_reporters": top_reporters,
        "category_stats": category_stats,
        "monthly_labels_json": json.dumps(monthly_labels),
        "monthly_pub_json": json.dumps(monthly_pub),
        "monthly_draft_json": json.dumps(monthly_draft),
        "donut_data_json": json.dumps(donut_data),
        "pending_fact_checks": pending_fact_checks,
        "verified_fact_checks": verified_fact_checks,
        "issues_fact_checks": issues_fact_checks,
        "homepage_slots": homepage_slots,
    }
    return render(request, "admin/index.html", context)


# ═══════════════════════════════════════════════════════
# WEATHER, METALS, MARKET
# ═══════════════════════════════════════════════════════

@api_view(['GET'])
def weather_api(request):
    city = request.GET.get("city", "Delhi")
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"}
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
    gold   = MetalRate.objects.filter(metal_type="gold").order_by('-created_at').first()
    silver = MetalRate.objects.filter(metal_type="silver").order_by('-created_at').first()
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
    from .documents import ArticleDocument
    from elasticsearch_dsl import Q as ESQ
    es_query = ArticleDocument.search()
    if status != 'all':
        es_query = es_query.filter('term', status=status)
    es_query = es_query.query(
        ESQ('bool', should=[
            ESQ('multi_match', query=query,
                fields=['title^5', 'title.autocomplete^3', 'category.name^3', 'author.username^2', 'content'],
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
    qs = Article.objects.filter(
        Q(title__icontains=query) | Q(content__icontains=query) |
        Q(author__username__icontains=query) | Q(category__name__icontains=query)
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
        return JsonResponse({"query": query, "total": 0, "articles": [], "categories": [],
                             "error": "Query must be at least 2 characters"}, status=400)

    articles_data = []
    categories_data = []
    search_engine = "orm"

    if type_ in ('all', 'article'):
        try:
            articles_data = _search_elasticsearch(query, status, limit)
            search_engine = "elasticsearch"
        except Exception:
            articles_data = _search_django_orm(query, status, limit)
            search_engine = "orm_fallback"

    if type_ in ('all', 'category'):
        for cat in Category.objects.filter(Q(name__icontains=query)).annotate(
            article_count=Count('articles', filter=Q(articles__status='published'))
        ).order_by('-article_count')[:limit]:
            categories_data.append({
                "id": cat.id, "name": cat.name,
                "slug": getattr(cat, 'slug', str(cat.id)),
                "article_count": cat.article_count,
            })

    return JsonResponse({
        "query": query,
        "total": len(articles_data) + len(categories_data),
        "articles": articles_data,
        "categories": categories_data,
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
    now       = timezone.now()
    cutoff    = (now - timedelta(minutes=RATE_LIMIT_WINDOW)).isoformat()
    log       = profile.login_attempts_ip
    timestamps = [t for t in log.get(ip, []) if t > cutoff]
    log[ip]   = timestamps
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
            messages.error(request, f"🔒 Account locked for 30 minutes. A notification has been sent to your email.")
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
# AI VIEWS
# ═══════════════════════════════════════════════════════

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


@staff_member_required
@require_POST
def ai_spell_check(request):
    try:
        data    = json.loads(request.body)
        content = data.get("content", "").strip()
        if not content:
            return JsonResponse({"error": "No content provided"}, status=400)
        message = client.messages.create(
            model="claude-opus-4-6", max_tokens=4096,
            messages=[{"role": "user", "content": f"""You are a professional news editor. Fix ALL spelling and grammar mistakes in the following article text.

RULES:
- Fix spelling errors, grammar mistakes, punctuation issues
- Do NOT change the meaning, tone, or structure
- Do NOT add or remove sentences
- Return ONLY the corrected text, nothing else

Article text:
{content}"""}]
        )
        return JsonResponse({"corrected": message.content[0].text.strip()})
    except anthropic.APIError as e:
        return JsonResponse({"error": f"AI error: {str(e)}"}, status=503)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@staff_member_required
@require_POST
def ai_seo_keywords(request):
    try:
        data    = json.loads(request.body)
        title   = data.get("title", "").strip()
        content = data.get("content", "").strip()
        if not title and not content:
            return JsonResponse({"error": "No title or content provided"}, status=400)
        message = client.messages.create(
            model="claude-opus-4-6", max_tokens=512,
            messages=[{"role": "user", "content": f"""You are an SEO expert for a news website (Indian news context).
Analyze this article and suggest the 10 best SEO keywords/phrases.

Article Title: {title}
Article Content: {content[:1000]}

RULES:
- Return ONLY a JSON array of strings, nothing else
- Mix short keywords (1-2 words) and long-tail phrases (3-4 words)
- Focus on what Indian readers would search for
- Include both English and relevant Hinglish terms if appropriate
- Example format: ["keyword one", "keyword two", "long tail phrase here"]

Return the JSON array now:"""}]
        )
        raw = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
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
                'url': request.build_absolute_uri(article.image.url),
                'name': article.title,
                'article_id': article.id,
            })
        except Exception:
            pass
    return JsonResponse({'items': items})


@staff_member_required
def media_videos_api(request):
    return JsonResponse({'items': []})


# ═══════════════════════════════════════════════════════
# INBOX VIEWS  ← FIXED
# ═══════════════════════════════════════════════════════

@staff_member_required
def inbox_view(request):
    staff_users = User.objects.filter(is_staff=True).exclude(pk=request.user.pk)

    conversations = Conversation.objects.filter(
        conversationmember__user=request.user
    ).prefetch_related(
        'members',
        'messages',
        'messages__sender',
    ).order_by('-updated_at').distinct()

    conv_id = request.GET.get("conv")

    active_conversation = None
    messages = []

    if conv_id:
        try:
            active_conversation = conversations.get(id=conv_id)
        except Conversation.DoesNotExist:
            active_conversation = None

    # ⭐ agar conv select nahi hai → latest open karo
    if not active_conversation and conversations.exists():
        active_conversation = conversations.first()

    if active_conversation:
        messages = active_conversation.messages.select_related(
            "sender"
        ).order_by("created_at")

    return render(request, 'admin/inbox.html', {
        'title': 'Inbox',
        'staff_users': staff_users,
        'conversations': conversations,
        'active_conversation': active_conversation,
        'messages': messages,
    })


@staff_member_required
def new_chat(request):
    users = User.objects.filter(is_staff=True).exclude(id=request.user.id).order_by('first_name', 'username')
    return render(request, 'admin/new_chat.html', {
        'title': 'New Chat',
        'all_users': users,
    })


@staff_member_required
def start_conversation(request, user_id):
    other_user = get_object_or_404(User, id=user_id)

    # Pehle check karo — existing private conv hai kya?
    existing = Conversation.objects.filter(
        conv_type='private',
        conversationmember__user=request.user
    ).filter(
        conversationmember__user=other_user
    ).first()

    if existing:
        return redirect(f'/inbox/?conv={existing.id}')

    # Naya banao — ✅ through model se manually add karo
    conv = Conversation.objects.create(conv_type='private')
    ConversationMember.objects.create(conversation=conv, user=request.user)
    ConversationMember.objects.create(conversation=conv, user=other_user)

    return redirect(f"{reverse('admin_inbox')}?conv={conv.id}")


@staff_member_required
@require_POST
def send_message(request):
    print("SEND MESSAGE VIEW HIT")
    conv_id = request.POST.get("conversation_id")
    text    = request.POST.get("text", "").strip()

    if not conv_id or not text:
        return JsonResponse({"error": "Missing data"}, status=400)

    try:
        conv = Conversation.objects.get(id=conv_id)
    except Conversation.DoesNotExist:
        return JsonResponse({"error": "Conversation not found"}, status=404)

    # ✅ Member check — through model se
    if not ConversationMember.objects.filter(conversation=conv, user=request.user).exists():
        return JsonResponse({"error": "Not a member"}, status=403)

    receiver = None

    msg = Message.objects.create(
        conversation=conv,
        sender=request.user,
        receiver=receiver,
        text=text,
        message_type='text',
    )

    conv.updated_at = timezone.now()
    conv.save(update_fields=["updated_at"])

    # Notification baaki members ko
    for member in conv.members.exclude(id=request.user.id):
        Notification.objects.create(
            user=member,
            notif_type="message",
            title="New Message",
            message=f"{request.user.get_full_name() or request.user.username} sent a message",
            icon="💬",
            action_url="/admin/inbox/", 
        )

    return JsonResponse({
        "status": "ok",
        "msg_id": msg.id,
        "time":   msg.created_at.strftime("%H:%M")
    })


@staff_member_required
@require_POST
def create_group(request):
    name       = request.POST.get('name', '').strip()
    member_ids = request.POST.getlist('member_ids')
    print("CREATE GROUP HIT")
    print(request.POST)

    if not name or len(member_ids) < 2:
        return JsonResponse({'error': 'Group name aur kam se kam 2 members chahiye'}, status=400)

    conv = Conversation.objects.create(conv_type='group', name=name)

    ConversationMember.objects.create(
    conversation=conv,
    user=request.user
    )

    for uid in member_ids:
        try:
            u = User.objects.get(id=int(uid))
            ConversationMember.objects.get_or_create(conversation=conv, user=u)
        except (User.DoesNotExist, ValueError):
            pass

    return JsonResponse({
    'ok': True,
    'redirect': f"{reverse('admin_inbox')}?conv={conv.id}"
})


# ═══════════════════════════════════════════════════════
# NOTIFICATIONS VIEW
# ═══════════════════════════════════════════════════════

@staff_member_required
def notifications_view(request):

    notifications = Notification.objects.filter(
        user=request.user,
        is_archived=False
    ).order_by('-created_at')

    archived_notifications = Notification.objects.filter(
        user=request.user,
        is_archived=True
    ).order_by('-created_at')

    unread_notifications = notifications.filter(is_read=False).count()

    unread_messages = Message.objects.filter(
        conversation__conversationmember__user=request.user
    ).exclude(sender=request.user).filter(is_read=False).count()

    notifications_today = Notification.objects.filter(
    user=request.user,
    created_at__date=timezone.now().date()
    ).count()

    return render(request, 'admin/notifications.html', {
        'title': 'Notifications',
        'notifications': notifications,
        'archived_notifications': archived_notifications,
        'unread_notifications': unread_notifications,
        'unread_messages': unread_messages,
        'notifications_today': notifications_today
    })

@login_required
def archive_notification(request, id):
    if request.method == "POST":
        try:
            notif = Notification.objects.get(id=id, user=request.user)
            notif.is_archived = True
            notif.is_read = True
            notif.save()
            return JsonResponse({"status": "archived"})
        except Notification.DoesNotExist:
            return JsonResponse({"error": "not found"}, status=404)
        
@login_required
def unarchive_notification(request, id):
    if request.method == "POST":
        try:
            notif = Notification.objects.get(id=id, user=request.user)
            notif.is_archived = False
            notif.save()
            return JsonResponse({"status": "restored"})
        except Notification.DoesNotExist:
            return JsonResponse({"error": "not found"}, status=404)