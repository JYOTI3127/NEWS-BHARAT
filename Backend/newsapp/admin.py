from urllib import request

from django.contrib import admin, messages
from .models import *
from django.core.exceptions import ValidationError
from django.template.response import TemplateResponse

from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin

try:
    admin.site.unregister(User)
    admin.site.unregister(Group)
except:
    pass


admin.site.site_header = "News Bharat Admin Panel"
admin.site.site_title = "News Bharat Admin"
admin.site.index_title = "Welcome to News Bharat Dashboard"

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    filter_horizontal = ('roles',)

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    filter_horizontal = ('permissions',)

class ArticleVersionInline(admin.TabularInline):
    model = ArticleVersion
    extra = 0
    readonly_fields = ('version_number', 'edited_by', 'edited_at')


class WorkflowLogInline(admin.TabularInline):
    model = ArticleWorkflowLog
    extra = 0
    readonly_fields = ('old_status', 'new_status', 'changed_by', 'changed_at')

class ArticleAdmin(admin.ModelAdmin):
    inlines = [ArticleVersionInline, WorkflowLogInline]

    def save_model(self, request, obj, form, change):
        try:
            super().save_model(request, obj, form, change)
        except ValidationError as e:
            self.message_user(
                request,
                e.message,
                level=messages.ERROR
            )

    class Media:
        js = ('newsapp/custom_admin.js',)

class CustomAdminSite(admin.AdminSite):

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}

        extra_context.update({
            "draft": Article.objects.filter(status="draft").count(),
            "published": Article.objects.filter(status="published").count(),
            "rejected": Article.objects.filter(status="rejected").count(),
        })

        return super().index(request, extra_context)

from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.db.models import F
import json
from datetime import timedelta

from django.contrib.admin import AdminSite
from django.utils import timezone
from datetime import timedelta


class NewsAdminSite(AdminSite):
    site_header = "NewsAdmin"
    site_title  = "News Admin Portal"
    index_title = "Dashboard"

    def get_app_list(self, request):
        app_list = super().get_app_list(request)

        # Force include auth app
        from django.contrib.auth.models import User
        from django.contrib.auth.models import Group

        if not any(app['app_label'] == 'auth' for app in app_list):
            app_list.extend(super().get_app_list(request))

        return app_list

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}

        try:
            from newsapp.models import ( 
                Article,
                ArticleWorkflowLog,
                FactCheck,
                Category,
                UserProfile,
            )
            from django.contrib.auth.models import User

            now     = timezone.now()
            today   = now.date()
            week_ago  = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)

            # ── ARTICLE COUNTS ────────────────────────────────────
            total_articles     = Article.objects.count()
            published_articles = Article.objects.filter(status='published').count()
            draft_articles     = Article.objects.filter(status='draft').count()
            archived_articles  = Article.objects.filter(status='archived').count()
            review_articles    = Article.objects.filter(status='review').count()
            fact_check_articles= Article.objects.filter(status='fact_check').count()
            rejected_articles  = Article.objects.filter(status='rejected').count()
            scheduled_articles = Article.objects.filter(status='scheduled').count()

            # Published this month
            published_this_month = Article.objects.filter(
                status='published',
                published_at__gte=month_ago
            ).count()

            # Published this week
            published_this_week = Article.objects.filter(
                status='published',
                published_at__gte=week_ago
            ).count()

            # Articles with a deadline today or overdue
            overdue_articles = Article.objects.filter(
                deadline__lt=now,
                status__in=['draft', 'review', 'fact_check', 'legal']
            ).count()

            # ── PAID / FREE ───────────────────────────────────────
            paid_articles  = Article.objects.filter(is_paid=True).count()
            free_articles  = Article.objects.filter(is_paid=False).count()

            # ── USERS ─────────────────────────────────────────────
            total_authors   = User.objects.filter(article__isnull=False).distinct().count()
            active_profiles = UserProfile.objects.filter(status='active').count()
            suspended_users = UserProfile.objects.filter(status='suspended').count()

            # ── CATEGORIES ────────────────────────────────────────
            total_categories = Category.objects.count()

            # Articles per category — for the category bar chart
            # Returns a list of dicts: [{'name': 'Politics', 'count': 12}, ...]
            from django.db.models import Count, Q
            category_stats = list(
                Category.objects.annotate(
                    article_count=Count('article')
                ).order_by('-article_count').values('name', 'article_count')[:6]
            )
            # Compute max for percentage bar widths (used in template via JS data-width)
            cat_max = max((c['article_count'] for c in category_stats), default=1)
            for cat in category_stats:
                cat['pct'] = round((cat['article_count'] / cat_max) * 100) if cat_max else 0

            # ── FACT CHECKS ───────────────────────────────────────
            pending_fact_checks  = FactCheck.objects.filter(status='pending').count()
            verified_fact_checks = FactCheck.objects.filter(status='verified').count()
            issues_fact_checks   = FactCheck.objects.filter(status='issues_found').count()

            # ── RECENT ARTICLES (table) ───────────────────────────
            # Pulls the 8 most recently created articles with author + category
            recent_articles = (
                Article.objects
                .select_related('author', 'category', 'assigned_to')
                .order_by('-created_at')[:8]
            )

            # ── RECENT WORKFLOW LOGS ──────────────────────────────
            recent_logs = (
                ArticleWorkflowLog.objects
                .select_related('article', 'changed_by')
                .order_by('-changed_at')[:5]
            )

            # ── TOP REPORTERS (by published_articles) ────────────
            top_reporters = (
                ReporterMonthlyPerformance.objects
                .filter(month=now.month, year=now.year)
                .select_related('reporter')
                .order_by('-articles_published')[:5]
            )

            # ── MONTHLY PUBLISH DATA for bar chart (last 8 months) ─
            # Returns counts per month so Chart.js can render real data
            from django.db.models.functions import TruncMonth
            monthly_data_qs = (
                Article.objects
                .filter(status='published', published_at__isnull=False)
                .annotate(month=TruncMonth('published_at'))
                .values('month')
                .annotate(count=Count('id'))
                .order_by('month')
            )
            monthly_labels = []
            monthly_pub    = []
            for row in monthly_data_qs:
                monthly_labels.append(row['month'].strftime('%b %Y'))
                monthly_pub.append(row['count'])

            # Also draft monthly
            monthly_draft_qs = (
                Article.objects
                .filter(status='draft')
                .annotate(month=TruncMonth('created_at'))
                .values('month')
                .annotate(count=Count('id'))
                .order_by('month')
            )
            monthly_draft = [row['count'] for row in monthly_draft_qs]

            extra_context.update({
                # Totals
                'total_articles':          total_articles,
                'published_articles':      published_articles,
                'draft_articles':          draft_articles,
                'archived_articles':       archived_articles,
                'review_articles':         review_articles,
                'fact_check_articles':     fact_check_articles,
                'rejected_articles':       rejected_articles,
                'scheduled_articles':      scheduled_articles,
                'overdue_articles':        overdue_articles,

                # Time-scoped
                'published_this_month':    published_this_month,
                'published_this_week':     published_this_week,

                # Monetisation
                'paid_articles':           paid_articles,
                'free_articles':           free_articles,

                # Users
                'total_authors':           total_authors,
                'active_profiles':         active_profiles,
                'suspended_users':         suspended_users,

                # Categories
                'total_categories':        total_categories,
                'category_stats':          category_stats,   # list of dicts

                # Fact checks
                'pending_fact_checks':     pending_fact_checks,
                'verified_fact_checks':    verified_fact_checks,
                'issues_fact_checks':      issues_fact_checks,

                # Rich querysets for tables
                'recent_articles':         recent_articles,
                'recent_logs':             recent_logs,
                'top_reporters':           top_reporters,

                # Chart data (JSON-ready via |safe in template)
                'monthly_labels':          monthly_labels,
                'monthly_pub':             monthly_pub,
                'monthly_draft':           monthly_draft,
            })

        except Exception as e:
            extra_context.update({
                'total_articles':       0,
                'published_articles':   0,
                'draft_articles':       0,
                'archived_articles':    0,
                'review_articles':      0,
                'fact_check_articles':  0,
                'rejected_articles':    0,
                'scheduled_articles':   0,
                'overdue_articles':     0,
                'published_this_month': 0,
                'published_this_week':  0,
                'paid_articles':        0,
                'free_articles':        0,
                'total_authors':        0,
                'active_profiles':      0,
                'suspended_users':      0,
                'total_categories':     0,
                'category_stats':       [],
                'pending_fact_checks':  0,
                'verified_fact_checks': 0,
                'issues_fact_checks':   0,
                'recent_articles':      [],
                'recent_logs':          [],
                'top_reporters':        [],
                'monthly_labels':       [],
                'monthly_pub':          [],
                'monthly_draft':        [],
                'stats_error':          str(e),
            })

        return super().index(request, extra_context)

admin_site = NewsAdminSite(name='newsadmin')

admin_site.register(Permission)
admin_site.register(Category)
admin_site.register(ArticleAssignment)
admin_site.register(ArticleVersion)
admin_site.register(ArticleWorkflowLog)
admin_site.register(UserProfile)
admin_site.register(Role)
admin_site.register(Article)
admin_site.register(User, UserAdmin)
admin_site.register(Group)
admin_site.register(MetalRate)

admin_site.register(HomepageSlot)

class HomepageSlotAdmin(admin.ModelAdmin):
    list_display = ('slot_name', 'mode', 'article', 'is_active', 'pin_until')
    list_filter = ('mode', 'is_active')

class ReporterAdmin(admin.ModelAdmin):
    list_display = ("user", "employee_id", "designation", "employment_type", "is_active", "get_categories")
    search_fields = ("user__username", "employee_id")
    list_filter = ("employment_type", "is_active")
    filter_horizontal = ("assigned_categories",)

    def get_categories(self, obj):
        return ", ".join([c.name for c in obj.assigned_categories.all()]) or "—"
    get_categories.short_description = "Categories"

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        now = timezone.now()

        # Avatar colors list — cycles through reporters
        AVATAR_COLORS = ["#D80100", "#b45309", "#1d4ed8", "#15803d", "#7c3aed", "#0369a1"]

        reporter_rows = []
        overdue_count = 0
        active_count = 0

        reporters = Reporter.objects.filter(is_active=True).select_related('user')

        for i, reporter in enumerate(reporters):
            active_count += 1

            # ── Assigned articles (not published/archived)
            assigned_articles_qs = Article.objects.filter(
                assigned_to=reporter.user,
                status__in=['draft', 'review', 'fact_check', 'legal', 'approved', 'scheduled']
            ).select_related('category').order_by('deadline')

            assigned_articles = []
            reporter_overdue = 0
            has_overdue = False
            has_draft = False

            for article in assigned_articles_qs:
                is_overdue = article.deadline and article.deadline < now
                if is_overdue:
                    reporter_overdue += 1
                    has_overdue = True
                    overdue_count += 1
                if article.status == 'draft':
                    has_draft = True
                assigned_articles.append({
                    'id': article.id,
                    'title': article.title,
                    'status': article.status,
                    'deadline': article.deadline,
                    'is_overdue': is_overdue,
                    'image': article.image,
                    'content': article.content,
                })

            # ── Draft articles for editor column
            draft_articles = [a for a in assigned_articles if a['status'] == 'draft']

            # ── Recent workflow logs for this reporter
            from newsapp.models import ArticleWorkflowLog
            recent_logs = (
                ArticleWorkflowLog.objects
                .filter(changed_by=reporter.user)
                .select_related('article')
                .order_by('-changed_at')[:3]
            )

            total_revisions = ArticleWorkflowLog.objects.filter(
                changed_by=reporter.user
            ).count()

            # ── Plagiarism score (avg from ReporterMonthlyPerformance)
            perf = ReporterMonthlyPerformance.objects.filter(
                reporter=reporter.user
            ).order_by('-year', '-month').first()

            plagiarism_score = perf.plagiarism_avg_score if perf else None
            checked_articles = perf.articles_published if perf else 0
            plagiarism_flagged = plagiarism_score is not None and plagiarism_score > 20

            reporter_rows.append({
                'reporter': reporter,
                'avatar_color': AVATAR_COLORS[i % len(AVATAR_COLORS)],
                'assigned_articles': assigned_articles,
                'draft_articles': draft_articles,
                'recent_logs': recent_logs,
                'total_revisions': total_revisions,
                'overdue_count': reporter_overdue,
                'has_overdue': has_overdue,
                'has_draft': has_draft,
                'plagiarism_score': plagiarism_score,
                'checked_articles': checked_articles,
                'plagiarism_flagged': plagiarism_flagged,
            })

        extra_context.update({
            'reporter_rows': reporter_rows,
            'total_reporters': reporters.count(),
            'overdue_count': overdue_count,
            'active_count': active_count,
        })

        return super().changelist_view(request, extra_context=extra_context)


# Register karo (purani line replace karo)
admin_site.register(Reporter, ReporterAdmin)

class ReporterMonthlyPerformanceAdmin(admin.ModelAdmin):
    list_display = (
        "reporter", "month", "year",
        "articles_assigned", "articles_submitted",
        "articles_published", "articles_rejected",
        "rejection_rate", "deadline_adherence_rate",
        "avg_views", "avg_engagement_score",
        "plagiarism_avg_score", "get_score_badge",
    )
    list_filter = ("month", "year")
    search_fields = ("reporter__username",)
    ordering = ("-performance_score",)

    def get_score_badge(self, obj):
        from django.utils.html import format_html
        score = obj.performance_score
        if score >= 85:
            color = "#22c55e"
        elif score >= 70:
            color = "#f59e0b"
        else:
            color = "#ef4444"
        return format_html(
            '<span style="background:{}22; color:{}; padding:3px 10px; '
            'border-radius:12px; font-weight:700;">{}</span>',
            color, color, score
        )
    get_score_badge.short_description = "Score"
    get_score_badge.allow_tags = True

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}

        from django.utils import timezone
        now = timezone.now()

        # Top performer this month
        top = (
            ReporterMonthlyPerformance.objects
            .filter(month=now.month, year=now.year)
            .select_related('reporter')
            .order_by('-performance_score')
            .first()
        )

        # All reporters this month ranked
        ranked = (
            ReporterMonthlyPerformance.objects
            .filter(month=now.month, year=now.year)
            .select_related('reporter')
            .order_by('-performance_score')
        )

        extra_context.update({
            'top_performer': top,
            'ranked_reporters': ranked,
            'current_month': now.strftime('%B %Y'),
        })

        return super().changelist_view(request, extra_context=extra_context)

admin_site.register(ReporterMonthlyPerformance, ReporterMonthlyPerformanceAdmin)

class FCRow:
    def __init__(self, id, article, checked_by, status, remarks, checked_at, is_legal_risk):
        self.id = id
        self.article = article
        self.checked_by = checked_by
        self.status = status
        self.remarks = remarks
        self.checked_at = checked_at
        self.is_legal_risk = is_legal_risk


class FactCheckAdmin(admin.ModelAdmin):
    list_display  = ("article", "checked_by", "status", "checked_at")
    list_filter   = ("status",)
    search_fields = ("article__title", "checked_by__username")

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        from types import SimpleNamespace

        pending_count  = FactCheck.objects.filter(status='pending').count()
        verified_count = FactCheck.objects.filter(status='verified').count()
        issues_count   = FactCheck.objects.filter(status='issues_found').count()

        RISK_KEYWORDS = ['defam', 'lawsuit', 'legal', 'sensitive', 'controversial', 'risk', 'court']

        factcheck_rows = []
        legal_risk_count = 0

        fcs = (
            FactCheck.objects
            .select_related(
                'article',
                'article__author',
                'article__category',
                'checked_by'
            )
            .order_by('-checked_at')
        )

        for fc in fcs:
            is_legal_risk = (
                fc.article.status == 'legal' or
                any(kw in (fc.remarks or '').lower() for kw in RISK_KEYWORDS)
            )
            if is_legal_risk:
                legal_risk_count += 1

            row = FCRow(
                id=fc.id,
                article=fc.article,
                checked_by=fc.checked_by,
                status=fc.status,
                remarks=fc.remarks,
                checked_at=fc.checked_at,
                is_legal_risk=is_legal_risk,
            )
            factcheck_rows.append(row)

        extra_context.update({
            'factcheck_rows'  : factcheck_rows,
            'pending_count'   : pending_count,
            'verified_count'  : verified_count,
            'issues_count'    : issues_count,
            'legal_risk_count': legal_risk_count,
        })

        return super().changelist_view(request, extra_context=extra_context)


admin_site.register(FactCheck, FactCheckAdmin)





















