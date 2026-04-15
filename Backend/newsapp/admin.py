from django.contrib import admin, messages
from newsapp.forms import CustomUserCreationForm
from .models import *
from django.core.exceptions import ValidationError
from django.template.response import TemplateResponse
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.safestring import mark_safe
from django.core.mail import send_mail
from django.shortcuts import redirect, render, get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Count, Q, Case, When, F
from django.db.models import Prefetch
from django.db.models.functions import TruncMonth
import json
from datetime import timedelta
from django.contrib.admin import AdminSite
from django.utils import timezone
from django.utils.html import format_html
from django.urls import path
from .serializers import ArticleHomepageSerializer

try:
    admin.site.unregister(User)
    admin.site.unregister(Group)
except:
    pass

admin.site.site_header = "News Bharat Admin Panel"
admin.site.site_title  = "News Bharat Admin"
admin.site.index_title = "Welcome to News Bharat Dashboard"


class NewsletterLogAdmin(admin.ModelAdmin):
    list_display = (
        'subject', 'trace_id', 'sent_at', 'sent_count', 'failed_count',
        'delivered_count', 'bounced_count', 'opened_count', 'clicked_count'
    )
    search_fields = ('subject',)
    readonly_fields = (
        'trace_id', 'subject', 'recipients', 'success_emails', 'failed_emails',
        'brevo_message_ids',
        'delivered_emails', 'opened_emails', 'clicked_emails', 'bounced_emails',
        'event_history', 'sent_count', 'failed_count', 'delivered_count',
        'opened_count', 'clicked_count', 'bounced_count', 'sent_at'
    )


# ══════════════════════════════════════════════════════════════
#  INLINES
# ══════════════════════════════════════════════════════════════

class ArticleVersionInline(admin.TabularInline):
    model           = ArticleVersion
    extra           = 0
    readonly_fields = ['version_number', 'title', 'subtitle', 'edited_by', 'created_at']
    can_delete      = False


class WorkflowLogInline(admin.TabularInline):
    model           = ArticleWorkflowLog
    extra           = 0
    readonly_fields = ['old_status', 'new_status', 'changed_by', 'changed_at', 'remarks']
    can_delete      = False


# ══════════════════════════════════════════════════════════════
#  USER PROFILE INLINE
# ══════════════════════════════════════════════════════════════

class UserProfileInline(admin.StackedInline):
    model               = UserProfile
    can_delete          = False
    verbose_name_plural = "Security & Profile"

    readonly_fields = (
        'staff_id',
        'masked_password',
        'roles_and_permissions_display',
        'extra_permissions_display',
        'is_2fa_enabled',
        'failed_attempts',
        'total_failed_ever',
        'lock_status',
        'last_failed_at',
        'created_at',
    )

    fields = (
        'staff_id',
        'masked_password',
        'roles_and_permissions_display',
        'extra_permissions_display',
        'is_2fa_enabled',
        'failed_attempts',
        'total_failed_ever',
        'lock_status',
        'last_failed_at',
        'session_timeout_min',
        'remember_me',
        'created_at',
    )

    def roles_and_permissions_display(self, obj):
        roles = obj.roles.all()
        if not roles.exists():
            return mark_safe('<em style="color:#aaa">No roles assigned</em>')
        html = []
        for role in roles:
            perms    = role.permissions.all()
            perm_html = "".join([
                f'<span style="background:#D8010022;color:#D80100;padding:2px 8px;'
                f'border-radius:10px;font-size:12px;margin:2px 3px;display:inline-block">'
                f'{p.description}</span>'
                for p in perms
            ]) or '<em style="color:#aaa;font-size:12px">No permissions in this role</em>'
            html.append(
                f'<div style="margin-bottom:10px">'
                f'<strong style="color:#1d4ed8">🎭 {role.name}</strong><br>'
                f'<div style="margin-top:4px">{perm_html}</div>'
                f'</div>'
            )
        return mark_safe("".join(html))
    roles_and_permissions_display.short_description = "Roles & Their Permissions"

    def extra_permissions_display(self, obj):
        perms = obj.extra_permissions.all()
        if not perms.exists():
            return mark_safe('<em style="color:#aaa">No extra permissions</em>')
        tags = "".join([
            f'<span style="background:#15803d22;color:#15803d;padding:2px 8px;'
            f'border-radius:10px;font-size:12px;margin:2px 3px;display:inline-block">'
            f'✚ {p.description}</span>'
            for p in perms
        ])
        return mark_safe(tags)
    extra_permissions_display.short_description = "Extra Permissions"

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return tuple(f for f in self.readonly_fields if f != 'staff_id')
        return self.readonly_fields

    def masked_password(self, obj):
        request = getattr(self, '_request', None)
        if not request:
            return "*** hidden ***"
        viewer = request.user
        if viewer.is_superuser or viewer.pk == obj.user.pk:
            return obj.plain_password or "*** not set ***"
        return mark_safe('<span style="color:#aaa;font-style:italic;">*** hidden ***</span>')
    masked_password.short_description = "Password"

    @admin.display(description="Account Status")
    def lock_status(self, obj):
        if obj.locked_until and obj.locked_until > timezone.now():
            return mark_safe('<span style="color:red;font-weight:bold;">🔒 LOCKED</span>')
        return mark_safe('<span style="color:green;">✅ Active</span>')

    def get_formset(self, request, obj=None, **kwargs):
        self._request = request
        return super().get_formset(request, obj, **kwargs)


# ══════════════════════════════════════════════════════════════
#  USER ADMIN
# ══════════════════════════════════════════════════════════════

class UserAdmin(BaseUserAdmin):

    inlines      = (UserProfileInline,)
    list_display = (
        'username', 'email', 'get_user_id',
        'get_password_display', 'get_lock_status',
        'get_failed_attempts', 'is_staff',
    )
    list_filter  = ('is_staff', 'is_superuser', 'is_active')

    def get_user_id(self, obj):
        try:
            return obj.profile.staff_id or '—'
        except Exception:
            return '—'
    get_user_id.short_description = "Staff ID"

    def get_password_display(self, obj):
        request = getattr(self, '_current_request', None)
        if request and request.user.is_superuser:
            try:
                pwd = obj.profile.plain_password
                return pwd if pwd else '—'
            except Exception:
                return '—'
        return format_html('<span style="color:#aaa;">*** hidden ***</span>')
    get_password_display.short_description = "Password"

    def get_lock_status(self, obj):
        try:
            profile = obj.profile
            if profile.locked_until and profile.locked_until > timezone.now():
                return format_html('<span style="color:red;">🔒 Locked</span>')
            return format_html('<span style="color:green;">✅ Active</span>')
        except Exception:
            return '—'
    get_lock_status.short_description = "Status"

    def get_failed_attempts(self, obj):
        try:
            fa    = obj.profile.failed_attempts
            total = obj.profile.total_failed_ever
            color = 'red' if fa >= 2 else ('orange' if fa == 1 else 'inherit')
            return format_html(
                '<span style="color:{};">{} / 3 (lifetime: {})</span>',
                color, fa, total
            )
        except Exception:
            return '—'
    get_failed_attempts.short_description = "Failed Attempts"

    def changelist_view(self, request, extra_context=None):
        self._current_request = request
        extra_context = extra_context or {}

        qs = self.get_queryset(request)

        q = request.GET.get('q', '')
        if q:
            qs = qs.filter(
                Q(username__icontains=q) |
                Q(email__icontains=q) |
                Q(profile__staff_id__icontains=q)
            )

        status = request.GET.get('status')
        if status:
            qs = qs.filter(profile__status=status)

        is_staff_val = request.GET.get('is_staff')
        if is_staff_val == '1':
            qs = qs.filter(is_staff=True)
        elif is_staff_val == '0':
            qs = qs.filter(is_staff=False)

        if request.GET.get('locked'):
            qs = qs.filter(profile__locked_until__gt=timezone.now())

        paginator = Paginator(qs.select_related('profile'), 15)
        page_obj  = paginator.get_page(request.GET.get('page', 1))

        extra_context.update({
            'users':    page_obj.object_list,
            'page_obj': page_obj,
        })

        return TemplateResponse(
            request,
            'admin/user_list_page.html',
            {**self.admin_site.each_context(request), **extra_context}
        )

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        self._current_request = request
        return super().changeform_view(request, object_id, form_url, extra_context)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not request.user.is_superuser:
            qs = qs.filter(pk=request.user.pk)
        return qs

    def has_view_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if obj and obj.pk == request.user.pk:
            return True
        return False

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    actions = ['unlock_selected_users', 'reset_failed_attempts']

    def unlock_selected_users(self, request, queryset):
        for user in queryset:
            try:
                user.profile.locked_until    = None
                user.profile.failed_attempts = 0
                user.profile.save(update_fields=['locked_until', 'failed_attempts'])
            except Exception:
                pass
        self.message_user(request, "Selected users have been unlocked.")
    unlock_selected_users.short_description = "🔓 Unlock selected users"

    def reset_failed_attempts(self, request, queryset):
        for user in queryset:
            try:
                user.profile.failed_attempts   = 0
                user.profile.total_failed_ever = 0
                user.profile.save(update_fields=['failed_attempts', 'total_failed_ever'])
            except Exception:
                pass
        self.message_user(request, "Failed attempt counters reset.")
    reset_failed_attempts.short_description = "↺ Reset failed attempt counters"

    def get_urls(self):
        urls   = super().get_urls()
        custom = [
            path('add/',
                 self.admin_site.admin_view(self.custom_add_view),
                 name='auth_user_add'),
            path('<int:user_id>/profile/',
                 self.admin_site.admin_view(self.profile_view),
                 name='user_profile'),
        ]
        return custom + urls

    # ══════════════════════════════════════════════════════════════
    #  CUSTOM ADD USER VIEW
    #  ✅ FIX: Ek hi password generate hoga, wahi Django mein set
    #          hoga, wahi profile mein save hoga, wahi email mein jayega
    # ══════════════════════════════════════════════════════════════
    def custom_add_view(self, request):
        if request.method == 'POST':
            form = CustomUserCreationForm(request.POST)
            if form.is_valid():
                full_name   = form.cleaned_data['first_name']
                email       = form.cleaned_data['email']
                roles       = form.cleaned_data['roles']
                extra_perms = form.cleaned_data['extra_permissions']

                # ── Unique username ──
                base_username = email.split('@')[0]
                username = base_username
                counter  = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                # ── STEP 1: Ek baar password generate karo ──
                plain_pass = generate_password()

                # ── STEP 2: User banao — create_user() hashing karta hai ──
                # Signal fire hoga lekin ab woh password nahi badlega
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=plain_pass,   # ← Yahi hashed hokar Django mein save hoga
                    first_name=full_name,
                )

                # ── STEP 3: Profile fetch karo (signal ne banaya hai) ──
                # aur SAME plain_pass wahan bhi save karo
                try:
                    profile = user.profile
                except UserProfile.DoesNotExist:
                    profile = UserProfile.objects.create(user=user)

                profile.plain_password = plain_pass   # ← Wahi password jo Django mein bhi hai
                profile.save(update_fields=['plain_password'])

                # ── STEP 4: Roles assign karo ──
                profile.roles.set(roles)

                # Staff ID signal mein generate hogi roles set hone ke baad
                profile.refresh_from_db()

                # ── STEP 5: Extra permissions ──
                if extra_perms:
                    profile.extra_permissions.set(extra_perms)

                # ── STEP 6: Email bhejo — wahi plain_pass jo login mein kaam karega ──
                role_names = ", ".join([r.name for r in roles])
                try:
                    send_mail(
                        subject='CMS Access Credentials & Joining Letter – News4Bharat',
                        message=f"""Dear {full_name},

Welcome to News4Bharat. We are delighted to have you join the team.

Your account for the News4Bharat Content Management System (CMS) has been successfully created. Please find your login credentials below:

──────────────────────────────
Staff ID       : {profile.staff_id}
Username       : {username}
Password       : {plain_pass}
Assigned Role  : {role_names}
Login URL      : https://news4bharat.cloud/admin/
──────────────────────────────

You may use the above credentials to access the CMS. For security reasons, please ensure that you update your password immediately after your first login.

If you encounter any issues while accessing your account or require assistance, please feel free to contact the administrator.

We look forward to your valuable contribution and wish you great success with the News4Bharat team.

Warm Regards,
Admin Team
News4Bharat
""",
                        from_email='admin@news4bharat.com',
                        recipient_list=[email],
                        fail_silently=False,
                    )
                    mail_status = f"Credentials {email} pe bhej diye gaye."
                except Exception as e:
                    mail_status = f"⚠️ Email send nahi hua: {e}"

                messages.success(
                    request,
                    f"✅ User '{full_name}' create ho gaya! {mail_status}"
                )
                return redirect('../')

        else:
            form = CustomUserCreationForm()

        roles_with_perms     = Role.objects.prefetch_related('permissions').all()
        role_permissions_json = {}
        for role in roles_with_perms:
            role_permissions_json[str(role.id)] = [
                p.description for p in role.permissions.all()
            ]

        context = {
            **self.admin_site.each_context(request),
            'form':                  form,
            'title':                 'Add New User',
            'opts':                  self.model._meta,
            'roles_with_perms':      roles_with_perms,
            'role_permissions_json': json.dumps(role_permissions_json),
        }
        return render(request, 'admin/custom_add_user.html', context)

    # ══════════════════════════════════════════════════════════════
    #  PASSWORD CHANGE — plain_password sync
    # ══════════════════════════════════════════════════════════════
    def user_change_password(self, request, id, form_url=''):
        response = super().user_change_password(request, id, form_url)
        if request.method == 'POST' and hasattr(response, 'status_code') and response.status_code == 302:
            try:
                new_pass = request.POST.get('password1', '')
                if new_pass:
                    user = User.objects.get(pk=id)
                    profile, _ = UserProfile.objects.get_or_create(user=user)
                    profile.plain_password = new_pass
                    profile.failed_attempts = 0
                    profile.total_failed_ever = 0
                    profile.locked_until = None
                    profile.save(update_fields=[
                        'plain_password',
                        'failed_attempts',
                        'total_failed_ever',
                        'locked_until',
                    ])
            except Exception:
                pass
        return response

    def profile_view(self, request, user_id):
        user    = get_object_or_404(User, pk=user_id)
        profile = get_object_or_404(UserProfile, user=user)
        return TemplateResponse(request, 'admin/user_profile.html', {
            **self.admin_site.each_context(request),
            'profile': profile,
            'title':   f'Profile — {user.username}',
        })


# ══════════════════════════════════════════════════════════════
#  LOGIN ATTEMPT LOG ADMIN
# ══════════════════════════════════════════════════════════════

class LoginAttemptLogAdmin(admin.ModelAdmin):
    list_display    = ('timestamp', 'username_tried', 'ip_address', 'colored_status', 'note')
    list_filter     = ('status',)
    search_fields   = ('username_tried', 'ip_address')
    readonly_fields = ('user', 'username_tried', 'ip_address', 'user_agent', 'status', 'timestamp', 'note')
    ordering        = ('-timestamp',)

    def colored_status(self, obj):
        colors = {
            'success':     ('green',  '✅ Success'),
            'wrong_pass':  ('orange', '❌ Wrong Password'),
            'locked':      ('red',    '🔒 Locked'),
            'regenerated': ('purple', '🔄 Regenerated'),
            '2fa_fail':    ('red',    '🔐 2FA Failed'),
            'rate_limit':  ('red',    '🚫 Rate Limited'),
        }
        color, label = colors.get(obj.status, ('gray', obj.status))
        return format_html('<span style="color:{};">{}</span>', color, label)
    colored_status.short_description = 'Status'

    def has_add_permission(self, request):                      return False
    def has_change_permission(self, request, obj=None):         return False
    def has_delete_permission(self, request, obj=None):         return request.user.is_superuser


# ══════════════════════════════════════════════════════════════
#  NEWS ADMIN SITE
# ══════════════════════════════════════════════════════════════

class NewsAdminSite(AdminSite):
    site_header    = "NewsAdmin"
    site_title     = "News Admin Portal"
    index_title    = "Dashboard"
    login_template = 'admin/login.html'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'newsletter/',
                self.admin_view(self.newsletter_view),
                name='newsletter',
            ),
        ]
        return custom_urls + urls

    def newsletter_view(self, request):
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
                'canonical_url',
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
        context = {
            **self.each_context(request),
            'title': 'Newsletter',
            'articles_json': articles_json,
            'newsletter_asset_version': timezone.now().strftime('%Y%m%d%H%M'),
        }
        return TemplateResponse(request, 'admin/newsletter.html', context)

    def logout(self, request, extra_context=None):
        from django.contrib.auth import logout as auth_logout
        from django.shortcuts import redirect
        auth_logout(request)
        return redirect('/admin/login/')

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}

        try:
            extra_context['published_articles_for_picker'] = Article.objects.filter(
                status='published'
            ).select_related('author').prefetch_related('categories').order_by('-published_at')[:100]
        except Exception:
            extra_context['published_articles_for_picker'] = []

        try:
            extra_context['categories'] = Category.objects.filter(status='active').order_by('name')
        except Exception:
            extra_context['categories'] = []

        try:
            extra_context['hero_slot'] = HomepageSlot.objects.filter(slot_name='hero').select_related(
                'article', 'overlay_article_1', 'overlay_article_2', 'overlay_article_3',
            ).first()
        except Exception:
            extra_context['hero_slot'] = None

        try:
            extra_context['latest_slot'] = HomepageSlot.objects.filter(
                slot_name='latest_news'
            ).select_related('category_filter').first()
        except Exception:
            extra_context['latest_slot'] = None

        try:
            extra_context['ad_slot'] = HomepageSlot.objects.filter(slot_name='ad_banner').first()
        except Exception:
            extra_context['ad_slot'] = None

        try:
            now       = timezone.now()
            week_ago  = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)

            total_articles      = Article.objects.count()
            published_articles  = Article.objects.filter(status='published').count()
            draft_articles      = Article.objects.filter(status='draft').count()
            archived_articles   = Article.objects.filter(status='archived').count()
            review_articles     = Article.objects.filter(status='review').count()
            fact_check_articles = Article.objects.filter(status='fact_check').count()
            rejected_articles   = Article.objects.filter(status='rejected').count()
            scheduled_articles  = Article.objects.filter(status='scheduled').count()

            published_this_month = Article.objects.filter(status='published', published_at__gte=month_ago).count()
            published_this_week  = Article.objects.filter(status='published', published_at__gte=week_ago).count()

            overdue_articles = Article.objects.filter(
                deadline__lt=now,
                status__in=['draft', 'review', 'fact_check', 'legal']
            ).count()

            paid_articles  = Article.objects.filter(is_paid=True).count()
            free_articles  = Article.objects.filter(is_paid=False).count()

            total_authors   = User.objects.filter(articles_authored__isnull=False).distinct().count()
            active_profiles = UserProfile.objects.filter(status='active').count()
            suspended_users = UserProfile.objects.filter(status='suspended').count()

            total_categories = Category.objects.count()

            category_stats = list(
                Category.objects.annotate(
                    articles_count=Count('articles')
                ).order_by('-articles_count').values('name', 'articles_count')[:6]
            )
            cat_max = max((c['articles_count'] for c in category_stats), default=1)
            for cat in category_stats:
                cat['pct'] = round((cat['articles_count'] / cat_max) * 100) if cat_max else 0

            pending_fact_checks  = FactCheck.objects.filter(status='pending').count()
            verified_fact_checks = FactCheck.objects.filter(status='verified').count()
            issues_fact_checks   = FactCheck.objects.filter(status='issues_found').count()

            recent_articles = Article.objects.select_related('author', 'assigned_to').prefetch_related('categories').order_by('-created_at')[:8]
            recent_logs     = ArticleWorkflowLog.objects.select_related('article', 'changed_by').order_by('-changed_at')[:5]
            top_reporters   = ReporterMonthlyPerformance.objects.filter(
                month=now.month, year=now.year
            ).select_related('reporter').order_by('-articles_published')[:5]

            monthly_data_qs = (
                Article.objects
                .filter(status='published', published_at__isnull=False)
                .annotate(month=TruncMonth('published_at'))
                .values('month').annotate(count=Count('id')).order_by('month')
            )
            monthly_labels = [row['month'].strftime('%b %Y') for row in monthly_data_qs]
            monthly_pub    = [row['count'] for row in monthly_data_qs]

            monthly_draft_qs = (
                Article.objects.filter(status='draft')
                .annotate(month=TruncMonth('created_at'))
                .values('month').annotate(count=Count('id')).order_by('month')
            )
            monthly_draft = [row['count'] for row in monthly_draft_qs]

            extra_context.update({
                'total_articles':        total_articles,
                'published_articles':    published_articles,
                'draft_articles':        draft_articles,
                'archived_articles':     archived_articles,
                'review_articles':       review_articles,
                'fact_check_articles':   fact_check_articles,
                'rejected_articles':     rejected_articles,
                'scheduled_articles':    scheduled_articles,
                'overdue_articles':      overdue_articles,
                'published_this_month':  published_this_month,
                'published_this_week':   published_this_week,
                'paid_articles':         paid_articles,
                'free_articles':         free_articles,
                'total_authors':         total_authors,
                'active_profiles':       active_profiles,
                'suspended_users':       suspended_users,
                'total_categories':      total_categories,
                'category_stats':        category_stats,
                'pending_fact_checks':   pending_fact_checks,
                'verified_fact_checks':  verified_fact_checks,
                'issues_fact_checks':    issues_fact_checks,
                'recent_articles':       recent_articles,
                'recent_logs':           recent_logs,
                'top_reporters':         top_reporters,
                'monthly_labels':        monthly_labels,
                'monthly_pub':           monthly_pub,
                'monthly_draft':         monthly_draft,
                'monthly_labels_json':   json.dumps(monthly_labels),
                'monthly_pub_json':      json.dumps(monthly_pub),
                'monthly_draft_json':    json.dumps(monthly_draft),
                'donut_data_json':       json.dumps([
                    published_articles, draft_articles, review_articles,
                    archived_articles, rejected_articles, fact_check_articles,
                ]),
            })

        except Exception as e:
            extra_context['stats_error'] = str(e)

        return super().index(request, extra_context)


# ══════════════════════════════════════════════════════════════
#  OTHER MODEL ADMINS
# ══════════════════════════════════════════════════════════════

class HomepageSlotAdmin(admin.ModelAdmin):
    list_display = ('slot_name', 'mode', 'article', 'is_active', 'pin_until')
    list_filter  = ('mode', 'is_active')


class NewsletterCardAdmin(admin.ModelAdmin):
    list_display = ('title', 'link', 'created_at')
    search_fields = ('title', 'description', 'link')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


class ReporterAdmin(admin.ModelAdmin):
    list_display      = ("user", "employee_id", "designation", "employment_type", "is_active", "get_categories")
    search_fields     = ("user__username", "employee_id")
    list_filter       = ("employment_type", "is_active")
    filter_horizontal = ("assigned_categories",)

    def get_categories(self, obj):
        return ", ".join([c.name for c in obj.assigned_categories.all()]) or "—"
    get_categories.short_description = "Categories"

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        now = timezone.now()

        AVATAR_COLORS = ["#D80100", "#b45309", "#1d4ed8", "#15803d", "#7c3aed", "#0369a1"]
        reporter_rows = []
        overdue_count = 0
        active_count  = 0

        reporters = Reporter.objects.filter(is_active=True).select_related('user')

        for i, reporter in enumerate(reporters):
            active_count += 1
            assigned_articles_qs = Article.objects.filter(
                assigned_to=reporter.user,
                status__in=['draft', 'review', 'fact_check', 'legal', 'approved', 'scheduled']
            ).select_related('author', 'assigned_to').order_by('deadline')

            assigned_articles = []
            reporter_overdue  = 0
            has_overdue = False
            has_draft   = False

            for article in assigned_articles_qs:
                is_overdue = article.deadline and article.deadline < now
                if is_overdue:
                    reporter_overdue += 1
                    has_overdue = True
                    overdue_count += 1
                if article.status == 'draft':
                    has_draft = True
                assigned_articles.append({
                    'id': article.id, 'title': article.title,
                    'status': article.status, 'deadline': article.deadline,
                    'is_overdue': is_overdue, 'image': article.image, 'content': article.content,
                })

            draft_articles = [a for a in assigned_articles if a['status'] == 'draft']

            recent_logs = (
                ArticleWorkflowLog.objects
                .filter(changed_by=reporter.user)
                .select_related('article')
                .order_by('-changed_at')[:3]
            )
            total_revisions = ArticleWorkflowLog.objects.filter(changed_by=reporter.user).count()

            perf = ReporterMonthlyPerformance.objects.filter(
                reporter=reporter.user
            ).order_by('-year', '-month').first()

            plagiarism_score   = perf.plagiarism_avg_score if perf else None
            checked_articles   = perf.articles_published   if perf else 0
            plagiarism_flagged = plagiarism_score is not None and plagiarism_score > 20

            reporter_rows.append({
                'reporter': reporter, 'avatar_color': AVATAR_COLORS[i % len(AVATAR_COLORS)],
                'assigned_articles': assigned_articles, 'draft_articles': draft_articles,
                'recent_logs': recent_logs, 'total_revisions': total_revisions,
                'overdue_count': reporter_overdue, 'has_overdue': has_overdue, 'has_draft': has_draft,
                'plagiarism_score': plagiarism_score, 'checked_articles': checked_articles,
                'plagiarism_flagged': plagiarism_flagged,
            })

        extra_context.update({
            'reporter_rows': reporter_rows, 'total_reporters': reporters.count(),
            'overdue_count': overdue_count, 'active_count': active_count,
        })
        return super().changelist_view(request, extra_context=extra_context)


class ReporterMonthlyPerformanceAdmin(admin.ModelAdmin):
    list_display = (
        "reporter", "month", "year",
        "articles_assigned", "articles_submitted", "articles_published", "articles_rejected",
        "rejection_rate", "deadline_adherence_rate",
        "avg_views", "avg_engagement_score", "plagiarism_avg_score", "get_score_badge",
    )
    list_filter   = ("month", "year")
    search_fields = ("reporter__username",)
    ordering      = ("-performance_score",)

    def get_score_badge(self, obj):
        score = obj.performance_score
        color = "#22c55e" if score >= 85 else ("#f59e0b" if score >= 70 else "#ef4444")
        return format_html(
            '<span style="background:{}22;color:{};padding:3px 10px;border-radius:12px;font-weight:700;">{}</span>',
            color, color, score
        )
    get_score_badge.short_description = "Score"

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        now = timezone.now()

        top = (
            ReporterMonthlyPerformance.objects
            .filter(month=now.month, year=now.year)
            .select_related('reporter').order_by('-performance_score').first()
        )
        ranked = (
            ReporterMonthlyPerformance.objects
            .filter(month=now.month, year=now.year)
            .select_related('reporter').order_by('-performance_score')
        )
        extra_context.update({
            'top_performer':  top,
            'ranked_reporters': ranked,
            'current_month':  now.strftime('%B %Y'),
        })
        return super().changelist_view(request, extra_context=extra_context)


class FCRow:
    def __init__(self, id, article, checked_by, status, remarks, checked_at, is_legal_risk):
        self.id            = id
        self.article       = article
        self.checked_by    = checked_by
        self.status        = status
        self.remarks       = remarks
        self.checked_at    = checked_at
        self.is_legal_risk = is_legal_risk


class FactCheckAdmin(admin.ModelAdmin):
    list_display  = ("article", "checked_by", "status", "checked_at")
    list_filter   = ("status",)
    search_fields = ("article__title", "checked_by__username")

    def changelist_view(self, request, extra_context=None):
        extra_context  = extra_context or {}
        pending_count  = FactCheck.objects.filter(status='pending').count()
        verified_count = FactCheck.objects.filter(status='verified').count()
        issues_count   = FactCheck.objects.filter(status='issues_found').count()

        RISK_KEYWORDS  = ['defam', 'lawsuit', 'legal', 'sensitive', 'controversial', 'risk', 'court']
        factcheck_rows = []
        legal_risk_count = 0

        fcs = (
            FactCheck.objects
            .select_related('article', 'article__author', 'checked_by')
            .prefetch_related('article__categories')
            .order_by('-checked_at')
        )

        for fc in fcs:
            is_legal_risk = (
                fc.article.status == 'legal' or
                any(kw in (fc.remarks or '').lower() for kw in RISK_KEYWORDS)
            )
            if is_legal_risk:
                legal_risk_count += 1
            factcheck_rows.append(FCRow(
                id=fc.id, article=fc.article, checked_by=fc.checked_by,
                status=fc.status, remarks=fc.remarks, checked_at=fc.checked_at,
                is_legal_risk=is_legal_risk,
            ))

        extra_context.update({
            'factcheck_rows':   factcheck_rows,
            'pending_count':    pending_count,
            'verified_count':   verified_count,
            'issues_count':     issues_count,
            'legal_risk_count': legal_risk_count,
        })
        return super().changelist_view(request, extra_context=extra_context)


class ArticleAdmin(admin.ModelAdmin):
    inlines      = [ArticleVersionInline, WorkflowLogInline]
    list_display = ['title', 'status', 'author', 'author_display_name', 'priority', 'created_at']
    list_filter  = ['status', 'categories', 'is_paid', 'priority']
    search_fields = ['title', 'author__username', 'author_display_name']

    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'subtitle', 'content', 'image', 'image_url', 'categories')
        }),
        ('Publish Settings', {
            'fields': ('status', 'priority', 'is_paid', 'assigned_to', 'deadline')
        }),
        ('SEO', {
            'fields': (
                'slug', 'canonical_url', 'meta_description',
                'focus_keyword', 'noindex', 'nofollow', 'in_sitemap'
            )
        }),
        ('Display Author — Frontend pe dikhega', {
            'fields': (
                'author_display_name', 'author_display_position',
                'author_display_bio', 'author_display_photo',
                'author_display_twitter', 'author_display_linkedin',
                'author_display_instagram', 'author_display_facebook',
                'author_display_articles_count',
            )
        }),
        ('Audit Info — Read Only', {
            'fields': ('author', 'published_at', 'created_at'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ['author', 'published_at', 'created_at']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.author = request.user
        if change:
            old_status = form.initial.get('status')
            if old_status and obj.status != old_status:
                if not request.user.is_superuser:
                    allowed = ALLOWED_TRANSITIONS.get(old_status, [])
                    if obj.status not in allowed:
                        raise ValidationError(
                            f"You can't directly move from {old_status} to {obj.status}"
                        )
        try:
            super().save_model(request, obj, form, change)
        except ValidationError as e:
            self.message_user(request, e.message, level=messages.ERROR)

    class Media:
        js = ('newsapp/custom_admin.js',)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        original_get = request.GET.copy()
        selected_status = (original_get.get('status__exact') or '').strip()

        articles_qs = (
            Article.objects.prefetch_related('categories')
            .select_related('author', 'assigned_to')
        )
        if selected_status:
            articles_qs = articles_qs.filter(status=selected_status)

        if selected_status == 'scheduled':
            articles_qs = articles_qs.order_by('scheduled_at', 'created_at')
        else:
            articles_qs = articles_qs.order_by(
                Case(
                    When(status='scheduled', then=F('scheduled_at')),
                    default=F('created_at'),
                ).desc(nulls_last=True),
                '-created_at',
            )

        article_paginator = Paginator(articles_qs, 10)
        article_page_obj = article_paginator.get_page(original_get.get('article_page', 1))

        page_query_dict = original_get.copy()
        if 'article_page' in page_query_dict:
            del page_query_dict['article_page']
        page_query = page_query_dict.urlencode()

        articles_with_images = (
            Article.objects.filter(Q(image__isnull=False) & ~Q(image='') | Q(image_url__isnull=False) & ~Q(image_url=''))
            .select_related('author').prefetch_related('categories')
            .order_by('-created_at')[:12]
        )
        recent_activity = ArticleWorkflowLog.objects.select_related(
            'article', 'changed_by'
        ).order_by('-changed_at')[:15]

        extra_context.update({
            'articles':             article_page_obj.object_list,
            'article_page_obj':     article_page_obj,
            'article_paginator':    article_paginator,
            'page_query':           page_query,
            'articles_with_images': articles_with_images,
            'recent_activity':      recent_activity,
            'total_articles':       articles_qs.count(),
            'published_articles':   articles_qs.filter(status='published').count(),
            'draft_articles':       articles_qs.filter(status='draft').count(),
            'scheduled_articles':   articles_qs.filter(status='scheduled').count(),
            'selected_status':      selected_status,
        })
        if 'article_page' in request.GET:
            cleaned_get = request.GET.copy()
            del cleaned_get['article_page']
            request.GET = cleaned_get
        return super().changelist_view(request, extra_context=extra_context)


class RoleAdmin(admin.ModelAdmin):
    filter_horizontal = ('permissions',)


class PermissionAdmin(admin.ModelAdmin):
    list_display  = ('code', 'description')
    search_fields = ('code', 'description')

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['group_count'] = 0
        extra_context['user_count']  = 0
        return super().changelist_view(request, extra_context=extra_context)


# ══════════════════════════════════════════════════════════════
#  REGISTER ALL MODELS
# ══════════════════════════════════════════════════════════════

admin_site = NewsAdminSite(name='newsadmin')

admin_site.register(User,                       UserAdmin)
admin_site.register(Group)
admin_site.register(Role,                       RoleAdmin)
admin_site.register(Permission)
admin_site.register(Category)
admin_site.register(UserProfile)
admin_site.register(LoginAttemptLog,            LoginAttemptLogAdmin)
admin_site.register(Article,                    ArticleAdmin)
admin_site.register(ArticleAssignment)
admin_site.register(ArticleVersion)
admin_site.register(ArticleWorkflowLog)
admin_site.register(FactCheck,                  FactCheckAdmin)
admin_site.register(HomepageSlot,               HomepageSlotAdmin)
admin_site.register(MetalRate)
admin_site.register(Reporter,                   ReporterAdmin)
admin_site.register(ReporterMonthlyPerformance, ReporterMonthlyPerformanceAdmin)
admin_site.register(NewsletterLog,               NewsletterLogAdmin)
admin_site.register(NewsletterCard,              NewsletterCardAdmin)
