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
from django.http import HttpResponse
from django.core.paginator import Paginator
from django.db.models import Count, Q, Case, When, F, Sum
from django.db.models import Prefetch
from django.db.models.functions import TruncMonth
import json
import csv
from datetime import timedelta, date
from django.contrib.admin import AdminSite
from django.utils import timezone
from django.utils.html import format_html, strip_tags
from django.urls import path
from django.templatetags.static import static
from django.conf import settings
from urllib.parse import quote
from calendar import monthrange
from django.utils.dateparse import parse_date, parse_time
from .serializers import ArticleHomepageSerializer
from .utils import has_permission
from .attendance import clock_in_attendance, get_attendance_snapshot, pause_attendance
from .seo_direct import article_url


SLUG_EDITOR_USERNAME = "sheenu"
SLUG_EDITOR_EMAIL = "sheenaas013@gmail.com"


def _can_manage_slug(user):
    if not getattr(user, 'is_authenticated', False):
        return False
    username = str(getattr(user, 'username', '') or '').strip().lower()
    email = str(getattr(user, 'email', '') or '').strip().lower()
    return username == SLUG_EDITOR_USERNAME or email == SLUG_EDITOR_EMAIL


def _format_duration(total_seconds):
    total_seconds = max(int(total_seconds or 0), 0)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours} hr {minutes} min {seconds} sec"


def _attendance_record_seconds(record):
    if not record:
        return 0

    stored_seconds = max(int(getattr(record, 'total_active_seconds', 0) or 0), 0)
    if stored_seconds > 0:
        return stored_seconds

    clock_in_at = getattr(record, 'last_clock_in_at', None)
    clock_out_at = getattr(record, 'last_clock_out_at', None)
    last_activity_at = getattr(record, 'last_activity_at', None)
    current_session_started_at = getattr(record, 'current_session_started_at', None)

    if clock_in_at and clock_out_at and clock_out_at >= clock_in_at:
        return max(int((clock_out_at - clock_in_at).total_seconds()), 0)

    if current_session_started_at and last_activity_at and last_activity_at >= current_session_started_at:
        return max(int((last_activity_at - current_session_started_at).total_seconds()), 0)

    return 0


try:
    admin.site.unregister(User)
    admin.site.unregister(Group)
except:
    pass


def _ensure_superuser(request):
    if not request.user.is_superuser:
        raise PermissionDenied("You do not have access to this page. Please contact admin regarding this access.")


def _build_editorial_calendar_events(year):
    seed_rows = [
        (1, 1, "New Year's Day", "occasion", "Planning", "New-year newsroom themes, predictions, year-ahead explainers."),
        (1, 9, "Pravasi Bharatiya Divas", "national", "India", "Diaspora, foreign policy and investment stories."),
        (1, 10, "World Hindi Day", "important_day", "Language", "Language, culture and global Hindi outreach angles."),
        (1, 12, "National Youth Day", "important_day", "India", "Youth, education, skilling and startup stories."),
        (1, 14, "Makar Sankranti / Pongal", "festival", "Festival", "Regional celebration, agriculture and travel coverage."),
        (1, 15, "Indian Army Day", "national", "Defence", "Armed forces, veterans and security coverage."),
        (1, 23, "Netaji Subhas Chandra Bose Jayanti", "national", "National", "Freedom movement, leadership and legacy storytelling."),
        (1, 25, "National Voters' Day", "national", "Civic", "Democracy, elections and voter awareness coverage."),
        (1, 26, "Republic Day", "national", "National", "Parade, policy, defence and civic stories."),
        (1, 30, "Martyrs' Day", "national", "History", "Public memory, national sacrifice and historical reflection pieces."),
        (2, 4, "World Cancer Day", "important_day", "Health", "Healthcare, screening, patient journeys and policy angles."),
        (2, 13, "World Radio Day", "important_day", "Media", "Broadcast, community media and audio journalism features."),
        (2, 19, "Chhatrapati Shivaji Maharaj Jayanti", "national", "History", "State pride, history and governance legacy coverage."),
        (2, 21, "International Mother Language Day", "important_day", "Language", "Culture, language and education angle."),
        (2, 27, "World NGO Day", "important_day", "Society", "Civil society, volunteering and impact reporting."),
        (2, 28, "National Science Day", "important_day", "Science", "Science explainers, innovation and campus stories."),
        (3, 1, "Zero Discrimination Day", "important_day", "Society", "Equity, access and inclusion-led coverage."),
        (3, 4, "Holi", "festival", "Festival", "Color festival coverage, travel, commerce and public advisory."),
        (3, 8, "International Women's Day", "important_day", "Global", "Profiles, gender, workforce and leadership pieces."),
        (3, 15, "World Consumer Rights Day", "important_day", "Public", "Pricing, product safety, e-commerce and policy stories."),
        (3, 20, "International Day of Happiness", "important_day", "Lifestyle", "Wellbeing, work-life and youth engagement angles."),
        (3, 21, "Id-ul-Fitr", "festival", "Festival", "Moon-sighting dependent. Community, market and celebration coverage."),
        (3, 21, "World Poetry Day", "important_day", "Culture", "Literature, language and creator-centric storytelling."),
        (3, 22, "World Water Day", "important_day", "Environment", "Water crisis, climate and policy coverage."),
        (3, 23, "Shaheed Diwas", "national", "History", "Youth, patriotism and historical legacy coverage."),
        (3, 24, "World Tuberculosis Day", "important_day", "Health", "Public health systems, awareness and treatment coverage."),
        (3, 26, "Ram Navami", "festival", "Festival", "Faith, crowd management and local celebration stories."),
        (3, 31, "Mahavir Jayanti", "festival", "Festival", "Religion, heritage and civic coverage."),
        (4, 3, "Good Friday", "festival", "Festival", "Faith coverage and community observance stories."),
        (4, 7, "World Health Day", "important_day", "Health", "Public health, hospitals and wellness agenda."),
        (4, 13, "Baisakhi", "festival", "Festival", "Harvest, Sikh faith, food and travel coverage."),
        (4, 14, "Ambedkar Jayanti", "national", "National", "Constitution, inclusion and social justice coverage."),
        (4, 18, "World Heritage Day", "important_day", "Culture", "Heritage conservation, tourism and civic identity angles."),
        (4, 22, "Earth Day", "important_day", "Climate", "Environment, sustainability and climate reporting."),
        (4, 23, "World Book Day", "important_day", "Culture", "Publishing, reading culture and education features."),
        (4, 29, "International Dance Day", "important_day", "Culture", "Performing arts, folk traditions and youth culture."),
        (5, 1, "Labour Day / Buddha Purnima", "important_day", "Public", "Workers, economy, labour and spiritual coverage."),
        (5, 3, "World Press Freedom Day", "important_day", "Media", "Journalism, media rights and information access coverage."),
        (5, 8, "World Red Cross Day", "important_day", "Health", "Disaster response, volunteers and humanitarian angles."),
        (5, 11, "National Technology Day", "important_day", "Tech", "Innovation, AI, startup and science features."),
        (5, 12, "International Nurses Day", "important_day", "Health", "Hospitals, frontline workers and care infrastructure."),
        (5, 15, "International Day of Families", "important_day", "Society", "Family policy, caregiving and social trends coverage."),
        (5, 21, "National Anti-Terrorism Day", "national", "Security", "Security preparedness, public memory and policy coverage."),
        (5, 27, "Bakrid (Id-ul-Zuha)", "festival", "Festival", "Moon-sighting dependent. Faith, travel and civic updates."),
        (5, 31, "World No Tobacco Day", "important_day", "Health", "Health awareness, regulation and public campaigns."),
        (6, 5, "World Environment Day", "important_day", "Climate", "Green economy, climate and sustainability coverage."),
        (6, 8, "World Oceans Day", "important_day", "Climate", "Marine pollution, fisheries and coastal economy coverage."),
        (6, 14, "World Blood Donor Day", "important_day", "Health", "Healthcare systems, blood banks and volunteerism."),
        (6, 21, "International Yoga Day", "important_day", "Health", "Yoga events, wellness and public participation."),
        (6, 26, "Muharram", "festival", "Festival", "Moon-sighting dependent. Community and local observance coverage."),
        (6, 26, "International Day Against Drug Abuse", "important_day", "Public", "Addiction, youth and law-enforcement coverage."),
        (7, 1, "National Doctors' Day", "important_day", "Health", "Healthcare workers, hospitals and policy stories."),
        (7, 11, "World Population Day", "important_day", "Public", "Demography, jobs, cities and welfare coverage."),
        (7, 16, "Rath Yatra", "festival", "Festival", "Faith, Odisha and travel angle."),
        (7, 18, "Nelson Mandela International Day", "important_day", "Global", "Leadership, justice and social change themes."),
        (7, 26, "Kargil Vijay Diwas", "national", "Defence", "Defence, veterans and national remembrance coverage."),
        (7, 28, "World Nature Conservation Day", "important_day", "Climate", "Conservation, forests and biodiversity coverage."),
        (8, 6, "Hiroshima Day", "important_day", "Global", "Peace, war memory and global diplomacy explainers."),
        (8, 9, "International Day of the World's Indigenous Peoples", "important_day", "Society", "Tribal rights, culture and inclusion coverage."),
        (8, 12, "International Youth Day", "important_day", "Global", "Youth employment, creators and civic participation."),
        (8, 15, "Independence Day", "national", "National", "National events, security, governance and citizen voices."),
        (8, 19, "World Photography Day", "important_day", "Culture", "Visual storytelling, creators and media craft coverage."),
        (8, 26, "Onam / Milad-un-Nabi", "festival", "Festival", "Kerala festivities plus moon-sighting dependent Milad coverage."),
        (8, 28, "Raksha Bandhan", "festival", "Festival", "Family, commerce, gifting and culture stories."),
        (8, 29, "National Sports Day", "national", "Sports", "Athletes, grassroots sport and fitness infrastructure stories."),
        (9, 4, "Janmashtami", "festival", "Festival", "Faith, temple crowds and civic prep coverage."),
        (9, 5, "Teachers' Day", "important_day", "Education", "Schools, teachers, policy and student voices."),
        (9, 8, "International Literacy Day", "important_day", "Education", "Schooling, adult literacy and education equity angles."),
        (9, 14, "Ganesh Chaturthi / Hindi Diwas", "festival", "Culture", "Festival coverage plus language and culture angles."),
        (9, 16, "World Ozone Day", "important_day", "Climate", "Climate science, environment and policy storytelling."),
        (9, 21, "International Day of Peace", "important_day", "Global", "Conflict, diplomacy and civic harmony angles."),
        (9, 27, "World Tourism Day", "important_day", "Travel", "Tourism economy, destinations and local business coverage."),
        (10, 1, "International Day of Older Persons", "important_day", "Society", "Aging, healthcare, pensions and caregiver stories."),
        (10, 2, "Gandhi Jayanti", "national", "National", "Governance, civic values and historical features."),
        (10, 10, "World Mental Health Day", "important_day", "Health", "Mental health awareness, care access and work culture stories."),
        (10, 11, "International Day of the Girl Child", "important_day", "Society", "Girls' education, safety and opportunity stories."),
        (10, 16, "World Food Day", "important_day", "Food", "Food systems, nutrition, inflation and farm economy angles."),
        (10, 20, "Dussehra", "festival", "Festival", "Festivities, travel and local administration angles."),
        (10, 24, "United Nations Day", "important_day", "Global", "Multilateralism, diplomacy and global governance explainers."),
        (10, 31, "National Unity Day", "national", "National", "Unity, internal security and Patel legacy coverage."),
        (11, 7, "National Cancer Awareness Day", "important_day", "Health", "Prevention, healthcare systems and public messaging."),
        (11, 8, "Diwali", "festival", "Festival", "Markets, pollution, travel, consumption and culture."),
        (11, 14, "Children's Day", "important_day", "Education", "Schools, child welfare and youth stories."),
        (11, 15, "Chhath Puja", "festival", "Festival", "Bihar/UP regional coverage and civic prep."),
        (11, 16, "International Day for Tolerance", "important_day", "Society", "Pluralism, dialogue and social cohesion coverage."),
        (11, 19, "International Men's Day", "important_day", "Society", "Health, family roles and social change angles."),
        (11, 24, "Guru Nanak Jayanti", "festival", "Festival", "Faith, history and community observances."),
        (11, 26, "Constitution Day", "national", "National", "Law, democracy, rights and institutional explainers."),
        (12, 1, "World AIDS Day", "important_day", "Health", "Awareness, healthcare access and public policy stories."),
        (12, 4, "Navy Day", "national", "Defence", "Defence, maritime and strategy coverage."),
        (12, 10, "Human Rights Day", "important_day", "Global", "Rights, law, civil liberties and accountability coverage."),
        (12, 14, "National Energy Conservation Day", "national", "Climate", "Power demand, savings and sustainability coverage."),
        (12, 23, "Kisan Diwas", "national", "Agriculture", "Farmer welfare, rural economy and policy reporting."),
        (12, 25, "Christmas Day", "festival", "Festival", "Celebrations, travel, retail and culture coverage."),
        (12, 31, "Year-End Wrap", "occasion", "Planning", "Roundups, trends, explainers and next-year planning."),
    ]
    return [
        {
            "date": date(year, month, day),
            "title": title,
            "category": category,
            "tag": tag,
            "note": note,
        }
        for month, day, title, category, tag, note in seed_rows
    ]


def _build_public_holiday_rows(year):
    holiday_titles = {
        "New Year's Day",
        "Makar Sankranti / Pongal",
        "Republic Day",
        "Holi",
        "Id-ul-Fitr",
        "Ram Navami",
        "Mahavir Jayanti",
        "Good Friday",
        "Baisakhi",
        "Ambedkar Jayanti",
        "Labour Day / Buddha Purnima",
        "Bakrid (Id-ul-Zuha)",
        "Muharram",
        "Independence Day",
        "Onam / Milad-un-Nabi",
        "Raksha Bandhan",
        "Janmashtami",
        "Ganesh Chaturthi / Hindi Diwas",
        "Gandhi Jayanti",
        "Dussehra",
        "Diwali",
        "Chhath Puja",
        "Guru Nanak Jayanti",
        "Christmas Day",
    }
    holiday_rows = []
    for item in _build_editorial_calendar_events(year):
        if item["title"] not in holiday_titles:
            continue
        holiday_rows.append({
            "date": item["date"],
            "title": item["title"],
            "tag": item["tag"],
            "note": item["note"],
        })
    return holiday_rows


def _build_month_off_dates(year, month):
    _, total_days = monthrange(year, month)
    off_dates = set()
    for day in range(1, total_days + 1):
        current_day = date(year, month, day)
        if current_day.weekday() == 6:
            off_dates.add(current_day)

    for holiday in _build_public_holiday_rows(year):
        holiday_date = holiday["date"]
        if holiday_date.month == month:
            off_dates.add(holiday_date)

    return off_dates

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


class LiveUpdateAdmin(admin.ModelAdmin):
    change_list_template = 'admin/newsapp/liveupdate/change_list.html'
    list_display = ('title', 'published_at', 'is_active', 'created_at')
    list_filter = ('is_active', 'published_at', 'created_at')
    search_fields = ('title', 'summary')
    ordering = ('-published_at', '-created_at')
    readonly_fields = ('created_at', 'updated_at')

    def has_module_permission(self, request):
        return bool(getattr(request.user, 'is_active', False) and getattr(request.user, 'is_staff', False))

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return self.has_module_permission(request)

    def has_change_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_delete_permission(self, request, obj=None):
        return self.has_module_permission(request)

    class LiveUpdateQuickForm(forms.ModelForm):
        schedule_for_later = forms.BooleanField(required=False)

        class Meta:
            model = LiveUpdate
            fields = ['published_at', 'title', 'summary', 'is_active']
            widgets = {
                'published_at': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
                'title': forms.TextInput(attrs={'placeholder': 'Enter short headline'}),
                'summary': forms.Textarea(attrs={'rows': 4, 'placeholder': 'Add the short live update summary here...'}),
            }

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            instance = getattr(self, 'instance', None)
            current_time = timezone.localtime(timezone.now()).replace(second=0, microsecond=0)
            publish_time = None
            if instance and instance.pk and instance.published_at:
                publish_time = timezone.localtime(instance.published_at).replace(second=0, microsecond=0)
                self.initial['schedule_for_later'] = publish_time > current_time
            elif self.initial.get('published_at'):
                publish_time = self.initial['published_at']
            else:
                publish_time = current_time
            self.initial['published_at'] = publish_time.strftime('%Y-%m-%dT%H:%M')

        def clean(self):
            cleaned_data = super().clean()
            publish_time = cleaned_data.get('published_at')
            schedule_for_later = cleaned_data.get('schedule_for_later')
            if schedule_for_later and publish_time and publish_time <= timezone.now():
                self.add_error('published_at', "Choose a future date and time to schedule this live update.")
            return cleaned_data

        def save(self, commit=True):
            instance = super().save(commit=False)
            if not self.cleaned_data.get('schedule_for_later'):
                now = timezone.now().replace(second=0, microsecond=0)
                instance.published_at = now
            if commit:
                instance.save()
            return instance

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        form = self.LiveUpdateQuickForm()

        if request.method == 'POST':
            if '_delete_live_update' in request.POST:
                update_id = request.POST.get('live_update_id')
                if str(update_id).isdigit():
                    update = LiveUpdate.objects.filter(pk=int(update_id)).first()
                    if update:
                        update.delete()
                        self.message_user(request, "Live update deleted successfully.", level=messages.SUCCESS)
                return redirect('/admin/newsapp/liveupdate/')

            if '_save_live_update' in request.POST:
                update_id = request.POST.get('live_update_id')
                instance = None
                success_message = "Live update added successfully."
                if str(update_id).isdigit():
                    instance = LiveUpdate.objects.filter(pk=int(update_id)).first()
                    if instance:
                        success_message = "Live update updated successfully."

                form = self.LiveUpdateQuickForm(request.POST, instance=instance)
                if form.is_valid():
                    form.save()
                    self.message_user(request, success_message, level=messages.SUCCESS)
                    return redirect('/admin/newsapp/liveupdate/')

        now = timezone.now()
        updates_qs = LiveUpdate.objects.all().order_by('-published_at', '-created_at')
        paginator = Paginator(updates_qs, 20)
        page_obj = paginator.get_page(request.GET.get('page', 1))
        visible_updates_qs = updates_qs.filter(is_active=True, published_at__lte=now)
        scheduled_updates_qs = updates_qs.filter(is_active=True, published_at__gt=now)

        extra_context.update({
            'live_update_form': form,
            'live_updates_page_obj': page_obj,
            'live_updates_now': now,
            'live_updates_total': updates_qs.count(),
            'live_updates_active_total': visible_updates_qs.count(),
            'live_updates_scheduled_total': scheduled_updates_qs.count(),
            'latest_live_update_at': visible_updates_qs.first().published_at if visible_updates_qs.exists() else None,
        })
        return super().changelist_view(request, extra_context=extra_context)


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


class ArticleVersionAdmin(admin.ModelAdmin):
    change_list_template = 'admin/newsapp/articleversion/change_list.html'
    list_display = ('article', 'version_number', 'edited_by', 'created_at')
    search_fields = ('article__title', 'title', 'subtitle', 'edited_by__username')
    list_select_related = ('article', 'edited_by')
    readonly_fields = ('article', 'version_number', 'title', 'subtitle', 'content', 'edited_by', 'created_at')
    fields = ('article', 'version_number', 'title', 'subtitle', 'content', 'edited_by', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        version = self.get_queryset(request).filter(pk=object_id).select_related('article').first()
        if version and version.article_id:
            return redirect(f'/admin/newsapp/article/{version.article_id}/change/?version_preview={version.id}')
        return redirect('/admin/newsapp/articleversion/')

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:object_id>/restore/',
                self.admin_site.admin_view(self.restore_view),
                name='newsapp_articleversion_restore',
            ),
        ]
        return custom_urls + urls

    def restore_view(self, request, object_id):
        version = get_object_or_404(
            self.get_queryset(request).select_related('article'),
            pk=object_id,
        )
        article = version.article

        if request.method != 'POST':
            return redirect(f'/admin/newsapp/article/{article.pk}/change/?version_preview={version.id}')

        if not request.user.is_superuser and not (
            has_permission(request.user, 'publish_article') or has_permission(request.user, 'edit_any_article')
        ):
            raise PermissionDenied

        article.title = version.title
        article.subtitle = version.subtitle
        article.content = version.content
        article.status = 'published'
        article.save()
        self.message_user(
            request,
            f'Article restored to version v{version.version_number} and published.',
            level=messages.SUCCESS,
        )
        return redirect(f'/admin/newsapp/article/{article.pk}/change/')

    def changelist_view(self, request, extra_context=None):
        original_get = request.GET.copy()
        query = (original_get.get('q') or '').strip()
        article_filter = (original_get.get('article') or '').strip()

        versions_qs = self.get_queryset(request).select_related('article', 'edited_by')

        if query:
            versions_qs = versions_qs.filter(
                Q(article__title__icontains=query) |
                Q(title__icontains=query) |
                Q(subtitle__icontains=query) |
                Q(edited_by__username__icontains=query)
            )

        if article_filter:
            versions_qs = versions_qs.filter(article_id=article_filter)

        versions_qs = versions_qs.order_by('-created_at', '-id')
        paginator = Paginator(versions_qs, 20)
        page_obj = paginator.get_page(original_get.get('page', 1))

        page_query_dict = original_get.copy()
        if 'page' in page_query_dict:
            del page_query_dict['page']

        article_choices = (
            Article.objects
            .filter(versions__isnull=False)
            .distinct()
            .order_by('title')
            .values('id', 'title')
        )

        custom_context = {
            'version_rows': page_obj.object_list,
            'version_page_obj': page_obj,
            'version_paginator': paginator,
            'page_query': page_query_dict.urlencode(),
            'version_total': versions_qs.count(),
            'version_articles_total': versions_qs.values('article_id').distinct().count(),
            'latest_version_at': versions_qs.first().created_at if versions_qs.exists() else None,
            'article_choices': article_choices,
            'article_version_query': query,
            'article_version_article_filter': article_filter,
        }

        response = super().changelist_view(request, extra_context=custom_context)
        if hasattr(response, 'context_data') and response.context_data is not None:
            response.context_data.update(custom_context)
        return response


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
        'kra',
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
        'kra',
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
            return tuple(f for f in self.readonly_fields if f not in {'staff_id', 'kra'})
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

        digilocker_status = request.GET.get('digilocker_status')
        if digilocker_status:
            qs = qs.filter(profile__digilocker_status=digilocker_status)

        if request.GET.get('locked'):
            qs = qs.filter(profile__locked_until__gt=timezone.now())

        paginator = Paginator(qs.select_related('profile'), 15)
        page_obj  = paginator.get_page(request.GET.get('page', 1))

        extra_context.update({
            'users':    page_obj.object_list,
            'page_obj': page_obj,
            'can_manage_users': bool(request.user.is_superuser),
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
        return qs

    def has_view_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_active', False) and getattr(request.user, 'is_staff', False))

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def get_actions(self, request):
        if not request.user.is_superuser:
            return {}
        return super().get_actions(request)

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
        _ensure_superuser(request)
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
        if not (request.user.is_active and request.user.is_staff):
            raise PermissionDenied("You do not have access to this page. Please contact admin regarding this access.")
        user    = get_object_or_404(User, pk=user_id)
        profile = get_object_or_404(UserProfile, user=user)
        can_edit_personal = bool(request.user.is_superuser or request.user.pk == user.pk)

        if request.method == 'POST':
            if not can_edit_personal:
                raise PermissionDenied("You do not have permission to edit this profile.")

            first_name = str(request.POST.get('first_name', '') or '').strip()
            last_name = str(request.POST.get('last_name', '') or '').strip()
            email = str(request.POST.get('email', '') or '').strip()
            phone = str(request.POST.get('phone', '') or '').strip()
            gender = str(request.POST.get('gender', '') or '').strip()
            position = str(request.POST.get('position', '') or '').strip()
            bio = str(request.POST.get('bio', '') or '').strip()
            twitter = str(request.POST.get('twitter', '') or '').strip()
            linkedin = str(request.POST.get('linkedin', '') or '').strip()
            instagram = str(request.POST.get('instagram', '') or '').strip()
            facebook = str(request.POST.get('facebook', '') or '').strip()
            youtube = str(request.POST.get('youtube', '') or '').strip()
            reddit = str(request.POST.get('reddit', '') or '').strip()
            uploaded_profile_image = request.FILES.get('profile_image')

            if email and User.objects.exclude(pk=user.pk).filter(email__iexact=email).exists():
                messages.error(request, "This email is already being used by another user.")
                return redirect(request.path)

            if gender and gender not in dict(UserProfile.GENDER_CHOICES):
                gender = ''

            user.first_name = first_name
            user.last_name = last_name
            user.email = email
            user.save(update_fields=['first_name', 'last_name', 'email'])

            profile.phone = phone
            profile.gender = gender or None
            profile.position = position
            profile.bio = bio
            profile.twitter = twitter
            profile.linkedin = linkedin
            profile.instagram = instagram
            profile.facebook = facebook
            profile.youtube = youtube
            profile.reddit = reddit
            if uploaded_profile_image:
                profile.profile_image = uploaded_profile_image
            profile.save(update_fields=[
                'phone',
                'gender',
                'position',
                'bio',
                'profile_image',
                'twitter',
                'linkedin',
                'instagram',
                'facebook',
                'youtube',
                'reddit',
            ])

            messages.success(request, "Personal info updated successfully.")
            return redirect(request.path)

        now = timezone.now()
        today = timezone.localdate()

        authored_articles_qs = (
            Article.objects
            .filter(author=user)
            .select_related('primary_category', 'assigned_to')
            .order_by('-updated_at')
        )
        assignments_qs = (
            ArticleAssignment.objects
            .filter(user=user)
            .select_related('article', 'assigned_by')
            .order_by('-assigned_at')
        )
        reports_qs = (
            Report.objects
            .filter(user=user)
            .order_by('-report_date', '-report_time', '-created_at')
        )
        attendance_qs = (
            AttendanceRecord.objects
            .filter(user=user)
            .order_by('-date')
        )
        monthly_performance = ReporterMonthlyPerformance.objects.filter(
            reporter=user,
            month=today.month,
            year=today.year,
        ).first()

        article_stats = authored_articles_qs.aggregate(
            total=Count('id'),
            draft=Count('id', filter=Q(status='draft')),
            review=Count('id', filter=Q(status__in=['review', 'fact_check', 'legal'])),
            approved=Count('id', filter=Q(status__in=['approved', 'scheduled'])),
            published=Count('id', filter=Q(status='published')),
            rejected=Count('id', filter=Q(status='rejected')),
        )
        assignment_stats = assignments_qs.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(work_status='pending')),
            completed=Count('id', filter=Q(work_status='completed')),
            overdue=Count('id', filter=Q(work_status='pending', deadline__lt=now)),
        )
        report_stats = reports_qs.aggregate(
            total=Count('id'),
            daily=Count('id', filter=Q(period_type='daily')),
            weekly=Count('id', filter=Q(period_type='weekly')),
            monthly=Count('id', filter=Q(period_type='monthly')),
        )
        attendance_total_seconds = attendance_qs.aggregate(
            total_seconds=Sum('total_active_seconds')
        )['total_seconds'] or 0
        attendance_last_record = attendance_qs.first()
        attendance_entry_count = attendance_qs.count()

        return TemplateResponse(request, 'admin/user_profile.html', {
            **self.admin_site.each_context(request),
            'profile': profile,
            'title':   f'Profile — {user.username}',
            'can_manage_users': bool(request.user.is_superuser),
            'can_edit_personal': can_edit_personal,
            'gender_choices': UserProfile.GENDER_CHOICES,
            'article_stats': article_stats,
            'recent_authored_articles': authored_articles_qs[:5],
            'assignment_stats': assignment_stats,
            'recent_assignments': assignments_qs[:5],
            'report_stats': report_stats,
            'recent_reports': reports_qs[:5],
            'attendance_records': attendance_qs[:7],
            'attendance_entry_count': attendance_entry_count,
            'attendance_total_duration': _format_duration(attendance_total_seconds),
            'attendance_last_record': attendance_last_record,
            'monthly_performance': monthly_performance,
        })


class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'staff_id', 'status', 'digilocker_status', 'updated_kra')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__email', 'staff_id', 'kra')
    list_filter = ('status', 'digilocker_status')
    readonly_fields = ('created_at',)
    fields = (
        'user',
        'staff_id',
        'phone',
        'gender',
        'bio',
        'profile_image',
        'kra',
        'roles',
        'assigned_categories',
        'status',
        'digilocker_status',
        'digilocker_reference_id',
        'digilocker_last_verified_at',
        'digilocker_last_error',
        'digilocker_document_types',
        'digilocker_verified_payload',
        'created_at',
    )

    @admin.display(description="KRA")
    def updated_kra(self, obj):
        return "Added" if obj.kra else "Not set"

    def has_module_permission(self, request):
        return bool(getattr(request.user, 'is_active', False) and getattr(request.user, 'is_staff', False))

    def has_view_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_active', False) and getattr(request.user, 'is_staff', False))

    def has_add_permission(self, request):
        return bool(getattr(request.user, 'is_superuser', False))

    def has_change_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_superuser', False))

    def has_delete_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_superuser', False))


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
                'my-assignments/',
                self.admin_view(self.my_assignments_view),
                name='my_assignments',
            ),
            path(
                'my-assignments/<int:assignment_id>/update/',
                self.admin_view(self.my_assignment_update_view),
                name='my_assignment_update',
            ),
            path(
                'access-denied/',
                self.admin_view(self.access_denied_view),
                name='access_denied',
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

    def access_denied_view(self, request):
        return render(
            request,
            'admin/access_denied.html',
            {
                'title': 'Access Denied',
                'requested_path': request.GET.get('next') or request.path,
            },
            status=403,
        )

    def attendance_view(self, request):
        if request.method == 'POST':
            action = (request.POST.get('attendance_action') or '').strip()
            from .signals import notify_attendance_event
            if action == 'clock_in':
                clock_in_attendance(request.user)
                notify_attendance_event(request.user, 'clock_in')
                messages.success(request, 'Attendance clock-in recorded successfully.')
            elif action == 'clock_out':
                pause_attendance(request.user)
                notify_attendance_event(request.user, 'clock_out')
                messages.success(request, 'Attendance clock-out recorded successfully.')
            return redirect(request.get_full_path())

        today = timezone.localdate()
        search = (request.GET.get('q') or '').strip()
        selected_month = (request.GET.get('month') or str(today.month)).strip()
        selected_status = (request.GET.get('status') or 'all').strip()
        selected_scope = (request.GET.get('scope') or 'today').strip()
        selected_columns = (request.GET.get('columns') or 'full').strip()
        current_user_snapshot = get_attendance_snapshot(request.user)
        user_rows = []
        active_now = 0
        total_seconds_today = 0

        users = User.objects.filter(is_staff=True).select_related('profile').order_by('first_name', 'username')
        if not request.user.is_superuser:
            users = users.filter(pk=request.user.pk)
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
                'clock_in_at': snapshot['clock_in_at'] or started_at,
                'clock_out_at': snapshot['clock_out_at'],
                'last_activity_at': last_activity_at,
                'attendance_date': snapshot['date'],
            })

        return TemplateResponse(request, 'admin/attendance.html', {
            **self.each_context(request),
            'title': 'Attendance',
            'attendance_rows': user_rows,
            'public_holidays': _build_public_holiday_rows(today.year),
            'search': search,
            'today': today,
            'staff_count': users.count(),
            'active_now_count': active_now,
            'total_hours_today': round(total_seconds_today / 3600, 1),
            'total_duration_today': _format_duration(total_seconds_today),
            'current_user_snapshot': current_user_snapshot,
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
        search = (request.GET.get('q') or '').strip()
        export_format = (request.GET.get('export') or '').strip().lower()
        today = timezone.localdate()
        selected_date_raw = (request.GET.get('date') or '').strip()
        selected_date = parse_date(selected_date_raw) if selected_date_raw else None
        selected_month = (request.GET.get('month') or str(today.month)).strip()
        if selected_date:
            selected_month_int = selected_date.month
            selected_year = selected_date.year
        else:
            selected_month_int = int(selected_month) if selected_month.isdigit() and 1 <= int(selected_month) <= 12 else today.month
            selected_year = today.year
        _, total_days_in_month = monthrange(selected_year, selected_month_int)
        month_start = date(selected_year, selected_month_int, 1)
        month_end = date(selected_year, selected_month_int, total_days_in_month)
        period_end = today if selected_month_int == today.month and selected_year == today.year else month_end
        off_dates = _build_month_off_dates(selected_year, selected_month_int)
        elapsed_off_dates = {off_day for off_day in off_dates if month_start <= off_day <= period_end}

        users = User.objects.filter(is_staff=True).select_related('profile').order_by('first_name', 'username')
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        records = AttendanceRecord.objects.filter(
            date__gte=month_start,
            date__lte=month_end,
            user__in=users,
        ).select_related('user').order_by('user__username', '-date')

        specific_date_records = AttendanceRecord.objects.filter(
            date=selected_date if selected_date else today,
            user__in=users,
        ).select_related('user')

        records_by_user = {}
        for record in records:
            records_by_user.setdefault(record.user_id, []).append(record)

        specific_records_by_user = {}
        for record in specific_date_records:
            specific_records_by_user[record.user_id] = record

        if selected_date == today:
            active_time_label = "Today's Hours"
        elif selected_date:
            active_time_label = f"Hours on {selected_date.strftime('%d %b %Y')}"
        else:
            active_time_label = "Hours Logged"

        summary_rows = []
        for member in users:
            user_records = records_by_user.get(member.id, [])
            present_dates = set()
            total_seconds = 0
            is_active = False

            for record in user_records:
                seconds = _attendance_record_seconds(record)
                if record.date == today:
                    snapshot = get_attendance_snapshot(record.user)
                    seconds = snapshot['display_seconds']
                    is_active = snapshot['is_active']
                if seconds > 0 or record.last_clock_in_at or record.last_clock_out_at:
                    present_dates.add(record.date)
                total_seconds += seconds

            duration_seconds = total_seconds
            specific_record = specific_records_by_user.get(member.id)
            if selected_date:
                duration_seconds = 0
                if specific_record:
                    duration_seconds = _attendance_record_seconds(specific_record)
                    if selected_date == today:
                        today_snapshot = get_attendance_snapshot(member)
                        duration_seconds = today_snapshot['display_seconds']
                        is_active = today_snapshot['is_active']

            elapsed_days = (period_end - month_start).days + 1
            present_days = len([day for day in present_dates if month_start <= day <= period_end])
            monthly_offs = len(elapsed_off_dates)
            working_days = max(elapsed_days - monthly_offs, 0)
            absent_days = max(working_days - present_days, 0)
            summary_rows.append({
                'user': member,
                'present_days': present_days,
                'absent_days': absent_days,
                'monthly_offs': monthly_offs,
                'working_days': working_days,
                'working_days_display': f"{working_days}/{total_days_in_month}",
                'duration': _format_duration(duration_seconds),
                'is_active': is_active,
            })

        paginator = Paginator(summary_rows, 20)
        page_obj = paginator.get_page(request.GET.get('page', 1))

        if export_format in {'excel', 'sheets'}:
            filename_prefix = 'attendance_report_excel' if export_format == 'excel' else 'attendance_report_google_sheets'
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="{filename_prefix}_{selected_year}_{selected_month_int:02d}.csv"'
            response.write('\ufeff')
            writer = csv.writer(response)
            writer.writerow([
                'Month',
                'User',
                'Email',
                'Present Days',
                'Absent Days',
                'Off Days',
                'Working Days',
                active_time_label,
                'Live Status',
            ])
            for row in summary_rows:
                writer.writerow([
                    date(selected_year, selected_month_int, 1).strftime('%B %Y'),
                    row['user'].get_full_name() or row['user'].username,
                    row['user'].email or row['user'].username,
                    row['present_days'],
                    row['absent_days'],
                    row['monthly_offs'],
                    row['working_days_display'],
                    row['duration'],
                    'Online' if row['is_active'] else 'Closed',
                ])
            return response

        return TemplateResponse(request, 'admin/attendance_records.html', {
            **self.each_context(request),
            'title': 'Attendance Records',
            'records': page_obj.object_list,
            'page_obj': page_obj,
            'search': search,
            'selected_month': str(selected_month_int),
            'selected_year': selected_year,
            'month_label': date(selected_year, selected_month_int, 1).strftime('%B %Y'),
            'selected_date': selected_date.isoformat() if selected_date else '',
            'active_time_label': active_time_label,
            'total_records': len(summary_rows),
            'month_options': [
                ('1', 'January'), ('2', 'February'), ('3', 'March'), ('4', 'April'),
                ('5', 'May'), ('6', 'June'), ('7', 'July'), ('8', 'August'),
                ('9', 'September'), ('10', 'October'), ('11', 'November'), ('12', 'December'),
            ],
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
        _ensure_superuser(request)
        export_format = (request.GET.get('export') or '').strip().lower()
        subscribers = Newsletter.objects.filter(is_active=True).order_by('-subscribed_at')

        if export_format == 'excel':
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="newsletter_subscribers_{timezone.localdate().isoformat()}.csv"'
            response.write('\ufeff')
            writer = csv.writer(response)
            writer.writerow(['Email', 'Status', 'Source', 'Subscribed At', 'Updated At'])
            for subscriber in subscribers:
                writer.writerow([
                    subscriber.email,
                    'Active' if subscriber.is_active else 'Inactive',
                    subscriber.source,
                    timezone.localtime(subscriber.subscribed_at).strftime('%d %b %Y %I:%M %p') if subscriber.subscribed_at else '',
                    timezone.localtime(subscriber.updated_at).strftime('%d %b %Y %I:%M %p') if subscriber.updated_at else '',
                ])
            return response

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
            'subscriber_count': subscribers.count(),
            'newsletter_asset_version': timezone.now().strftime('%Y%m%d%H%M'),
            'newsletter_logo_url': str(getattr(settings, 'NEWSLETTER_LOGO_URL', '') or '').strip() or request.build_absolute_uri(static('images/NEWS4BHARAT_LOGO.png')),
        }
        return TemplateResponse(request, 'admin/newsletter.html', context)

    def editorial_calendar_view(self, request):
        active_year = timezone.localdate().year
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

    def my_assignments_view(self, request):
        search = (request.GET.get('q') or '').strip()
        status_filter = (request.GET.get('status') or '').strip()
        role_filter = (request.GET.get('role') or '').strip()

        assignments = ArticleAssignment.objects.select_related('article', 'user', 'assigned_by').order_by(
            Case(
                When(work_status='pending', then=0),
                default=1,
            ),
            'deadline',
            '-assigned_at',
        )
        if not request.user.is_superuser:
            assignments = assignments.filter(user=request.user)

        if search:
            assignments = assignments.filter(
                Q(article__title__icontains=search)
                | Q(assignment_message__icontains=search)
                | Q(completion_note__icontains=search)
                | Q(user__username__icontains=search)
                | Q(assigned_by__username__icontains=search)
            )
        if status_filter in {'pending', 'completed'}:
            assignments = assignments.filter(work_status=status_filter)
        if role_filter in {'reporter', 'fact_checker', 'legal'}:
            assignments = assignments.filter(role_type=role_filter)

        now = timezone.now()
        assignment_rows = list(assignments)
        for row in assignment_rows:
            row.deadline_state = ''
            if not row.deadline:
                continue
            if row.deadline < now:
                row.deadline_state = 'overdue'
            elif row.deadline <= now + timedelta(days=2):
                row.deadline_state = 'soon'
            else:
                row.deadline_state = 'normal'

        scope_qs = ArticleAssignment.objects.select_related('article', 'user', 'assigned_by')
        if not request.user.is_superuser:
            scope_qs = scope_qs.filter(user=request.user)

        context = {
            **self.each_context(request),
            'title': 'My Assignments',
            'assignment_rows': assignment_rows,
            'assignment_total': scope_qs.count(),
            'assignment_completed_total': scope_qs.filter(work_status='completed').count(),
            'assignment_pending_total': scope_qs.filter(work_status='pending').count(),
            'assignment_overdue_total': scope_qs.filter(
                work_status='pending',
                deadline__isnull=False,
                deadline__lt=now,
            ).count(),
            'assignment_due_soon_total': scope_qs.filter(
                work_status='pending',
                deadline__isnull=False,
                deadline__gte=now,
                deadline__lte=now + timedelta(days=2),
            ).count(),
            'assignment_search_query': search,
            'assignment_selected_status': status_filter,
            'assignment_selected_role': role_filter,
            'assignment_page_is_admin_view': request.user.is_superuser,
        }
        return TemplateResponse(request, 'admin/my_assignments.html', context)

    def my_assignment_update_view(self, request, assignment_id):
        assignment = get_object_or_404(
            ArticleAssignment.objects.select_related('article', 'user', 'assigned_by'),
            pk=assignment_id,
        )
        if not request.user.is_superuser and assignment.user_id != request.user.id:
            raise PermissionDenied("You cannot update this assignment.")
        if request.method != 'POST':
            return redirect('/admin/my-assignments/')

        completion_note = (request.POST.get('completion_note') or '').strip()
        is_completed = request.POST.get('is_completed') == '1'
        previous_status = assignment.work_status
        previous_note = assignment.completion_note or ''

        assignment.completion_note = completion_note
        if is_completed:
            assignment.work_status = 'completed'
            assignment.completed_at = assignment.completed_at or timezone.now()
        else:
            assignment.work_status = 'pending'
            assignment.completed_at = None
        assignment.save(update_fields=['work_status', 'completion_note', 'completed_at'])

        if assignment.assigned_by_id and assignment.assigned_by_id != request.user.id:
            if previous_status != assignment.work_status or previous_note != completion_note:
                actor_name = request.user.get_full_name() or request.user.username
                article_title = assignment.article.title
                if assignment.work_status == 'completed':
                    title = 'Assignment completed'
                    message = f'{actor_name} marked "{article_title}" as completed.'
                else:
                    title = 'Assignment updated'
                    message = f'{actor_name} updated assignment progress for "{article_title}".'
                Notification.objects.create(
                    user=assignment.assigned_by,
                    notif_type='assign',
                    title=title,
                    message=message,
                    icon='',
                    action_url=f'/admin/newsapp/articleassignment/{assignment.pk}/change/',
                )

        messages.success(
            request,
            'Assignment progress updated successfully.'
            if assignment.work_status == 'completed'
            else 'Assignment moved back to pending.',
        )
        next_url = request.POST.get('next') or '/admin/my-assignments/'
        return redirect(next_url)

    def logout(self, request, extra_context=None):
        from django.contrib.auth import logout as auth_logout
        from django.shortcuts import redirect
        from .signals import notify_attendance_event
        pause_attendance(request.user)
        notify_attendance_event(request.user, 'clock_out')
        auth_logout(request)
        return redirect('/admin/login/')

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}

        try:
            extra_context['published_articles_for_picker'] = (
                Article.objects.filter(status='published')
                .select_related('author')
                .prefetch_related('categories')
                .order_by('-published_at', '-created_at', '-id')[:100]
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
            latest_live_update = (
                LiveUpdate.objects
                .filter(is_active=True, published_at__lte=now)
                .order_by('-published_at', '-created_at')
                .first()
            )
            live_updates_total = LiveUpdate.objects.count()
            attendance_today = timezone.localdate(now)
            attendance_records_today = list(
                AttendanceRecord.objects
                .filter(date=attendance_today, user__is_staff=True)
                .select_related('user')
                .order_by('-current_session_started_at', '-last_activity_at', 'user__first_name', 'user__username')
            )
            attendance_rows = []
            for record in attendance_records_today:
                snapshot = get_attendance_snapshot(record.user, now)
                attendance_rows.append({
                    'user': record.user,
                    'is_active': snapshot['is_active'],
                    'duration': snapshot['display_duration'],
                    'clock_in_at': snapshot['clock_in_at'],
                })

            active_attendance_rows = [row for row in attendance_rows if row['is_active']]
            recent_attendance_rows = active_attendance_rows[:4] or attendance_rows[:4]
            active_attendance_user_ids = {row['user'].id for row in active_attendance_rows}

            team_members = (
                User.objects
                .filter(is_staff=True)
                .select_related('profile')
                .prefetch_related('profile__roles')
                .order_by('first_name', 'username')[:8]
            )
            team_cards = []
            for member in team_members:
                profile = getattr(member, 'profile', None)
                role_name = ''
                if profile:
                    first_role = profile.roles.first()
                    role_name = (profile.position or (first_role.name if first_role else '')).strip()
                team_cards.append({
                    'user': member,
                    'profile': profile,
                    'photo_url': profile.profile_photo_url if profile else '',
                    'role_name': role_name or 'Team Member',
                    'staff_id': getattr(profile, 'staff_id', '') if profile else '',
                    'is_online': member.id in active_attendance_user_ids,
                })

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
                'live_updates_total':    live_updates_total,
                'latest_live_update':    latest_live_update,
                'attendance_today':      attendance_today,
                'attendance_active_count': len(active_attendance_rows),
                'attendance_clocked_count': len(attendance_rows),
                'attendance_recent_rows': recent_attendance_rows,
                'team_cards':            team_cards,
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


class ReportAdmin(admin.ModelAdmin):
    change_list_template = 'admin/newsapp/report/change_list.html'
    list_display = ('user', 'period_type', 'report_date', 'report_time', 'created_at')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__email', 'work_done', 'pending_work', 'notes')
    list_filter = ('period_type', 'report_date')

    def has_module_permission(self, request):
        return bool(getattr(request.user, 'is_active', False) and getattr(request.user, 'is_staff', False))

    def has_view_permission(self, request, obj=None):
        if not self.has_module_permission(request):
            return False
        if obj is None or request.user.is_superuser:
            return True
        return obj.user_id == request.user.id

    def has_add_permission(self, request):
        return self.has_module_permission(request)

    def has_change_permission(self, request, obj=None):
        if not self.has_module_permission(request):
            return False
        if obj is None or request.user.is_superuser:
            return True
        return obj.user_id == request.user.id

    def has_delete_permission(self, request, obj=None):
        if not self.has_module_permission(request):
            return False
        return bool(request.user.is_superuser)

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('user', 'user__profile')
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        base_qs = self.get_queryset(request)
        today = timezone.localdate()
        now_local = timezone.localtime()

        def _get_editable_report():
            report_id_value = (request.GET.get('edit') or request.POST.get('report_id') or '').strip()
            if not report_id_value.isdigit():
                return None
            report = base_qs.filter(pk=int(report_id_value)).first()
            if report is None:
                messages.error(request, 'The selected report was not found.')
                return None
            if not request.user.is_superuser and report.user_id != request.user.id:
                messages.error(request, 'You can only update your own reports.')
                return None
            return report

        if request.method == 'POST' and '_create_report' in request.POST:
            period_type = (request.POST.get('period_type') or 'daily').strip().lower()
            if period_type not in {'daily', 'weekly', 'monthly'}:
                messages.error(request, 'Please choose a valid report type.')
                return redirect(request.path)

            report_date_value = parse_date((request.POST.get('report_date') or '').strip())
            report_time_value = parse_time((request.POST.get('report_time') or '').strip())
            work_done = (request.POST.get('work_done') or '').strip()
            pending_work = (request.POST.get('pending_work') or '').strip()
            notes = (request.POST.get('notes') or '').strip()

            if request.user.is_superuser:
                user_id_value = (request.POST.get('user_id') or '').strip()
                target_user = User.objects.filter(pk=user_id_value, is_staff=True).first() if user_id_value else None
            else:
                target_user = request.user

            if target_user is None:
                messages.error(request, 'Please select a valid staff user.')
                return redirect(request.path)
            if not report_date_value:
                messages.error(request, 'Please select a report date.')
                return redirect(request.path)
            if not report_time_value:
                messages.error(request, 'Please select a report time.')
                return redirect(request.path)
            if not work_done:
                messages.error(request, 'Please add what work was completed.')
                return redirect(request.path)

            Report.objects.create(
                user=target_user,
                period_type=period_type,
                report_date=report_date_value,
                report_time=report_time_value,
                work_done=work_done,
                pending_work=pending_work,
                notes=notes,
            )
            messages.success(request, f'Report saved for {target_user.get_full_name() or target_user.username}.')
            return redirect(request.path)

        if request.method == 'POST' and '_update_report' in request.POST:
            report = _get_editable_report()
            if report is None:
                return redirect(request.path)

            period_type = (request.POST.get('period_type') or report.period_type).strip().lower()
            if period_type not in {'daily', 'weekly', 'monthly'}:
                messages.error(request, 'Please choose a valid report type.')
                return redirect(request.path)

            report_date_value = parse_date((request.POST.get('report_date') or '').strip())
            report_time_value = parse_time((request.POST.get('report_time') or '').strip())
            work_done = (request.POST.get('work_done') or '').strip()
            pending_work = (request.POST.get('pending_work') or '').strip()
            notes = (request.POST.get('notes') or '').strip()

            if request.user.is_superuser:
                user_id_value = (request.POST.get('user_id') or '').strip()
                target_user = User.objects.filter(pk=user_id_value, is_staff=True).first() if user_id_value else None
            else:
                target_user = report.user

            if target_user is None:
                messages.error(request, 'Please select a valid staff user.')
                return redirect(request.path)
            if not report_date_value:
                messages.error(request, 'Please select a report date.')
                return redirect(request.path)
            if not report_time_value:
                messages.error(request, 'Please select a report time.')
                return redirect(request.path)
            if not work_done:
                messages.error(request, 'Please add what work was completed.')
                return redirect(request.path)

            report.user = target_user
            report.period_type = period_type
            report.report_date = report_date_value
            report.report_time = report_time_value
            report.work_done = work_done
            report.pending_work = pending_work
            report.notes = notes
            report.save()
            messages.success(request, f'Report updated for {target_user.get_full_name() or target_user.username}.')
            return redirect(request.path)

        if request.method == 'POST' and '_delete_report' in request.POST:
            if not request.user.is_superuser:
                raise PermissionDenied("Only super admin can delete reports.")
            report = _get_editable_report()
            if report is None:
                return redirect(request.path)
            report_owner = report.user.get_full_name() or report.user.username
            report.delete()
            messages.success(request, f'Report deleted for {report_owner}.')
            return redirect(request.path)

        search = (request.GET.get('q') or '').strip()
        period_type_filter = (request.GET.get('period_type') or '').strip().lower()
        window_filter = (request.GET.get('window') or 'all').strip().lower()
        selected_user_id = (request.GET.get('user_id') or '').strip()
        export_format = (request.GET.get('export') or '').strip().lower()
        editing_report = None
        if (request.GET.get('edit') or '').strip():
            editing_report = _get_editable_report()

        qs = base_qs
        if search:
            qs = qs.filter(
                Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(work_done__icontains=search)
                | Q(pending_work__icontains=search)
                | Q(notes__icontains=search)
            )
        if period_type_filter in {'daily', 'weekly', 'monthly'}:
            qs = qs.filter(period_type=period_type_filter)
        if request.user.is_superuser and selected_user_id.isdigit():
            qs = qs.filter(user_id=int(selected_user_id))

        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        if window_filter == 'this_week':
            qs = qs.filter(report_date__gte=week_start, report_date__lte=today)
        elif window_filter == 'this_month':
            qs = qs.filter(report_date__gte=month_start, report_date__lte=today)

        if export_format in {'excel', 'sheets'}:
            if not request.user.is_superuser:
                raise PermissionDenied("Only super admin can export reports.")
            filename_prefix = 'reports_excel' if export_format == 'excel' else 'reports_google_sheets'
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="{filename_prefix}_{today.isoformat()}.csv"'
            response.write('\ufeff')
            writer = csv.writer(response)
            writer.writerow([
                'User',
                'Email',
                'Staff ID',
                'Report Type',
                'Report Date',
                'Report Time',
                'Work Done',
                'Pending Work',
                'Notes',
                'Created At',
            ])
            for item in qs.order_by('-report_date', '-report_time', '-created_at'):
                writer.writerow([
                    item.user.get_full_name() or item.user.username,
                    item.user.email or item.user.username,
                    getattr(getattr(item.user, 'profile', None), 'staff_id', '') or '',
                    item.get_period_type_display(),
                    item.report_date.strftime('%d %b %Y'),
                    item.report_time.strftime('%I:%M %p'),
                    item.work_done,
                    item.pending_work,
                    item.notes,
                    timezone.localtime(item.created_at).strftime('%d %b %Y %I:%M %p'),
                ])
            return response

        total_reports = qs.count()
        daily_count = qs.filter(period_type='daily').count()
        weekly_count = qs.filter(period_type='weekly').count()
        monthly_count = qs.filter(period_type='monthly').count()

        paginator = Paginator(qs.order_by('-report_date', '-report_time', '-created_at'), 20)
        page_obj = paginator.get_page(request.GET.get('page', 1))
        for report in page_obj.object_list:
            created_at = getattr(report, 'created_at', None)
            updated_at = getattr(report, 'updated_at', None)
            report.was_updated = bool(
                created_at
                and updated_at
                and updated_at > (created_at + timedelta(seconds=2))
            )

        user_choices = []
        if request.user.is_superuser:
            user_choices = list(
                User.objects.filter(is_staff=True).select_related('profile').order_by('first_name', 'username')
            )

        extra_context.update({
            'title': 'Reports',
            'reports': page_obj.object_list,
            'page_obj': page_obj,
            'total_reports': total_reports,
            'daily_count': daily_count,
            'weekly_count': weekly_count,
            'monthly_count': monthly_count,
            'search': search,
            'selected_period_type': period_type_filter,
            'selected_window': window_filter,
            'selected_user_id': selected_user_id,
            'user_choices': user_choices,
            'report_type_choices': Report.PERIOD_TYPE_CHOICES,
            'default_report_date': editing_report.report_date.isoformat() if editing_report else today.isoformat(),
            'default_report_time': editing_report.report_time.strftime('%H:%M') if editing_report else now_local.strftime('%H:%M'),
            'can_export_reports': bool(request.user.is_superuser),
            'editing_report': editing_report,
        })

        return TemplateResponse(
            request,
            self.change_list_template,
            {**self.admin_site.each_context(request), **extra_context},
        )


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
        return (
            obj.author_id == user.id
            or obj.assigned_to_id == user.id
            or obj.assignments.filter(user_id=user.id, role_type='reporter').exists()
        )

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

    def get_readonly_fields(self, request, obj=None):
        return super().get_readonly_fields(request, obj)

    def get_queryset(self, request):
        qs = (
            super().get_queryset(request)
            .prefetch_related('categories', 'assignments__user')
            .select_related('author', 'assigned_to')
        )
        if request.user.is_superuser or self._can_edit_any_article(request.user):
            return qs
        if self._can_edit_limited_articles(request.user) or has_permission(request.user, 'create_article'):
            return qs.filter(
                Q(author=request.user)
                | Q(assigned_to=request.user)
                | Q(assignments__user=request.user, assignments__role_type='reporter')
            ).distinct()
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
                if obj.status == 'published' and not (
                    request.user.is_superuser
                    or has_permission(request.user, 'publish_article')
                ):
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

    def _format_admin_datetime(self, value):
        if not value:
            return ''
        return timezone.localtime(value).strftime('%d %b %Y, %I:%M %p IST')

    def _build_publish_history(self, article):
        if not article:
            return []

        history = []
        seen_keys = set()
        article_change_url = f'/admin/newsapp/article/{article.pk}/change/'

        def add_entry(dt, label, *, is_original=False, url=''):
            if not dt:
                return
            local_dt = timezone.localtime(dt)
            key = local_dt.strftime('%Y-%m-%d %H:%M')
            if key in seen_keys:
                return
            seen_keys.add(key)
            history.append({
                'label': label,
                'display': local_dt.strftime('%d %b %Y, %I:%M %p IST'),
                'sort_value': local_dt.isoformat(),
                'is_original': is_original,
                'url': url,
            })

        versions = list(
            article.versions.order_by('version_number', 'created_at').only('id', 'version_number', 'created_at')
        )
        publish_logs = list(
            article.workflow_logs
            .filter(new_status='published')
            .order_by('changed_at')
            .only('changed_at')
        )

        original_candidates = []
        if article.published_at:
            original_candidates.append(article.published_at)
        if versions:
            original_candidates.append(versions[0].created_at)
        if publish_logs:
            original_candidates.append(publish_logs[0].changed_at)

        original_dt = min(original_candidates) if original_candidates else None
        original_url = article_change_url
        for version in versions:
            if original_dt and timezone.localtime(version.created_at).strftime('%Y-%m-%d %H:%M') == timezone.localtime(original_dt).strftime('%Y-%m-%d %H:%M'):
                original_url = f'{article_change_url}?version_preview={version.id}'
                break

        if original_dt:
            add_entry(original_dt, 'Original publish date', is_original=True, url=original_url)

        for version in versions:
            add_entry(
                version.created_at,
                f'Updated / republished around v{version.version_number}',
                url=f'{article_change_url}?version_preview={version.id}',
            )

        for log in publish_logs:
            add_entry(log.changed_at, 'Republished live')

        add_entry(article.published_at, 'Current visible publish date', is_original=not history, url=article_change_url)
        history.sort(key=lambda item: item['sort_value'])
        return history

    def _can_restore_version(self, request, obj=None):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return has_permission(user, 'publish_article') or has_permission(user, 'edit_any_article')

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['can_edit_slug'] = True
        extra_context['can_publish_article'] = bool(
            request.user.is_superuser or has_permission(request.user, 'publish_article')
        )
        article = None
        publish_history = []
        version_preview = None
        reporter_assignment_rows = []
        if object_id:
            article = self.get_queryset(request).filter(pk=object_id).first()
            if article:
                publish_history = self._build_publish_history(article)
                reporter_assignment_rows = [
                    {
                        'user_id': item.user_id,
                        'deadline': timezone.localtime(item.deadline).strftime('%Y-%m-%dT%H:%M') if item.deadline else '',
                        'assignment_message': item.assignment_message or '',
                    }
                    for item in article.assignments.filter(role_type='reporter').select_related('user').order_by('assigned_at', 'id')
                ]
                if not reporter_assignment_rows and article.assigned_to_id:
                    reporter_assignment_rows = [{
                        'user_id': article.assigned_to_id,
                        'deadline': timezone.localtime(article.deadline).strftime('%Y-%m-%dT%H:%M') if article.deadline else '',
                        'assignment_message': '',
                    }]
                version_preview_id = (request.GET.get('version_preview') or '').strip()
                if version_preview_id.isdigit():
                    version_preview = (
                        ArticleVersion.objects
                        .filter(pk=int(version_preview_id), article_id=article.pk)
                        .select_related('edited_by')
                        .first()
                    )
        extra_context['article_publish_history'] = publish_history
        extra_context['article_original_publish_date'] = next(
            (item['display'] for item in publish_history if item.get('is_original')),
            ''
        )
        extra_context['article_version_preview'] = version_preview
        extra_context['can_restore_preview_version'] = bool(version_preview and self._can_restore_version(request, article))
        extra_context['article_version_restore_url'] = (
            f'/admin/newsapp/articleversion/{version_preview.id}/restore/'
            if version_preview else ''
        )
        extra_context['article_version_history_url'] = '/admin/newsapp/articleversion/'
        extra_context['reporter_assignment_rows'] = reporter_assignment_rows
        return super().changeform_view(request, object_id, form_url, extra_context)

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


class ArticleAssignmentAdmin(admin.ModelAdmin):
    change_list_template = 'admin/newsapp/articleassignment/change_list.html'
    list_select_related = ('article', 'user', 'assigned_by')
    search_fields = ('article__title', 'user__username', 'assigned_by__username', 'assignment_message')
    list_filter = ('role_type', 'assigned_at', 'deadline')
    ordering = ('-assigned_at',)

    def save_model(self, request, obj, form, change):
        previous = None
        if change and obj.pk:
            previous = (
                ArticleAssignment.objects.select_related('user', 'article', 'assigned_by')
                .filter(pk=obj.pk)
                .first()
            )

        if not getattr(obj, 'assigned_by_id', None):
            obj.assigned_by = request.user

        super().save_model(request, obj, form, change)

        should_email = not change
        if previous is not None:
            should_email = any([
                previous.user_id != obj.user_id,
                previous.article_id != obj.article_id,
                (previous.assignment_message or '') != (obj.assignment_message or ''),
                previous.deadline != obj.deadline,
                previous.role_type != obj.role_type,
            ])

        if should_email:
            from .views import _send_assignment_email

            _send_assignment_email(
                article=obj.article,
                reporter=obj.user,
                assigned_by=obj.assigned_by or request.user,
                assignment_message=obj.assignment_message,
                deadline=obj.deadline,
            )

    def has_module_permission(self, request):
        return bool(getattr(request.user, 'is_superuser', False))

    def has_view_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_superuser', False))

    def has_add_permission(self, request):
        return bool(getattr(request.user, 'is_superuser', False))

    def has_change_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_superuser', False))

    def has_delete_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_superuser', False))

    def changelist_view(self, request, extra_context=None):
        response = super().changelist_view(request, extra_context=extra_context)
        try:
            cl = response.context_data['cl']
        except (AttributeError, KeyError, TypeError):
            return response

        full_qs = cl.root_queryset.select_related('article', 'user', 'assigned_by')
        visible_qs = cl.queryset.select_related('article', 'user', 'assigned_by')
        now = timezone.now()
        assignment_rows = list(cl.result_list)

        for row in assignment_rows:
            deadline = getattr(row, 'deadline', None)
            row.deadline_state = ''
            if not deadline:
                continue
            if deadline < now:
                row.deadline_state = 'overdue'
            elif deadline <= now + timedelta(days=2):
                row.deadline_state = 'soon'
            else:
                row.deadline_state = 'normal'

        response.context_data.update({
            'assignment_rows': assignment_rows,
            'assignment_total': full_qs.count(),
            'assignment_visible_total': visible_qs.count(),
            'assignment_reporter_total': full_qs.filter(role_type='reporter').count(),
            'assignment_fact_checker_total': full_qs.filter(role_type='fact_checker').count(),
            'assignment_legal_total': full_qs.filter(role_type='legal').count(),
            'assignment_due_soon_total': full_qs.filter(
                deadline__isnull=False,
                deadline__gte=now,
                deadline__lte=now + timedelta(days=2),
            ).count(),
            'assignment_overdue_total': full_qs.filter(deadline__isnull=False, deadline__lt=now).count(),
            'assignment_search_query': request.GET.get('q', '').strip(),
            'assignment_selected_role': request.GET.get('role_type__exact', '').strip(),
            'assignment_now': now,
        })
        return response


class CategoryAdmin(admin.ModelAdmin):
    change_list_template = 'admin/newsapp/category/change_list.html'
    search_fields = ('name', 'slug', 'description')
    list_display = ('name', 'slug', 'status')
    list_filter = ('status',)

    def has_module_permission(self, request):
        return bool(getattr(request.user, 'is_active', False) and getattr(request.user, 'is_staff', False))

    def has_view_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_active', False) and getattr(request.user, 'is_staff', False))

    def has_add_permission(self, request):
        return bool(getattr(request.user, 'is_superuser', False))

    def has_change_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_superuser', False))

    def has_delete_permission(self, request, obj=None):
        return bool(getattr(request.user, 'is_superuser', False))

    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(super().get_readonly_fields(request, obj))
        if not _can_manage_slug(request.user) and 'slug' not in readonly_fields:
            readonly_fields.append('slug')
        return readonly_fields

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['can_edit_category_slug'] = _can_manage_slug(request.user)
        extra_context['can_manage_categories'] = bool(getattr(request.user, 'is_superuser', False))
        return super().changelist_view(request, extra_context=extra_context)


# ══════════════════════════════════════════════════════════════
#  REGISTER ALL MODELS
# ══════════════════════════════════════════════════════════════

admin_site = NewsAdminSite(name='newsadmin')

admin_site.register(User,                       UserAdmin)
admin_site.register(Group)
admin_site.register(Role,                       RoleAdmin)
admin_site.register(Permission)
admin_site.register(Category,                   CategoryAdmin)
admin_site.register(UserProfile,                UserProfileAdmin)
admin_site.register(LoginAttemptLog,            LoginAttemptLogAdmin)
admin_site.register(Article,                    ArticleAdmin)
admin_site.register(ArticleAssignment,          ArticleAssignmentAdmin)
admin_site.register(ArticleVersion,             ArticleVersionAdmin)
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
admin_site.register(Report,                     ReportAdmin)
admin_site.register(NewsletterLog,               NewsletterLogAdmin)
admin_site.register(NewsletterCard,              NewsletterCardAdmin)
admin_site.register(LiveUpdate,                  LiveUpdateAdmin)
admin_site.register(PushSubscription,            PushSubscriptionAdmin)
admin_site.register(PushNotificationLog,         PushNotificationLogAdmin)
