from django.contrib import admin
from .models import *


admin.site.register(Permission)
# admin.site.register(RolePermission)

admin.site.register(Category)
admin.site.register(ArticleAssignment)
admin.site.register(ArticleVersion)
admin.site.register(ArticleWorkflowLog)
admin.site.register(FactCheck)


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


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    inlines = [ArticleVersionInline, WorkflowLogInline]



    