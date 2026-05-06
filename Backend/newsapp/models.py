from django.db import models, transaction
from django.contrib.auth.models import User
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from .workflow import ALLOWED_TRANSITIONS
from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions
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
    meta_title       = models.TextField(blank=True, default='')
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
    updated_at   = models.DateTimeField(auto_now=True)
 
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='articles_assigned_to'
    )
    deadline = models.DateTimeField(null=True, blank=True)
 
    def clean(self):
        meta_title_length = len((self.meta_title or '').strip())
        if meta_title_length > 70:
            raise ValidationError({'meta_title': 'Meta title can have at most 70 characters.'})
        if self.assigned_to and self.pk:
            profile = self.assigned_to.profile
            for cat in self.categories.all():
                if not profile.assigned_categories.filter(id=cat.id).exists():
                    pass  # raise ValidationError if needed
 

    def save(self, *args, **kwargs):
        is_update = self.pk is not None
        update_fields = kwargs.get('update_fields')
        should_ping_sitemap = False
        push_payload = None
        if update_fields:
            update_fields = set(update_fields)
            if 'updated_at' not in update_fields:
                self.updated_at = timezone.now()
                update_fields.add('updated_at')
                kwargs['update_fields'] = update_fields
    
        # ✅ SLUG AUTO GENERATE
        if not self.slug:
            self.slug = slugify(self.title) + "-" + str(uuid.uuid4())[:5]
    
        if is_update:
            old_article = Article.objects.get(pk=self.pk)
            pushworthy_update = any(
                getattr(old_article, field.attname) != getattr(self, field.attname)
                for field in self._meta.concrete_fields
                if field.attname not in {
                    'id',
                    'created_at',
                    'updated_at',
                }
            )
     
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
                    if update_fields is not None:
                        update_fields.add('published_at')
                        kwargs['update_fields'] = update_fields

                    should_ping_sitemap = True
                    push_payload = {
                        "title": self.title[:60],
                        "body": self.meta_description[:100] if self.meta_description else "News4Bharat pe padhein taaza khabar!",
                        "url": f"https://news4bharat.com/{self.slug}/",
                    }

            elif old_article.status == "published" and self.status == "published" and pushworthy_update:
                from newsapp.seo_direct import article_url
                push_payload = {
                    "title": f"Updated: {self.title[:51]}" if len(self.title) > 51 else f"Updated: {self.title}",
                    "body": self.meta_description[:100] if self.meta_description else "Article update ho gaya hai. Latest version padhein.",
                    "url": article_url(self, "https://news4bharat.com"),
                }
     
            if self.assigned_to and self.status != 'draft':
                if self.assigned_to.profile.status == "suspended":
                    raise ValidationError("This reporter is suspended.")
    
        else:
            # ✅ NEW OBJECT CASE
            if self.status == "published" and not self.published_at:
                self.published_at = timezone.now()
                if update_fields is not None:
                    update_fields.add('published_at')
                    kwargs['update_fields'] = update_fields

                should_ping_sitemap = True
                push_payload = {
                    "title": self.title[:60],
                    "body": self.meta_description[:100] if self.meta_description else "News4Bharat pe padhein taaza khabar!",
                    "url": f"https://news4bharat.com/{self.slug}/",
                }
    
        self.full_clean()
        super().save(*args, **kwargs)

        if should_ping_sitemap:
            from newsapp.signals import ping_google_sitemap
            transaction.on_commit(ping_google_sitemap)

        if push_payload:
            def _send_article_push(payload=push_payload):
                try:
                    from newsapp.views import send_push_to_all
                    send_push_to_all(**payload)
                except Exception as e:
                    print(f"Push notification error: {e}")

            transaction.on_commit(_send_article_push)
     
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
    overlay_article_4 = models.ForeignKey(
        'Article',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homepage_overlay_slot_4'
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
    manual_order = models.JSONField(default=list, blank=True)

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


class HomepageAdBanner(models.Model):
    PAGE_HOME = 'home'
    PAGE_ARTICLE_DETAIL = 'article_detail'
    PAGE_CATEGORY = 'category'
    PAGE_SEARCH = 'search'
    PAGE_ABOUT = 'about'
    PAGE_CONTACT = 'contact'
    PAGE_PRIVACY = 'privacy'
    PAGE_TERMS = 'terms'

    HOME_TOP = 'home_top'
    HOME_TOP_MOBILE = 'home_top_mobile'
    HOME_BHARAT_NUMBERS_RIGHT = 'home_bharat_numbers_right'
    HOME_BHARAT_STARTUPS_RIGHT = 'home_bharat_startups_right'
    HOME_SIDE_LEFT = 'home_side_left'
    HOME_SIDE_RIGHT = 'home_side_right'

    PAGE_CHOICES = [
        (PAGE_HOME, 'Homepage'),
        (PAGE_ARTICLE_DETAIL, 'Article Detail Pages'),
        (PAGE_CATEGORY, 'Category Pages'),
        (PAGE_SEARCH, 'Search Page'),
        (PAGE_ABOUT, 'About Page'),
        (PAGE_CONTACT, 'Contact Page'),
        (PAGE_PRIVACY, 'Privacy Policy Page'),
        (PAGE_TERMS, 'Terms Page'),
    ]
    DEFAULT_TARGET_PAGES = [PAGE_HOME]

    PLACEMENT_CHOICES = [
        (HOME_TOP, 'Home Top'),
        (HOME_TOP_MOBILE, 'Home Top Mobile'),
        (HOME_BHARAT_NUMBERS_RIGHT, 'Home Bharat in Numbers Right'),
        (HOME_BHARAT_STARTUPS_RIGHT, 'Home Bharat of Startups Right'),
        (HOME_SIDE_LEFT, 'Home Side Left'),
        (HOME_SIDE_RIGHT, 'Home Side Right'),
    ]

    PLACEMENT_DIMENSIONS = {
        HOME_TOP: (728, 90),
        HOME_TOP_MOBILE: (300, 50),
        HOME_BHARAT_NUMBERS_RIGHT: (300, 250),
        HOME_BHARAT_STARTUPS_RIGHT: (300, 250),
        HOME_SIDE_LEFT: (160, 600),
        HOME_SIDE_RIGHT: (160, 600),
    }

    PLACEMENT_BREAKPOINTS = {
        HOME_TOP: '769px+',
        HOME_TOP_MOBILE: '0px-768px',
        HOME_BHARAT_NUMBERS_RIGHT: 'all screens',
        HOME_BHARAT_STARTUPS_RIGHT: 'all screens',
        HOME_SIDE_LEFT: '769px+',
        HOME_SIDE_RIGHT: '769px+',
    }

    placement = models.CharField(max_length=40, choices=PLACEMENT_CHOICES, unique=True)
    image = models.ImageField(upload_to='homepage_ads/', blank=True, null=True)
    image_url = models.URLField(blank=True, default='')
    link_url = models.URLField(blank=True, default='')
    alt = models.CharField(max_length=255, blank=True, default='Sponsored advertisement')
    target_pages = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['placement']
        verbose_name = 'Homepage Ad Banner'
        verbose_name_plural = 'Homepage Ad Banners'

    @property
    def width(self):
        return self.PLACEMENT_DIMENSIONS.get(self.placement, (0, 0))[0]

    @property
    def height(self):
        return self.PLACEMENT_DIMENSIONS.get(self.placement, (0, 0))[1]

    @property
    def size(self):
        return f'{self.width}x{self.height}'

    @property
    def breakpoint(self):
        return self.PLACEMENT_BREAKPOINTS.get(self.placement, '')

    def clean(self):
        super().clean()
        allowed_pages = {page for page, _label in self.PAGE_CHOICES}
        pages = self.target_pages if isinstance(self.target_pages, list) else []
        self.target_pages = [
            page for page in dict.fromkeys(str(page).strip() for page in pages)
            if page in allowed_pages
        ]
        if self.image and self.placement in self.PLACEMENT_DIMENSIONS:
            expected_width, expected_height = self.PLACEMENT_DIMENSIONS[self.placement]
            image_width, image_height = get_image_dimensions(self.image)
            if image_width != expected_width or image_height != expected_height:
                raise ValidationError(
                    f'{self.placement} banner must be exactly {expected_width}x{expected_height}px.'
                )

    def __str__(self):
        return f'Homepage ad {self.placement} ({self.size})'

    @property
    def target_page_labels(self):
        labels = dict(self.PAGE_CHOICES)
        pages = self.target_pages if isinstance(self.target_pages, list) else []
        return ', '.join(labels.get(page, page) for page in pages) or 'No pages'


class SavedAdBanner(models.Model):
    name = models.CharField(max_length=120)
    bundle_key = models.CharField(max_length=40, blank=True, default='')
    bundle_name = models.CharField(max_length=120, blank=True, default='')
    placement = models.CharField(max_length=40, choices=HomepageAdBanner.PLACEMENT_CHOICES)
    image = models.ImageField(upload_to='saved_homepage_ads/', blank=True, null=True)
    image_url = models.URLField(blank=True, default='')
    link_url = models.URLField(blank=True, default='')
    alt = models.CharField(max_length=255, blank=True, default='Sponsored advertisement')
    target_pages = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-created_at']
        verbose_name = 'Saved Ad Banner'
        verbose_name_plural = 'Saved Ad Banners'

    @property
    def width(self):
        return HomepageAdBanner.PLACEMENT_DIMENSIONS.get(self.placement, (0, 0))[0]

    @property
    def height(self):
        return HomepageAdBanner.PLACEMENT_DIMENSIONS.get(self.placement, (0, 0))[1]

    @property
    def size(self):
        return f'{self.width}x{self.height}'

    @property
    def breakpoint(self):
        return HomepageAdBanner.PLACEMENT_BREAKPOINTS.get(self.placement, '')

    def clean(self):
        super().clean()
        allowed_pages = {page for page, _label in HomepageAdBanner.PAGE_CHOICES}
        pages = self.target_pages if isinstance(self.target_pages, list) else []
        self.target_pages = [
            page for page in dict.fromkeys(str(page).strip() for page in pages)
            if page in allowed_pages
        ]
        if self.image and self.placement in HomepageAdBanner.PLACEMENT_DIMENSIONS:
            expected_width, expected_height = HomepageAdBanner.PLACEMENT_DIMENSIONS[self.placement]
            image_width, image_height = get_image_dimensions(self.image)
            if image_width != expected_width or image_height != expected_height:
                raise ValidationError(
                    f'{self.placement} banner must be exactly {expected_width}x{expected_height}px.'
                )

    def __str__(self):
        return f'{self.name} ({self.size})'
    

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


class ContactQuery(models.Model):
    STATUS_CHOICES = [
        ("new", "New"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("spam", "Spam"),
    ]

    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone_number = models.CharField(max_length=30)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Contact Query"
        verbose_name_plural = "Contact Queries"

    def __str__(self):
        return f"{self.full_name} - {self.subject}"

    @property
    def initials(self):
        parts = (self.full_name or "").split()
        if len(parts) > 1:
            return (parts[0][0] + parts[1][0]).upper()
        return parts[0][:2].upper() if parts else ""


class CareerApplication(models.Model):
    JOB_TYPE_CHOICES = [
        ("full_time", "Full-Time"),
        ("part_time", "Part-Time"),
    ]
    STATUS_CHOICES = [
        ("new", "New"),
        ("reviewing", "Reviewing"),
        ("shortlisted", "Shortlisted"),
        ("rejected", "Rejected"),
        ("hired", "Hired"),
    ]

    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone_number = models.CharField(max_length=30, blank=True)
    portfolio_url = models.URLField(blank=True)
    job_title = models.CharField(max_length=150)
    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES)
    resume = models.FileField(upload_to="career_applications/resumes/")
    cover_note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Career Application"
        verbose_name_plural = "Career Applications"

    def __str__(self):
        return f"{self.full_name} - {self.job_title}"

    @property
    def initials(self):
        parts = (self.full_name or "").split()
        if len(parts) > 1:
            return (parts[0][0] + parts[1][0]).upper()
        return parts[0][:2].upper() if parts else ""

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


class AttendanceRecord(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='attendance_records',
    )
    date = models.DateField()
    total_active_seconds = models.PositiveIntegerField(default=0)
    current_session_started_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'user__username']
        unique_together = ('user', 'date')
        verbose_name = "Attendance"
        verbose_name_plural = "Attendance"

    def __str__(self):
        return f"{self.user.username} | {self.date}"


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
    image = models.URLField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    link = models.URLField(blank=True, default='')
    subject = models.CharField(max_length=300, blank=True, default='')
    html_content = models.TextField(blank=True, default='')
    chosen_articles = models.JSONField(default=dict, blank=True)
    draft_data = models.JSONField(default=dict, blank=True)
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


class JobOpening(models.Model):
    EMPLOYMENT_TYPE_CHOICES = [
        ('full_time', 'Full-Time'),
        ('part_time', 'Part-Time'),
        ('contract', 'Contract'),
        ('internship', 'Internship'),
        ('freelance', 'Freelance'),
    ]

    title = models.CharField(max_length=180)
    team = models.CharField(max_length=180, blank=True, default='')
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default='full_time')
    location = models.CharField(max_length=180, blank=True, default='')
    short_description = models.TextField()
    skills = models.CharField(max_length=500, blank=True, default='')
    icon_key = models.CharField(max_length=50, blank=True, default='briefcase')
    apply_url = models.URLField(blank=True, default='')
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'title']
        verbose_name = 'Job Opening'
        verbose_name_plural = 'Job Openings'

    def __str__(self):
        return f"{self.title} ({self.team})" if self.team else self.title


class FrontendBuildBatch(models.Model):
    batch_key = models.CharField(max_length=50, unique=True, default='default')
    pending_publish_count = models.PositiveIntegerField(default=0)
    pending_article_ids = models.JSONField(default=list, blank=True)
    first_pending_at = models.DateTimeField(null=True, blank=True)
    last_queued_at = models.DateTimeField(null=True, blank=True)
    last_triggered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Frontend Build Batch'
        verbose_name_plural = 'Frontend Build Batches'

    def __str__(self):
        return f"{self.batch_key} ({self.pending_publish_count} pending)"

class PushSubscription(models.Model):
    """Website visitors ke browser push notification subscriptions"""
    endpoint = models.TextField(unique=True)
    p256dh   = models.TextField()
    auth     = models.TextField()
    subscriber_name = models.CharField(max_length=255, blank=True, default='')
    subscriber_email = models.EmailField(blank=True, default='')
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active  = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Push Subscription'
        verbose_name_plural = 'Push Subscriptions'

    def __str__(self):
        return f"Subscription {self.id} - {self.endpoint[:50]}"


class PushNotificationLog(models.Model):
    STATUS_SENT = 'sent'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_SENT, 'Sent'),
        (STATUS_FAILED, 'Failed'),
    ]

    subscription = models.ForeignKey(
        PushSubscription,
        on_delete=models.CASCADE,
        related_name='notification_logs',
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True, default='')
    target_url = models.CharField(max_length=500, blank=True, default='')
    icon = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Push Notification Log'
        verbose_name_plural = 'Push Notification Logs'

    def __str__(self):
        return f"{self.subscription_id} - {self.status} - {self.sent_at:%d %b %Y %H:%M}"
