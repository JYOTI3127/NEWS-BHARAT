from django.urls import path
from .views import category_list, article_list
from .views import weather_api,metal_rates

urlpatterns = [
    path('categories/', category_list),
    path('articles/', article_list),
    path("api/weather/", weather_api),
    path("api/metal-rates/", metal_rates),

]
