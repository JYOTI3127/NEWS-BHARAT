from django.urls import path
from .views import category_list, article_list,weather_api, metal_ticker, update_metal_rates, market_indices

urlpatterns = [
    path('categories/', category_list),
    path('articles/', article_list),
    path("weather/", weather_api),
    path("metal-ticker/", metal_ticker),
    path("update-metal/", update_metal_rates),
    path('market-indices/', market_indices),
    path("weather/", weather_api),
    path("metal-ticker/", metal_ticker),
    path("update-metal/", update_metal_rates),
    path('market-indices/', market_indices),
]
