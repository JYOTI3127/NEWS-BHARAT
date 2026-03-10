from django.db import models
from django.contrib.auth.models import User
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from .workflow import ALLOWED_TRANSITIONS
from django.core.exceptions import ValidationError


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
    status         = models.CharField(max_length=10, default='active')   # ← ADD
    sub_categories = models.JSONField(default=dict, blank=True)          # ← ADD

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    def get_articles(self):
        return self.articles.filter(status='published')

    def get_article_count(self):
        return self.articles.filter(status='published').count()

class Article(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('review', 'In Review'),
        ('fact_check', 'Fact Check'),
        ('legal', 'Legal Review'),
        ('approved', 'Approved'),
        ('scheduled', 'Scheduled'),
        ('published', 'Published'),
        ('archived', 'Archived'),
        ('rejected', 'Rejected'),
    ]

    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    # file upload
    image = models.ImageField(upload_to="articles/", blank=True, null=True)

    # url image
    image_url = models.URLField(blank=True, null=True)

    def get_image(self):
        if self.image:
            return self.image.url
        return self.image_url

    category = models.ForeignKey(
    'Category',
    on_delete=models.CASCADE,
    related_name='articles'
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    priority = models.IntegerField(default=5)
    is_paid = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
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
        if self.assigned_to and self.category_id:
            profile = self.assigned_to.profile

            if not profile.assigned_categories.filter(id=self.category_id).exists():
                # raise ValidationError("Reporter not allowed for this category")
                pass


    def save(self, *args, **kwargs):
        is_update = self.pk is not None

        if is_update:
            old_article = Article.objects.get(pk=self.pk)

            # 🔹 Versioning Logic (Content Change)
            if (
                old_article.title != self.title or
                old_article.subtitle != self.subtitle or
                old_article.content != self.content
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
                # Workflow Log Logic (Status Change)
                ArticleWorkflowLog.objects.create(
                    article=self,
                    old_status=old_article.status,
                    new_status=self.status,
                    changed_by=self.author,
                    remarks=""
                )

                # Auto set published_at
                if self.status == "published":
                    self.published_at = timezone.now()

            if self.assigned_to and self.status != 'draft':
                if self.assigned_to.profile.status == "suspended":
                    raise ValidationError("This reporter is suspended.")

        self.full_clean()  
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class ArticleVersion(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='versions')
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    edited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    edited_at = models.DateTimeField(auto_now_add=True)
    version_number = models.IntegerField()

    def __str__(self):
        return f"{self.article.title} - v{self.version_number}"
    
class ArticleWorkflowLog(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='workflow_logs')
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True)

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
        blank=True
    )

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
    price = models.FloatField()  # store in final display unit
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

    # Work Stats
    articles_assigned = models.IntegerField(default=0)
    articles_submitted = models.IntegerField(default=0)
    articles_published = models.IntegerField(default=0)
    articles_rejected = models.IntegerField(default=0)

    # Metrics
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

# ============================================================
#  models.py  —  Full Security System
#  Features:
#   - Auto User ID + Password generation
#   - Failed login attempt tracking
#   - Account lockout after 3 attempts
#   - New ID+Pass generation after 6 total attempts
#   - 2FA token storage
#   - Session timeout tracking
#   - Login rate limiting support
# ============================================================

import random
import string
import pyotp                          # pip install pyotp
from django.db import models
from django.contrib.auth.models import User

from django.utils import timezone
from datetime import timedelta


# ── Helpers ──────────────────────────────────────────────────

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


# ── UserProfile ───────────────────────────────────────────────

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

    # ───────── Credentials ─────────
    staff_id = models.CharField(
    max_length=20,
    unique=True,
    blank=True,
    null=True
    )
    plain_password = models.CharField(max_length=50, blank=True)

    # ───────── 2FA ─────────
    totp_secret = models.CharField(max_length=64, blank=True)
    is_2fa_enabled = models.BooleanField(default=False)

    # ───────── Lockout ─────────
    failed_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    total_failed_ever = models.PositiveIntegerField(default=0)
    last_failed_at = models.DateTimeField(null=True, blank=True)

    # ───────── Session ─────────
    remember_me = models.BooleanField(default=False)
    session_timeout_min = models.PositiveIntegerField(default=30)

    # ───────── Rate limiting ─────────
    login_attempts_ip = models.JSONField(default=dict, blank=True)

    # ───────── Profile Info ─────────
    roles = models.ManyToManyField('Role', blank=True)
    phone = models.CharField(max_length=15, blank=True)
    bio = models.TextField(blank=True)

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

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} | {self.staff_id or 'No Staff ID'}"

# ── LoginAttemptLog ───────────────────────────────────────────

class LoginAttemptLog(models.Model):
    """Audit log — every login attempt recorded."""
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