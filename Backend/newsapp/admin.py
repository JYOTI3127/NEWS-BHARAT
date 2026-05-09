from django.contrib import admin, messages
from django import forms
from newsapp.forms import CustomUserCreationForm
from .models import *
from django.core.exceptions import PermissionDenied, ValidationError
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
from datetime import timedelta, date
from django.contrib.admin import AdminSite
from django.utils import timezone
from django.utils.html import format_html, strip_tags
from django.urls import path
from urllib.parse import quote
from .serializers import ArticleHomepageSerializer
from .utils import has_permission
from .attendance import get_attendance_snapshot, pause_attendance, touch_attendance
from .seo_direct import article_url


def _format_duration(total_seconds):
    total_seconds = max(int(total_seconds or 0), 0)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


try:
    admin.site.unregister(User)
    admin.site.unregister(Group)
except:
    pass


def _ensure_superuser(request):
    if not request.user.is_superuser:
        raise PermissionDenied("You do not have access to this page. Please contact admin regarding this access.")


def _build_editorial_calendar_events(year):
    return [
        {"date": date(year, 1, 1), "title": "New Year's Day", "category": "occasion", "tag": "Planning", "note": "New-year newsroom themes, predictions, year-ahead explainers."},
        {"date": date(year, 1, 12), "title": "National Youth Day", "category": "important_day", "tag": "India", "note": "Youth, education, skilling and startup stories."},
        {"date": date(year, 1, 14), "title": "Makar Sankranti / Pongal", "category": "festival", "tag": "Festival", "note": "Regional celebration, agriculture and travel coverage."},
        {"date": date(year, 1, 26), "title": "Republic Day", "category": "national", "tag": "National", "note": "Parade, policy, defence and civic stories."},
        {"date": date(year, 2, 21), "title": "International Mother Language Day", "category": "important_day", "tag": "Language", "note": "Culture, language and education angle."},
        {"date": date(year, 2, 28), "title": "National Science Day", "category": "important_day", "tag": "Science", "note": "Science explainers, innovation and campus stories."},
        {"date": date(year, 3, 4), "title": "Holi", "category": "festival", "tag": "Festival", "note": "Color festival coverage, travel, commerce and public advisory."},
        {"date": date(year, 3, 8), "title": "International Women's Day", "category": "important_day", "tag": "Global", "note": "Profiles, gender, workforce and leadership pieces."},
        {"date": date(year, 3, 21), "title": "Id-ul-Fitr", "category": "festival", "tag": "Festival", "note": "Moon-sighting dependent. Community, market and celebration coverage."},
        {"date": date(year, 3, 22), "title": "World Water Day", "category": "important_day", "tag": "Environment", "note": "Water crisis, climate and policy coverage."},
        {"date": date(year, 3, 26), "title": "Ram Navami", "category": "festival", "tag": "Festival", "note": "Faith, crowd management and local celebration stories."},
        {"date": date(year, 3, 31), "title": "Mahavir Jayanti", "category": "festival", "tag": "Festival", "note": "Religion, heritage and civic coverage."},
        {"date": date(year, 4, 3), "title": "Good Friday", "category": "festival", "tag": "Festival", "note": "Faith coverage and community observance stories."},
        {"date": date(year, 4, 7), "title": "World Health Day", "category": "important_day", "tag": "Health", "note": "Public health, hospitals and wellness agenda."},
        {"date": date(year, 4, 14), "title": "Ambedkar Jayanti", "category": "national", "tag": "National", "note": "Constitution, inclusion and social justice coverage."},
        {"date": date(year, 4, 22), "title": "Earth Day", "category": "important_day", "tag": "Climate", "note": "Environment, sustainability and climate reporting."},
        {"date": date(year, 5, 1), "title": "Labour Day / Buddha Purnima", "category": "important_day", "tag": "Public", "note": "Workers, economy, labour and spiritual coverage."},
        {"date": date(year, 5, 11), "title": "National Technology Day", "category": "important_day", "tag": "Tech", "note": "Innovation, AI, startup and science features."},
        {"date": date(year, 5, 27), "title": "Bakrid (Id-ul-Zuha)", "category": "festival", "tag": "Festival", "note": "Moon-sighting dependent. Faith, travel and civic updates."},
        {"date": date(year, 6, 5), "title": "World Environment Day", "category": "important_day", "tag": "Climate", "note": "Green economy, climate and sustainability coverage."},
        {"date": date(year, 6, 21), "title": "International Yoga Day", "category": "important_day", "tag": "Health", "note": "Yoga events, wellness and public participation."},
        {"date": date(year, 6, 26), "title": "Muharram", "category": "festival", "tag": "Festival", "note": "Moon-sighting dependent. Community and local observance coverage."},
        {"date": date(year, 7, 1), "title": "National Doctors' Day", "category": "important_day", "tag": "Health", "note": "Healthcare workers, hospitals and policy stories."},
        {"date": date(year, 7, 16), "title": "Rath Yatra", "category": "festival", "tag": "Festival", "note": "Faith, Odisha and travel angle."},
        {"date": date(year, 8, 15), "title": "Independence Day", "category": "national", "tag": "National", "note": "National events, security, governance and citizen voices."},
        {"date": date(year, 8, 26), "title": "Onam / Milad-un-Nabi", "category": "festival", "tag": "Festival", "note": "Kerala festivities plus moon-sighting dependent Milad coverage."},
        {"date": date(year, 8, 28), "title": "Raksha Bandhan", "category": "festival", "tag": "Festival", "note": "Family, commerce, gifting and culture stories."},
        {"date": date(year, 9, 4), "title": "Janmashtami", "category": "festival", "tag": "Festival", "note": "Faith, temple crowds and civic prep coverage."},
        {"date": date(year, 9, 5), "title": "Teachers' Day", "category": "important_day", "tag": "Education", "note": "Schools, teachers, policy and student voices."},
        {"date": date(year, 9, 14), "title": "Ganesh Chaturthi / Hindi Diwas", "category": "festival", "tag": "Culture", "note": "Festival coverage plus language and culture angles."},
        {"date": date(year, 10, 2), "title": "Gandhi Jayanti", "category": "national", "tag": "National", "note": "Governance, civic values and historical features."},
        {"date": date(year, 10, 20), "title": "Dussehra", "category": "festival", "tag": "Festival", "note": "Festivities, travel and local administration angles."},
        {"date": date(year, 11, 8), "title": "Diwali", "category": "festival", "tag": "Festival", "note": "Markets, pollution, travel, consumption and culture."},
        {"date": date(year, 11, 14), "title": "Children's Day", "category": "important_day", "tag": "Education", "note": "Schools, child welfare and youth stories."},
        {"date": date(year, 11, 15), "title": "Chhath Puja", "category": "festival", "tag": "Festival", "note": "Bihar/UP regional coverage and civic prep."},
        {"date": date(year, 11, 24), "title": "Guru Nanak Jayanti", "category": "festival", "tag": "Festival", "note": "Faith, history and community observances."},
        {"date": date(year, 12, 4), "title": "Navy Day", "category": "important_day", "tag": "Defence", "note": "Defence, maritime and strategy coverage."},
        {"date": date(year, 12, 25), "title": "Christmas Day", "category": "festival", "tag": "Festival", "note": "Celebrations, travel, retail and culture coverage."},
        {"date": date(year, 12, 31), "title": "Year-End Wrap", "category": "occasion", "tag": "Planning", "note": "Roundups, trends, explainers and next-year planning."},
    ]

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

class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'subscriber_name', 'subscriber_email', 'is_active',
        'sent_count', 'failed_count', 'last_status', 'last_sent_at', 'created_at'
    )
    search_fields = ('subscriber_name', 'subscriber_email', 'endpoint')
    list_filter = ('is_active', 'last_status', 'created_at', 'last_sent_at')
    readonly_fields = (
        'endpoint', 'p256dh', 'auth', 'sent_count', 'failed_count',
        'last_status', 'last_sent_at', 'created_at'
    )


class PushNotificationLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'subscription', 'status', 'title', 'sent_at')
    search_fields = (
        'subscription__subscriber_name', 'subscription__subscriber_email',
        'title', 'target_url', 'error_message'
    )
    list_filter = ('status', 'sent_at')
    readonly_fields = (
        'subscription', 'title', 'body', 'target_url', 'icon',
        'status', 'error_message', 'sent_at'
    )


class ContactQueryAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'phone_number', 'subject', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('full_name', 'email', 'phone_number', 'subject', 'message')
    readonly_fields = ('full_name', 'email', 'phone_number', 'subject', 'message', 'created_at', 'updated_at')
    list_editable = ('status',)
    ordering = ('-created_at',)


class CareerApplicationAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'phone_number', 'job_title', 'job_type', 'status', 'created_at')
    list_filter = ('status', 'job_type', 'job_title', 'created_at')
    search_fields = ('full_name', 'email', 'phone_number', 'job_title', 'portfolio_url', 'cover_note')
    readonly_fields = (
        'full_name',
        'email',
        'phone_number',
        'portfolio_url',
        'job_title',
        'job_type',
        'resume',
        'cover_note',
        'created_at',
        'updated_at',
    )
    list_editable = ('status',)
    ordering = ('-created_at',)


class JobOpeningAdmin(admin.ModelAdmin):
    list_display = ('title', 'team', 'employment_type', 'location', 'display_order', 'is_active', 'updated_at')
    list_filter = ('is_active', 'employment_type')
    search_fields = ('title', 'team', 'location', 'short_description', 'skills')
    list_editable = ('display_order', 'is_active')
    ordering = ('display_order', 'title')
    change_list_template = 'admin/newsapp/jobopening/change_list.html'

    class JobOpeningModalForm(forms.ModelForm):
        class Meta:
            model = JobOpening
            fields = [
                'title',
                'team',
                'employment_type',
                'location',
                'short_description',
                'skills',
                'icon_key',
                'apply_url',
                'display_order',
                'is_active',
            ]
            widgets = {
                'short_description': forms.Textarea(attrs={'rows': 4}),
            }

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        search = (request.GET.get('q') or '').strip()
        employment_type = (request.GET.get('employment_type') or '').strip()
        active_filter = (request.GET.get('is_active') or '').strip()
        open_modal = False

        if request.method == 'POST' and '_create_job_opening' in request.POST:
            form = self.JobOpeningModalForm(request.POST)
            open_modal = True
            if form.is_valid():
                form.save()
                self.message_user(request, "Vacancy added successfully.", level=messages.SUCCESS)
                return redirect('/admin/newsapp/jobopening/')
        else:
            form = self.JobOpeningModalForm(initial={
                'employment_type': 'full_time',
                'icon_key': 'briefcase',
                'display_order': JobOpening.objects.count(),
                'is_active': True,
            })

        jobs = JobOpening.objects.all().order_by('display_order', 'title')
        if search:
            jobs = jobs.filter(
                Q(title__icontains=search) |
                Q(team__icontains=search) |
                Q(location__icontains=search) |
                Q(short_description__icontains=search) |
                Q(skills__icontains=search)
            )
        if employment_type:
            jobs = jobs.filter(employment_type=employment_type)
        if active_filter in {'true', 'false'}:
            jobs = jobs.filter(is_active=(active_filter == 'true'))

        jobs = list(jobs)
        theme_classes = [
            'jobs-card-theme-1',
            'jobs-card-theme-2',
            'jobs-card-theme-3',
            'jobs-card-theme-4',
            'jobs-card-theme-5',
            'jobs-card-theme-6',
        ]
        for index, job in enumerate(jobs):
            job.skills_list = [item.strip() for item in (job.skills or '').split(',') if item.strip()]
            job.theme_class = theme_classes[index % len(theme_classes)]

        total_jobs = JobOpening.objects.count()
        active_jobs = JobOpening.objects.filter(is_active=True).count()
        remote_friendly = JobOpening.objects.filter(location__icontains='remote').count()

        extra_context.update({
            'jobs': jobs,
            'job_modal_form': form,
            'job_openings_total': total_jobs,
            'job_openings_active': active_jobs,
            'job_openings_remote': remote_friendly,
            'job_openings_search': search,
            'job_openings_employment_type': employment_type,
            'job_openings_is_active': active_filter,
            'job_openings_open_modal': open_modal,
            'employment_type_choices': JobOpening.EMPLOYMENT_TYPE_CHOICES,
        })
        return super().changelist_view(request, extra_context=extra_context)


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
                'attendance/',
                self.admin_view(self.attendance_view),
                name='attendance',
            ),
            path(
                'attendance/records/',
                self.admin_view(self.attendance_records_view),
                name='attendance_records',
            ),
            path(
                'newsletter/',
                self.admin_view(self.newsletter_view),
                name='newsletter',
            ),
            path(
                'editorial-calendar/',
                self.admin_view(self.editorial_calendar_view),
                name='editorial_calendar',
            ),
            path(
                'contact-queries/',
                self.admin_view(self.contact_queries_view),
                name='contact_queries',
            ),
            path(
                'contact-queries/<int:query_id>/',
                self.admin_view(self.contact_query_detail_view),
                name='contact_query_detail',
            ),
            path(
                'contact-queries/<int:query_id>/delete/',
                self.admin_view(self.contact_query_delete_view),
                name='contact_query_delete',
            ),
            path(
                'career-applications/',
                self.admin_view(self.career_applications_view),
                name='career_applications',
            ),
            path(
                'career-applications/<int:application_id>/',
                self.admin_view(self.career_application_detail_view),
                name='career_application_detail',
            ),
            path(
                'career-applications/<int:application_id>/delete/',
                self.admin_view(self.career_application_delete_view),
                name='career_application_delete',
            ),
        ]
        return custom_urls + urls

    def attendance_view(self, request):
        _ensure_superuser(request)
        touch_attendance(request.user)
        today = timezone.localdate()
        search = (request.GET.get('q') or '').strip()
        selected_month = (request.GET.get('month') or str(today.month)).strip()
        selected_status = (request.GET.get('status') or 'all').strip()
        selected_scope = (request.GET.get('scope') or 'today').strip()
        selected_columns = (request.GET.get('columns') or 'full').strip()
        user_rows = []
        active_now = 0
        total_seconds_today = 0

        users = User.objects.filter(is_staff=True).select_related('profile').order_by('first_name', 'username')
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        for member in users:
            snapshot = get_attendance_snapshot(member)
            is_active = snapshot['is_active']
            started_at = snapshot['started_at']
            last_activity_at = snapshot['last_activity_at']
            seconds_today = snapshot['display_seconds']

            if selected_month.isdigit():
                selected_month_int = int(selected_month)
                month_matches = False
                if last_activity_at and last_activity_at.month == selected_month_int:
                    month_matches = True
                elif started_at and started_at.month == selected_month_int:
                    month_matches = True
                elif seconds_today == 0 and today.month == selected_month_int:
                    month_matches = True
                if not month_matches:
                    continue

            if selected_status == 'present' and not is_active:
                continue
            if selected_status == 'inactive' and is_active:
                continue
            if selected_scope == 'worked' and seconds_today <= 0:
                continue
            if selected_scope == 'active' and not is_active:
                continue

            if is_active:
                active_now += 1
            total_seconds_today += seconds_today
            user_rows.append({
                'user': member,
                'is_active': is_active,
                'seconds_today': seconds_today,
                'duration_today': _format_duration(seconds_today),
                'started_at': started_at,
                'last_activity_at': last_activity_at,
            })

        return TemplateResponse(request, 'admin/attendance.html', {
            **self.each_context(request),
            'title': 'Attendance',
            'attendance_rows': user_rows,
            'search': search,
            'today': today,
            'staff_count': users.count(),
            'active_now_count': active_now,
            'total_hours_today': round(total_seconds_today / 3600, 1),
            'total_duration_today': _format_duration(total_seconds_today),
            'selected_month': selected_month,
            'selected_status': selected_status,
            'selected_scope': selected_scope,
            'selected_columns': selected_columns,
            'month_options': [
                ('1', 'January'), ('2', 'February'), ('3', 'March'), ('4', 'April'),
                ('5', 'May'), ('6', 'June'), ('7', 'July'), ('8', 'August'),
                ('9', 'September'), ('10', 'October'), ('11', 'November'), ('12', 'December'),
            ],
        })

    def attendance_records_view(self, request):
        _ensure_superuser(request)
        touch_attendance(request.user)
        records = AttendanceRecord.objects.select_related('user').order_by('-date', 'user__username')
        search = (request.GET.get('q') or '').strip()
        selected_date = (request.GET.get('date') or '').strip()

        if search:
            records = records.filter(
                Q(user__username__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        if selected_date:
            records = records.filter(date=selected_date)

        paginator = Paginator(records, 20)
        page_obj = paginator.get_page(request.GET.get('page', 1))
        record_rows = []
        today = timezone.localdate()
        for record in page_obj.object_list:
            seconds = record.total_active_seconds
            is_active = False
            if record.date == today:
                snapshot = get_attendance_snapshot(record.user)
                seconds = snapshot['display_seconds']
                is_active = snapshot['is_active']
            record_rows.append({
                'record': record,
                'duration': _format_duration(seconds),
                'seconds': seconds,
                'is_active': is_active,
            })

        return TemplateResponse(request, 'admin/attendance_records.html', {
            **self.each_context(request),
            'title': 'Attendance Records',
            'records': record_rows,
            'page_obj': page_obj,
            'search': search,
            'selected_date': selected_date,
            'total_records': records.count(),
        })

    def contact_queries_view(self, request):
        queries = ContactQuery.objects.all().order_by('-created_at')
        search = (request.GET.get('q') or '').strip()
        status_filter = (request.GET.get('status') or '').strip()

        if search:
            queries = queries.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(subject__icontains=search) |
                Q(message__icontains=search)
            )
        if status_filter:
            queries = queries.filter(status=status_filter)

        paginator = Paginator(queries, 20)
        page_obj = paginator.get_page(request.GET.get('page', 1))

        return TemplateResponse(request, 'admin/contact_queries.html', {
            **self.each_context(request),
            'title': 'Contact Queries',
            'queries': page_obj.object_list,
            'page_obj': page_obj,
            'status_choices': ContactQuery.STATUS_CHOICES,
            'selected_status': status_filter,
            'search': search,
            'total_count': queries.count(),
            'new_count': ContactQuery.objects.filter(status='new').count(),
            'current_path': request.get_full_path(),
        })

    def contact_query_detail_view(self, request, query_id):
        query = get_object_or_404(ContactQuery, pk=query_id)
        model_admin = self._registry.get(ContactQuery)
        if model_admin and not model_admin.has_view_permission(request, query):
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied

        return TemplateResponse(request, 'admin/contact_query_detail.html', {
            **self.each_context(request),
            'title': f'Contact Query - {query.full_name}',
            'query': query,
            'can_delete_query': (
                model_admin.has_delete_permission(request, query)
                if model_admin else request.user.has_perm('newsapp.delete_contactquery')
            ),
        })

    def contact_query_delete_view(self, request, query_id):
        query = get_object_or_404(ContactQuery, pk=query_id)
        model_admin = self._registry.get(ContactQuery)
        can_delete = (
            model_admin.has_delete_permission(request, query)
            if model_admin else request.user.has_perm('newsapp.delete_contactquery')
        )
        if not can_delete:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied

        if request.method != 'POST':
            messages.error(request, 'Contact query delete karne ke liye delete button use karein.')
            return redirect(f'/admin/contact-queries/{query.pk}/')

        sender_name = query.full_name
        query.delete()
        messages.success(request, f"Contact query '{sender_name}' delete ho gayi.")
        return redirect(request.POST.get('next') or '/admin/contact-queries/')

    def career_applications_view(self, request):
        applications = CareerApplication.objects.all().order_by('-created_at')
        search = (request.GET.get('q') or '').strip()
        status_filter = (request.GET.get('status') or '').strip()
        job_type_filter = (request.GET.get('job_type') or '').strip()

        if search:
            applications = applications.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(job_title__icontains=search) |
                Q(portfolio_url__icontains=search) |
                Q(cover_note__icontains=search)
            )
        if status_filter:
            applications = applications.filter(status=status_filter)
        if job_type_filter:
            applications = applications.filter(job_type=job_type_filter)

        paginator = Paginator(applications, 20)
        page_obj = paginator.get_page(request.GET.get('page', 1))

        return TemplateResponse(request, 'admin/career_applications.html', {
            **self.each_context(request),
            'title': 'Career Applications',
            'applications': page_obj.object_list,
            'page_obj': page_obj,
            'status_choices': CareerApplication.STATUS_CHOICES,
            'job_type_choices': CareerApplication.JOB_TYPE_CHOICES,
            'selected_status': status_filter,
            'selected_job_type': job_type_filter,
            'search': search,
            'total_count': applications.count(),
            'new_count': CareerApplication.objects.filter(status='new').count(),
            'current_path': request.get_full_path(),
            'jobs_count': JobOpening.objects.filter(is_active=True).count(),
        })

    def career_application_detail_view(self, request, application_id):
        application = get_object_or_404(CareerApplication, pk=application_id)
        model_admin = self._registry.get(CareerApplication)
        if model_admin and not model_admin.has_view_permission(request, application):
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied

        return TemplateResponse(request, 'admin/career_application_detail.html', {
            **self.each_context(request),
            'title': f'Career Application - {application.full_name}',
            'application': application,
            'can_delete_application': (
                model_admin.has_delete_permission(request, application)
                if model_admin else request.user.has_perm('newsapp.delete_careerapplication')
            ),
        })

    def career_application_delete_view(self, request, application_id):
        application = get_object_or_404(CareerApplication, pk=application_id)
        model_admin = self._registry.get(CareerApplication)
        can_delete = (
            model_admin.has_delete_permission(request, application)
            if model_admin else request.user.has_perm('newsapp.delete_careerapplication')
        )
        if not can_delete:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied

        if request.method != 'POST':
            messages.error(request, 'Application delete karne ke liye delete button use karein.')
            return redirect(f'/admin/career-applications/{application.pk}/')

        applicant_name = application.full_name
        application.delete()
        messages.success(request, f"Application '{applicant_name}' delete ho gayi.")
        return redirect(request.POST.get('next') or '/admin/career-applications/')

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
                'updated_at',
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

    def editorial_calendar_view(self, request):
        active_year = 2026
        raw_year = (request.GET.get('year') or '').strip()
        if raw_year.isdigit():
            active_year = max(2024, min(int(raw_year), 2035))

        events = _build_editorial_calendar_events(active_year)
        event_rows = [
            {
                'date': item['date'].isoformat(),
                'title': item['title'],
                'category': item['category'],
                'tag': item['tag'],
                'note': item['note'],
                'month': item['date'].month,
                'day': item['date'].day,
                'weekday': item['date'].strftime('%A'),
                'display_date': item['date'].strftime('%d %b %Y'),
            }
            for item in sorted(events, key=lambda row: row['date'])
        ]
        month_summary = {}
        for item in event_rows:
            month_summary.setdefault(item['month'], 0)
            month_summary[item['month']] += 1

        context = {
            **self.each_context(request),
            'title': 'Editorial Calendar',
            'calendar_year': active_year,
            'editorial_events_json': event_rows,
            'editorial_month_summary_json': month_summary,
        }
        return TemplateResponse(request, 'admin/editorial_calendar.html', context)

    def logout(self, request, extra_context=None):
        from django.contrib.auth import logout as auth_logout
        from django.shortcuts import redirect
        pause_attendance(request.user)
        auth_logout(request)
        return redirect('/admin/login/')

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}

        try:
            extra_context['published_articles_for_picker'] = (
                Article.objects.filter(status='published')
                .select_related('author')
                .prefetch_related('categories')
                .order_by('-updated_at', '-published_at', '-created_at')[:100]
            )
        except Exception:
            extra_context['published_articles_for_picker'] = []

        try:
            extra_context['categories'] = Category.objects.filter(status='active').order_by('name')
        except Exception:
            extra_context['categories'] = []

        try:
            extra_context['hero_slot'] = HomepageSlot.objects.filter(slot_name='hero').select_related(
                'article', 'overlay_article_1', 'overlay_article_2', 'overlay_article_3', 'overlay_article_4',
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
            extra_context['ad_page_choices'] = HomepageAdBanner.PAGE_CHOICES
        except Exception:
            extra_context['ad_slot'] = None
            extra_context['ad_page_choices'] = []

        try:
            saved_banner_choices = {}
            for saved_banner in SavedAdBanner.objects.all().order_by('-updated_at', '-created_at'):
                saved_banner_choices.setdefault(saved_banner.placement, []).append(saved_banner)
            saved_banners = {
                banner.placement: banner
                for banner in HomepageAdBanner.objects.filter(
                    placement__in=[placement for placement, _label in HomepageAdBanner.PLACEMENT_CHOICES]
                )
            }
            extra_context['ad_banner_rows'] = [
                {
                    'placement': placement,
                    'label': label,
                    'width': HomepageAdBanner.PLACEMENT_DIMENSIONS[placement][0],
                    'height': HomepageAdBanner.PLACEMENT_DIMENSIONS[placement][1],
                    'breakpoint': HomepageAdBanner.PLACEMENT_BREAKPOINTS[placement],
                    'banner': saved_banners.get(placement),
                    'saved_options': saved_banner_choices.get(placement, []),
                    'selected_rotation_ids': list(getattr(saved_banners.get(placement), 'rotation_banner_ids', []) or []),
                    'current_source_saved_banner_id': getattr(saved_banners.get(placement), 'source_saved_banner_id', None),
                }
                for placement, label in HomepageAdBanner.PLACEMENT_CHOICES
            ]
        except Exception:
            extra_context['ad_banner_rows'] = []

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


class HomepageAdBannerAdmin(admin.ModelAdmin):
    list_display = ('placement', 'size', 'target_page_labels', 'image_preview', 'link_url', 'is_active', 'updated_at')
    list_filter = ('placement', 'is_active')
    readonly_fields = ('updated_at',)

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-width:120px;max-height:60px;border-radius:4px;">', obj.image.url)
        if obj.image_url:
            return format_html('<img src="{}" style="max-width:120px;max-height:60px;border-radius:4px;">', obj.image_url)
        return "No image"
    image_preview.short_description = "Preview"


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
    list_display = ['title', 'status', 'author', 'author_display_name', 'priority', 'created_at', 'updated_at']
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
                'slug', 'canonical_url', 'meta_title', 'meta_description',
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
            'fields': ('author', 'published_at', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ['author', 'published_at', 'created_at', 'updated_at']

    ARTICLE_VIEW_PERMISSIONS = (
        'create_article',
        'edit_own_article',
        'edit_any_article',
        'publish_article',
    )

    def _can_view_articles(self, user):
        if user.is_superuser:
            return True
        return any(has_permission(user, code) for code in self.ARTICLE_VIEW_PERMISSIONS)

    def _can_edit_any_article(self, user):
        return user.is_superuser or has_permission(user, 'edit_any_article')

    def _can_edit_limited_articles(self, user):
        return (
            user.is_superuser
            or has_permission(user, 'edit_own_article')
        )

    def _can_access_object(self, user, obj):
        if user.is_superuser:
            return True
        if self._can_edit_any_article(user):
            return True
        return obj.author_id == user.id or obj.assigned_to_id == user.id

    def has_module_permission(self, request):
        return self._can_view_articles(request.user)

    def has_view_permission(self, request, obj=None):
        if not self._can_view_articles(request.user):
            return False
        if obj is None:
            return True
        return self._can_access_object(request.user, obj)

    def has_add_permission(self, request):
        return request.user.is_superuser or has_permission(request.user, 'create_article')

    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if not self._can_edit_limited_articles(request.user):
            return False
        if obj is None:
            return True
        return self._can_access_object(request.user, obj)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def get_queryset(self, request):
        qs = super().get_queryset(request).prefetch_related('categories').select_related('author', 'assigned_to')
        if request.user.is_superuser or self._can_edit_any_article(request.user):
            return qs
        if self._can_edit_limited_articles(request.user) or has_permission(request.user, 'create_article'):
            return qs.filter(Q(author=request.user) | Q(assigned_to=request.user)).distinct()
        return qs.none()

    def save_model(self, request, obj, form, change):
        if not change and not self.has_add_permission(request):
            raise PermissionDenied("You don't have permission to create articles.")

        if not change:
            obj.author = request.user
        elif not self.has_change_permission(request, obj):
            raise PermissionDenied("You don't have permission to edit this article.")

        if change:
            old_status = form.initial.get('status')
            if old_status and obj.status != old_status:
                if obj.status == 'published' and not request.user.is_superuser:
                    raise PermissionDenied("Only admin can publish articles.")
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

    def _public_site_base(self):
        return "https://news4bharat.com"

    def _public_asset_url(self, raw_url):
        value = str(raw_url or '').strip()
        if not value:
            return ''
        if value.startswith(('http://', 'https://')):
            return value
        if value.startswith('//'):
            return f"https:{value}"
        if not value.startswith('/'):
            value = '/' + value
        return f"{self._public_site_base()}{value}"

    def _share_description(self, article):
        text = str(article.meta_description or strip_tags(article.content or '')).strip()
        text = ' '.join(text.split())
        if len(text) <= 140:
            return text
        trimmed = text[:137].rsplit(' ', 1)[0].strip()
        return f"{trimmed}..."

    def _attach_share_metadata(self, articles):
        for article in articles:
            public_url = article_url(article, self._public_site_base())
            share_description = self._share_description(article)
            image_candidate = article.image.url if getattr(article, 'image', None) else article.image_url
            share_image_url = self._public_asset_url(image_candidate)
            share_parts = [article.title]
            if share_description:
                share_parts.append(share_description)
            share_parts.append(public_url)
            share_text = '\n\n'.join(share_parts)

            article.public_share_url = public_url
            article.public_share_description = share_description
            article.public_share_image_url = share_image_url
            article.whatsapp_share_url = f"https://wa.me/?text={quote(share_text)}"
            article.facebook_share_url = f"https://www.facebook.com/sharer/sharer.php?u={quote(public_url, safe='')}"
            article.instagram_share_text = share_text

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        original_get = request.GET.copy()
        selected_status = (original_get.get('status__exact') or '').strip()

        articles_qs = self.get_queryset(request)
        if selected_status:
            articles_qs = articles_qs.filter(status=selected_status)

        if selected_status == 'scheduled':
            articles_qs = articles_qs.order_by('scheduled_at', 'created_at')
        else:
            articles_qs = articles_qs.order_by('-updated_at', '-published_at', '-created_at')

        article_paginator = Paginator(articles_qs, 10)
        article_page_obj = article_paginator.get_page(original_get.get('article_page', 1))
        articles = list(article_page_obj.object_list)
        self._attach_share_metadata(articles)
        article_page_obj.object_list = articles

        page_query_dict = original_get.copy()
        if 'article_page' in page_query_dict:
            del page_query_dict['article_page']
        page_query = page_query_dict.urlencode()

        articles_with_images = (
            self.get_queryset(request)
            .filter(Q(image__isnull=False) & ~Q(image='') | Q(image_url__isnull=False) & ~Q(image_url=''))
            .order_by('-created_at')[:12]
        )
        recent_activity = ArticleWorkflowLog.objects.select_related(
            'article', 'changed_by'
        ).filter(
            article__in=self.get_queryset(request).values('pk')
        ).order_by('-changed_at')[:15]

        extra_context.update({
            'articles':             articles,
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
    search_fields = ('name',)
    filter_horizontal = ('permissions',)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['permission_count'] = Permission.objects.count()
        extra_context['user_count'] = UserProfile.objects.filter(roles__isnull=False).distinct().count()
        extra_context['active_count'] = Role.objects.count()
        extra_context['current_query'] = (request.GET.get('q') or '').strip()
        return super().changelist_view(request, extra_context=extra_context)


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
admin_site.register(HomepageAdBanner,           HomepageAdBannerAdmin)
admin_site.register(MetalRate)
admin_site.register(ContactQuery,                ContactQueryAdmin)
admin_site.register(CareerApplication,           CareerApplicationAdmin)
admin_site.register(JobOpening,                  JobOpeningAdmin)
admin_site.register(Reporter,                   ReporterAdmin)
admin_site.register(ReporterMonthlyPerformance, ReporterMonthlyPerformanceAdmin)
admin_site.register(NewsletterLog,               NewsletterLogAdmin)
admin_site.register(NewsletterCard,              NewsletterCardAdmin)
admin_site.register(PushSubscription,            PushSubscriptionAdmin)
admin_site.register(PushNotificationLog,         PushNotificationLogAdmin)
