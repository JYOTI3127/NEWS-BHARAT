from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
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
    

