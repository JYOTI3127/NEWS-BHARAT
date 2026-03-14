from django.contrib import admin
from django.http import HttpResponse
from django.shortcuts import redirect
from django.urls import path, include
from newsapp import views
from newsapp.admin import admin_site
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', lambda request: redirect('admin/'), name='home'),

    # ── Inbox & Notifications — admin/ se PEHLE ──────────────
    path('admin/inbox/',                          views.inbox_view,         name='admin_inbox'),
    path('admin/inbox/new/',                      views.new_chat,           name='new_chat'),
    path('admin/inbox/start/<int:user_id>/',      views.start_conversation, name='start_conversation'),
    path('admin/inbox/send/',                     views.send_message,       name='send_message'),
    path('admin/inbox/create-group/',             views.create_group,       name='create_group'),
    path('admin/notifications/',                  views.notifications_view, name='admin_notifications'),

    # ── Django Admin — BAAD MEIN ─────────────────────────────
    path('admin/', admin_site.urls),

    # ── REST API ─────────────────────────────────────────────
    path('api/', include('newsapp.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)