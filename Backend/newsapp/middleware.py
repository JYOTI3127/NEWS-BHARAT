from django.utils import timezone
from .attendance import touch_attendance
from .scheduling import maybe_publish_due_articles

class ActiveUserMiddleware:
    PASSIVE_PATHS = {
        '/api/notifications/status/',
        '/api/admin/online-status/',
        '/api/attendance/status/',
        '/api/attendance/heartbeat/',
        '/api/attendance/disconnect/',
    }

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
                if request.path not in self.PASSIVE_PATHS:
                    touch_attendance(request.user)
                    profile = request.user.profile
                    profile.last_seen = timezone.now()
                    profile.save(update_fields=['last_seen'])
            except Exception:
                pass
        return response
    
class NoIndexMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Sirf .cloud domain pe noindex lagao
        host = request.get_host()
        if 'news4bharat.cloud' in host:
            response['X-Robots-Tag'] = 'noindex, nofollow'
        return response
