from django.utils import timezone
from .scheduling import maybe_publish_due_articles

class ActiveUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            maybe_publish_due_articles()
        except Exception:
            pass

        response = self.get_response(request)
        if request.user.is_authenticated:
            try:
                profile = request.user.profile
                profile.last_seen = timezone.now()
                profile.save(update_fields=['last_seen'])
            except Exception:
                pass
        return response
