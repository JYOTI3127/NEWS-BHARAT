from django.apps import AppConfig


class NewsappConfig(AppConfig):
    name = 'newsapp'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        import newsapp.signals

    
