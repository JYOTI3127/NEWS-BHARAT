from django.urls import path
from .views import category_list, article_list

urlpatterns = [
    path('categories/', category_list),
    path('articles/', article_list),

]
