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

class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class UserProfile(models.Model):

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    roles = models.ManyToManyField(Role, blank=True)

    phone = models.CharField(max_length=15, blank=True)
    bio = models.TextField(blank=True)

    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        blank=True,
        null=True
    )

    assigned_categories = models.ManyToManyField(Category, blank=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('suspended', 'Suspended')
        ],
        default='active'
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username

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
    image = models.URLField(blank=True)

    category = models.ForeignKey('Category', on_delete=models.CASCADE)
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
        if self.assigned_to:
            profile = self.assigned_to.userprofile
            if self.category not in profile.assigned_categories.all():
                raise ValidationError("Reporter not allowed for this category")


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
                allowed = ALLOWED_TRANSITIONS.get(old_article.status, [])
                if self.status not in allowed:
                    raise ValidationError(f"You can't directly move from {old_article.status} to {self.status}")

            # 🔹 Workflow Log Logic (Status Change)
            if old_article.status != self.status:
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

            if self.assigned_to:
                if self.assigned_to.userprofile.status == "suspended":
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
    
class ReporterPerformance(models.Model):
    reporter = models.OneToOneField(User, on_delete=models.CASCADE)

    total_articles = models.IntegerField(default=0)
    published_articles = models.IntegerField(default=0)
    rejected_articles = models.IntegerField(default=0)

    def __str__(self):
        return self.reporter.username
    
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


