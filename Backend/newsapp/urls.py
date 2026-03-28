from django.urls import path
from .views import *
from . import views

urlpatterns = [
    path('categories/', category_list),
    path('articles/', article_list),
    path('articles/<int:pk>/', views.article_detail),
    path('article/<slug:slug>/', views.article_detail_page),
    path('articles/by-state/', views.articles_by_state),
    path('weather/', weather_api),
    path('metal-ticker/', metal_ticker),
    path('update-metal/', update_metal_rates),
    path('market-indices/', market_indices),
    path('datetime/', datetime_api, name='api-datetime'),
    path('search/', search_api, name='api-search'),
    path('search/articles/', live_article_search_api, name='api-live-article-search'),
    path('login/',          views.secure_login_view,  name='login'),
    path('logout/',         views.secure_logout_view, name='logout'),
    path('my-credentials/', views.my_credentials,     name='my_credentials'),

    path('ai/spell-check/',      views.ai_spell_check,       name='ai_spell_check'),
    path('ai/grammar-check/',    views.ai_grammar_check,     name='ai_grammar_check'),   
    path('ai/plagiarism-check/', views.ai_plagiarism_check,  name='ai_plagiarism_check'),
    path('ai/seo-keywords/',     views.ai_seo_keywords,      name='ai_seo_keywords'),

    path('categories/create/',                 category_create,  name='api_category_create'),
    path('categories/<int:cat_id>/update/',    category_update,  name='api_category_update'),
    path('categories/<int:cat_id>/archive/',   category_archive, name='api_category_archive'),
    path('categories/<int:cat_id>/restore/',   category_restore, name='api_category_restore'),
    path('categories/<int:cat_id>/posts/',     category_posts,   name='api_category_posts'),
    path('media/photos/', media_photos_api, name='media_photos_api'),
    path('media/videos/', media_videos_api, name='media_videos_api'),
    path('notifications/<int:id>/read/',      views.mark_notification_read, name='api_notification_read'),
    path('notifications/<int:id>/archive/',   views.archive_notification,   name='api_notification_archive'),
    path('notifications/<int:id>/unarchive/', views.unarchive_notification, name='api_notification_unarchive'),
    path('admin/online-status/', online_status_view, name='online_status'),
    path('live-cricket/', live_cricket),
    path('settings/tag-creation-perm/', views.save_tag_creation_perm, name='save_tag_perm'),
    path('homepage/hero/',        views.update_hero_slot,        name='hp_hero'),
    path('homepage/latest_news/', views.update_latest_news_slot, name='hp_latest'),
    path('homepage/ad_banner/',   views.update_ad_slot,          name='hp_ad'),
    path('admin/media-library/', media_library_view, name='admin_media_library'),
]
