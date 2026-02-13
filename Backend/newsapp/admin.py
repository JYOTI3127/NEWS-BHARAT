from django.contrib import admin
from .models import (
    Role,
    Permission,
    RolePermission,
    UserProfile,
    Category,
    Article
)

admin.site.register(Role)
admin.site.register(Permission)
admin.site.register(RolePermission)
admin.site.register(UserProfile)
admin.site.register(Category)
admin.site.register(Article)

from django.contrib import admin

admin.site.site_header = "News Bharat Admin Panel"
admin.site.site_title = "News Bharat Admin"
admin.site.index_title = "Welcome to News Bharat Dashboard"

