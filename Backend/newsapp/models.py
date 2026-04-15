from django.db import models
from django.contrib.auth.models import User
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from .workflow import ALLOWED_TRANSITIONS
from django.core.exceptions import ValidationError
import uuid


class Role(models.Model):
    name = models.CharField(max_length=50)
    permissions = models.ManyToManyField('Permission', blank=True)

    def __str__(self):
        return self.name


class Permission(models.Model):
    code = models.CharField(max_length=100)   
    description = models.CharField(max_length=255)

    def __str__(self):
        return self.code

from django.utils.text import slugify

class Category(models.Model):
    name           = models.CharField(max_length=100)
    slug           = models.SlugField(max_length=100, unique=True, blank=True)
    description    = models.TextField(blank=True)
    status         = models.CharField(max_length=10, default='active')
    sub_categories = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Article(models.Model):
    STATUS_CHOICES = [
        ('draft',      'Draft'),
        ('review',     'In Review'),
        ('fact_check', 'Fact Check'),
        ('legal',      'Legal Review'),
        ('approved',   'Approved'),
        ('scheduled',  'Scheduled'),
        ('published',  'Published'),
        ('archived',   'Archived'),
        ('rejected',   'Rejected'),
    ]
 
    title    = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    content  = models.TextField()
    image    = models.ImageField(upload_to="articles/", blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    # FIX 1: image_alt and image_source were already in model — confirmed present
    image_alt    = models.CharField(max_length=200, blank=True, default='')
    image_source = models.CharField(max_length=200, blank=True, default='')
 
    def get_image(self):
        if self.image:
            return self.image.url
        return self.image_url
 
    # ── Multi-category (ManyToMany) ──
    categories = models.ManyToManyField(
        'Category',
        related_name='articles',
        blank=True
    )

    # ── Selected subcategories (JSON) ──
    # Format: {"cat_pk": ["Sub Name 1", "Sub Name 2"]}
    primary_category = models.ForeignKey(
        'Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='primary_articles'
    )
    selected_subcategories = models.JSONField(default=dict, blank=True)
 
    # ── Audit: kisne actually post kiya (backend only) ──
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='articles_authored'
    )
 
    # ── Display: frontend pe article ke neeche jo dikhega ──
    author_display_name      = models.CharField(max_length=150, blank=True)
    author_display_position  = models.CharField(max_length=150, blank=True)
    author_display_bio       = models.TextField(blank=True)
    author_display_photo     = models.URLField(blank=True)
    author_display_twitter   = models.CharField(max_length=200, blank=True)
    author_display_linkedin  = models.CharField(max_length=200, blank=True)
    author_display_instagram = models.CharField(max_length=200, blank=True)
    author_display_facebook  = models.CharField(max_length=200, blank=True)
    author_display_youtube   = models.CharField(max_length=200, blank=True)
    author_display_reddit    = models.CharField(max_length=200, blank=True)
    author_display_articles_count = models.PositiveIntegerField(default=0)
 
    # ── SEO fields ──
    slug             = models.SlugField(max_length=100, unique=True, blank=True)
    canonical_url    = models.URLField(blank=True)
    meta_description = models.TextField(blank=True)
    focus_keyword    = models.CharField(max_length=100, blank=True)
    # FIX: secondary_keywords field
    secondary_keywords = models.CharField(max_length=500, blank=True, default='')
    noindex          = models.BooleanField(default=False)
    nofollow         = models.BooleanField(default=False)
    in_sitemap       = models.BooleanField(default=True)

    # ── Tags (comma-separated string stored, exposed as list via serializer) ──
    tags = models.CharField(max_length=500, blank=True, default='')
 
    status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    priority = models.IntegerField(default=5)
    is_paid  = models.BooleanField(default=False)
 
    created_at   = models.DateTimeField(auto_now_add=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
 
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='articles_assigned_to'
    )
    deadline = models.DateTimeField(null=True, blank=True)
 
    def clean(self):
        if self.assigned_to and self.pk:
            profile = self.assigned_to.profile
            for cat in self.categories.all():
                if not profile.assigned_categories.filter(id=cat.id).exists():
                    pass  # raise ValidationError if needed
 

    def save(self, *args, **kwargs):
        is_update = self.pk is not None
    
        # ✅ SLUG AUTO GENERATE
        if not self.slug:
            self.slug = slugify(self.title) + "-" + str(uuid.uuid4())[:5]
    
        if is_update:
            old_article = Article.objects.get(pk=self.pk)
    
            # Versioning Logic (Content Change)
            if (
                old_article.title    != self.title or
                old_article.subtitle != self.subtitle or
                old_article.content  != self.content
            ):
                last_version = self.versions.order_by('-version_number').first()
                next_version_number = 1 if not last_version else last_version.version_number + 1
    
                ArticleVersion.objects.create(
                    article=self,
                    title=old_article.title,
                    subtitle=old_article.subtitle,
                    content=old_article.content,
                    edited_by=self.author,
                    version_number=next_version_number
                )
    
            if old_article.status != self.status:
                ArticleWorkflowLog.objects.create(
                    article=self,
                    old_status=old_article.status,
                    new_status=self.status,
                    changed_by=self.author,
                    remarks=""
                )
    
                # ✅ ENSURE published_at set
                if self.status == "published" and not self.published_at:
                    self.published_at = timezone.now()
    
                    from newsapp.signals import ping_google_sitemap
                    ping_google_sitemap()
    
            if self.assigned_to and self.status != 'draft':
                if self.assigned_to.profile.status == "suspended":
                    raise ValidationError("This reporter is suspended.")
    
        else:
            # ✅ NEW OBJECT CASE
            if self.status == "published" and not self.published_at:
                self.published_at = timezone.now()
    
        self.full_clean()
        super().save(*args, **kwargs)
     
    def __str__(self):
        return self.title


class ArticleVersion(models.Model):
    article        = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    title          = models.CharField(max_length=255)
    subtitle       = models.CharField(max_length=255, blank=True)
    content        = models.TextField()
    edited_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at     = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ['-version_number']
 
    def __str__(self):
        return f"{self.article.title} — v{self.version_number}"
    
class ArticleWorkflowLog(models.Model):
    article    = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='workflow_logs')
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    remarks    = models.TextField(blank=True)
 
    def __str__(self):
        return f"{self.article.title}: {self.old_status} → {self.new_status}"


class ArticleAssignment(models.Model):
    ROLE_TYPES = [
        ('reporter', 'Reporter'),
        ('fact_checker', 'Fact Checker'),
        ('legal', 'Legal Reviewer'),
    ]

    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role_type = models.CharField(max_length=20, choices=ROLE_TYPES)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assigned_articles')

    def __str__(self):
        return f"{self.article.title} → {self.user.username} ({self.role_type})"

class FactCheck(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='fact_checks')
    checked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('issues_found', 'Issues Found')
    ])
    remarks = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"FactCheck - {self.article.title}"
    
class HomepageSlot(models.Model):

    SLOT_CHOICES = [
        ('hero', 'Hero'),
        ('breaking', 'Breaking'),
        ('top_1', 'Top 1'),
        ('top_2', 'Top 2'),
        ('featured', 'Featured'),
        ('latest_news', 'Latest News'),
        ('ad_banner', 'Ad Banner'),
    ]

    MODE_CHOICES = [
        ('manual', 'Manual'),
        ('auto', 'Auto'),
    ]

    AUTO_RULE_CHOICES = [
        ('latest', 'Latest Published'),
        ('most_viewed', 'Most Viewed'),
    ]

    slot_name = models.CharField(max_length=20, choices=SLOT_CHOICES, unique=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='auto')

    article = models.ForeignKey(
        'Article',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homepage_primary_slots'
    )

    overlay_article_1 = models.ForeignKey(
        'Article',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homepage_overlay_slot_1'
    )
    overlay_article_2 = models.ForeignKey(
        'Article',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homepage_overlay_slot_2'
    )
    overlay_article_3 = models.ForeignKey(
        'Article',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homepage_overlay_slot_3'
    )

    display_count = models.PositiveSmallIntegerField(default=4)
    category_filter = models.ForeignKey(
        'Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homepage_slots'
    )
    manual_articles = models.ManyToManyField(
        'Article',
        blank=True,
        related_name='homepage_manual_slots'
    )

    ad_image = models.ImageField(upload_to='homepage_ads/', blank=True, null=True)
    ad_image_url = models.URLField(blank=True, default='')
    ad_link_url = models.URLField(blank=True, default='')

    auto_rule = models.CharField(
        max_length=20,
        choices=AUTO_RULE_CHOICES,
        blank=True,
        null=True
    )

    pin_until = models.DateTimeField(blank=True, null=True)

    is_active = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.slot_name} ({self.mode})"
    

class MetalRate(models.Model):
    METAL_CHOICES = [
        ('gold', 'Gold'),
        ('silver', 'Silver'),
    ]

    metal_type = models.CharField(max_length=10, choices=METAL_CHOICES)
    price = models.FloatField()
    change = models.FloatField(default=0)
    percent_change = models.FloatField(default=0)
    trend = models.CharField(max_length=10, default="neutral")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.metal_type} - {self.price}"

class Reporter(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    employee_id = models.CharField(max_length=50, unique=True)
    phone = models.CharField(max_length=15, blank=True)

    designation = models.CharField(max_length=100, default="Reporter")
    employment_type = models.CharField(
        max_length=20,
        choices=[
            ("full_time", "Full Time"),
            ("part_time", "Part Time"),
            ("freelancer", "Freelancer"),
        ],
        default="full_time"
    )

    assigned_categories = models.ManyToManyField("Category", blank=True)

    is_active = models.BooleanField(default=True)
    joining_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.employee_id})"

class ReporterMonthlyPerformance(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE)

    month = models.IntegerField()
    year = models.IntegerField()

    articles_assigned = models.IntegerField(default=0)
    articles_submitted = models.IntegerField(default=0)
    articles_published = models.IntegerField(default=0)
    articles_rejected = models.IntegerField(default=0)

    rejection_rate = models.FloatField(default=0)
    deadline_adherence_rate = models.FloatField(default=0)

    avg_views = models.IntegerField(default=0)
    avg_engagement_score = models.FloatField(default=0)
    plagiarism_avg_score = models.FloatField(default=0)

    performance_score = models.FloatField(default=0)

    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("reporter", "month", "year")

    def __str__(self):
        return f"{self.reporter.username} - {self.month}/{self.year}"


import random
import string
import pyotp
from django.db import models
from django.contrib.auth.models import User

from datetime import timedelta


def generate_user_id():
    while True:
        uid = "N4B-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not UserProfile.objects.filter(user_id=uid).exists():
            return uid


def generate_password(length=12):
    chars = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$%^&*"),
    ]
    chars += random.choices(string.ascii_letters + string.digits + "!@#$%^&*", k=length - 4)
    random.shuffle(chars)
    return ''.join(chars)


class UserProfile(models.Model):

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )

    staff_id = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True
    )
    plain_password = models.CharField(max_length=50, blank=True)

    totp_secret = models.CharField(max_length=64, blank=True)
    is_2fa_enabled = models.BooleanField(default=False)

    failed_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    total_failed_ever = models.PositiveIntegerField(default=0)
    last_failed_at = models.DateTimeField(null=True, blank=True)

    remember_me = models.BooleanField(default=False)
    session_timeout_min = models.PositiveIntegerField(default=30)

    login_attempts_ip = models.JSONField(default=dict, blank=True)

    roles = models.ManyToManyField('Role', blank=True)
    phone = models.CharField(max_length=15, blank=True)
    bio = models.TextField(blank=True)

    # ── Social links for editor profile ──
    position  = models.CharField(max_length=150, blank=True)
    photo     = models.URLField(blank=True)
    twitter   = models.CharField(max_length=200, blank=True)
    linkedin  = models.CharField(max_length=200, blank=True)
    instagram = models.CharField(max_length=200, blank=True)
    facebook  = models.CharField(max_length=200, blank=True)
    youtube   = models.CharField(max_length=200, blank=True)
    reddit    = models.CharField(max_length=200, blank=True)

    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        blank=True,
        null=True
    )

    extra_permissions = models.ManyToManyField(
        'Permission', 
        blank=True, 
        related_name='user_extra_permissions'
    )

    assigned_categories = models.ManyToManyField('Category', blank=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('suspended', 'Suspended')
        ],
        default='active'
    )

    last_seen = models.DateTimeField(null=True, blank=True)

    def is_online(self):
        from django.utils import timezone
        if not self.last_seen:
            return False
        return (timezone.now() - self.last_seen).total_seconds() < 300

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} | {self.staff_id or 'No Staff ID'}"


class LoginAttemptLog(models.Model):
    STATUS_CHOICES = [
        ('success',     'Success'),
        ('wrong_pass',  'Wrong Password'),
        ('locked',      'Account Locked'),
        ('regenerated', 'Credentials Regenerated'),
        ('2fa_fail',    '2FA Failed'),
        ('rate_limit',  'Rate Limited'),
    ]

    user        = models.ForeignKey(User, on_delete=models.SET_NULL,
                    null=True, blank=True, related_name='login_logs')
    username_tried = models.CharField(max_length=150, blank=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    user_agent  = models.TextField(blank=True)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES)
    timestamp   = models.DateTimeField(auto_now_add=True)
    note        = models.TextField(blank=True)

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.username_tried} → {self.status}"

    class Meta:
        ordering            = ['-timestamp']
        verbose_name        = "Login Attempt Log"
        verbose_name_plural = "Login Attempt Logs"

class Conversation(models.Model):

    TYPE_CHOICES = (
        ("private", "Private"),
        ("group", "Group"),
    )

    conv_type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES
    )

    name = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    members = models.ManyToManyField(
        User,
        through="ConversationMember",
        related_name="conversations"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name or f"Conversation {self.id}"
    
class ConversationMember(models.Model):

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    last_read = models.DateTimeField(
        blank=True,
        null=True
    )

    joined_at = models.DateTimeField(
        auto_now_add=True
    )

class Message(models.Model):

    MESSAGE_TYPES = (
        ("text","Text"),
        ("image","Image"),
        ("file","File"),
    )

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    message_type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPES,
        default="text"
    )

    text = models.TextField(blank=True)

    file = models.FileField(
        upload_to="chat/files/",
        blank=True,
        null=True
    )

    image = models.ImageField(
        upload_to="chat/images/",
        blank=True,
        null=True
    )

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_messages",
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    is_read = models.BooleanField(default=False)


class Notification(models.Model):

    NOTIF_TYPES = (
        ("article","Article"),
        ("assign","Assignment"),
        ("role","Role"),
        ("message","Message"),
        ("social","Social"),
        ("category","Category"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    notif_type = models.CharField(
        max_length=20,
        choices=NOTIF_TYPES
    )

    title = models.CharField(max_length=255)

    message = models.TextField()

    icon = models.CharField(
        max_length=10,
        default="🔔"
    )

    is_read = models.BooleanField(
        default=False
    )

    is_archived = models.BooleanField(default=False)

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    action_url = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    def __str__(self):
        return self.title

class NewsletterLog(models.Model):
    """Newsletter send history track karta hai"""
    trace_id = models.CharField(max_length=40, blank=True, default='', db_index=True)
    subject       = models.CharField(max_length=300)
    recipients    = models.JSONField(default=list)        # list of emails
    chosen_articles = models.JSONField(default=dict)      # {"hero": "slug", ...}
    success_emails = models.JSONField(default=list)
    failed_emails = models.JSONField(default=list)
    delivered_emails = models.JSONField(default=list)
    opened_emails = models.JSONField(default=list)
    clicked_emails = models.JSONField(default=list)
    bounced_emails = models.JSONField(default=list)
    brevo_message_ids = models.JSONField(default=list)
    event_history = models.JSONField(default=list)
    sent_count    = models.IntegerField(default=0)
    failed_count  = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    opened_count = models.IntegerField(default=0)
    clicked_count = models.IntegerField(default=0)
    bounced_count = models.IntegerField(default=0)
    sent_at       = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Newsletter Log'
        verbose_name_plural = 'Newsletter Logs'
 
    def __str__(self):
        return f"{self.subject} — {self.sent_at.strftime('%d %b %Y %H:%M')} ({self.sent_count} sent)"


class NewsletterCard(models.Model):
    title = models.CharField(max_length=255)
    image = models.URLField()
    description = models.TextField()
    link = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'newsletter_cards'
        ordering = ['-created_at']
        verbose_name = 'Newsletter Card'
        verbose_name_plural = 'Newsletter Cards'

    def __str__(self):
        return self.title


class Newsletter(models.Model):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    source = models.CharField(max_length=50, blank=True, default='email_cta')
    subscribed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'newsletter'
        ordering = ['-subscribed_at']
        verbose_name = 'Newsletter Subscriber'
        verbose_name_plural = 'Newsletter Subscribers'

    def __str__(self):
        return self.email
