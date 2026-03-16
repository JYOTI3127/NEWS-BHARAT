from django.urls import path
from .views import *
from . import views

urlpatterns = [
    path('categories/', category_list),
    path('articles/', article_list),
    path('articles/<int:pk>/', views.article_detail),
    path('weather/', weather_api),
    path('metal-ticker/', metal_ticker),
    path('update-metal/', update_metal_rates),
    path('market-indices/', market_indices),
    path('datetime/', datetime_api, name='api-datetime'),
    path('search/', search_api, name='api-search'),
    path('login/',          views.secure_login_view,  name='login'),
    path('logout/',         views.secure_logout_view, name='logout'),
    path('my-credentials/', views.my_credentials,     name='my_credentials'),
    path('ai/spell-check/', ai_spell_check),
    path('ai/seo-keywords/',ai_seo_keywords),
    path('categories/create/',                 category_create,  name='api_category_create'),
    path('categories/<int:cat_id>/update/',    category_update,  name='api_category_update'),
    path('categories/<int:cat_id>/archive/',   category_archive, name='api_category_archive'),
    path('categories/<int:cat_id>/restore/',   category_restore, name='api_category_restore'),
    path('categories/<int:cat_id>/posts/',     category_posts,   name='api_category_posts'),
    path('media/photos/', media_photos_api, name='media_photos_api'),
    path('media/videos/', media_videos_api, name='media_videos_api'),
    path('notifications/<int:id>/read/',     views.mark_notification_read, name='api_notification_read'),
    path('notifications/<int:id>/archive/',  views.archive_notification,   name='api_notification_archive'),
    path('notifications/<int:id>/unarchive/',views.unarchive_notification, name='api_notification_unarchive'),
    path('admin/online-status/', online_status_view, name='online_status'),
    path('live-cricket/', live_cricket),
]