from .attendance import get_attendance_snapshot
from .models import Notification, Message

def admin_badges(request):

    if request.user.is_authenticated:

        unread_notifications = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()

        unread_messages = Message.objects.filter(
            receiver=request.user,
            is_read=False
        ).count()

        current_user_online = False
        attendance_snapshot = get_attendance_snapshot(request.user)
        try:
            current_user_online = attendance_snapshot["is_active"] or request.user.profile.is_online()
        except Exception:
            current_user_online = False

        return {
            "unread_notifications": unread_notifications,
            "unread_messages": unread_messages,
            "current_user_online": current_user_online,
            "attendance_snapshot": attendance_snapshot,
        }

    return {}
