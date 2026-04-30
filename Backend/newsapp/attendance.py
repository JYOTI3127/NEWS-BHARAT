from datetime import timedelta

from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError

from .models import AttendanceRecord


ATTENDANCE_IDLE_SECONDS = 300


def format_duration(total_seconds):
    total_seconds = max(int(total_seconds or 0), 0)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def _today(now=None):
    return timezone.localdate(now or timezone.now())


def _current_session_seconds(record, now=None):
    now = now or timezone.now()
    if not record.current_session_started_at or not record.last_activity_at:
        return 0

    idle_deadline = record.last_activity_at + timedelta(seconds=ATTENDANCE_IDLE_SECONDS)
    session_end = min(now, idle_deadline)
    seconds = int((session_end - record.current_session_started_at).total_seconds())
    return max(seconds, 0)


def is_record_active(record, now=None):
    now = now or timezone.now()
    if not record.current_session_started_at or not record.last_activity_at:
        return False
    return (now - record.last_activity_at).total_seconds() < ATTENDANCE_IDLE_SECONDS


def get_or_create_attendance_record(user, now=None):
    now = now or timezone.now()
    try:
        return AttendanceRecord.objects.get_or_create(
            user=user,
            date=_today(now),
            defaults={
                'current_session_started_at': now,
                'last_activity_at': now,
            },
        )
    except (ProgrammingError, OperationalError):
        return None, False


def touch_attendance(user, now=None):
    if not getattr(user, 'is_authenticated', False):
        return None

    now = now or timezone.now()
    record, created = get_or_create_attendance_record(user, now)
    if record is None:
        return None

    if created:
        return record

    fields_to_update = ['updated_at']
    if record.last_activity_at and record.current_session_started_at:
        gap = max(int((now - record.last_activity_at).total_seconds()), 0)
        if gap > 0:
            record.total_active_seconds += min(gap, ATTENDANCE_IDLE_SECONDS)
            fields_to_update.append('total_active_seconds')

    if not is_record_active(record, now):
        record.current_session_started_at = now
        fields_to_update.append('current_session_started_at')

    record.last_activity_at = now
    fields_to_update.append('last_activity_at')
    record.save(update_fields=list(dict.fromkeys(fields_to_update)))
    return record


def pause_attendance(user, now=None):
    if not getattr(user, 'is_authenticated', False):
        return None

    now = now or timezone.now()
    try:
        record = AttendanceRecord.objects.get(user=user, date=_today(now))
    except AttendanceRecord.DoesNotExist:
        return None
    except (ProgrammingError, OperationalError):
        return None

    if record.current_session_started_at and record.last_activity_at:
        extra_seconds = max(int((now - record.last_activity_at).total_seconds()), 0)
        if extra_seconds:
            record.total_active_seconds += min(extra_seconds, ATTENDANCE_IDLE_SECONDS)

    record.current_session_started_at = None
    record.last_activity_at = now
    record.save(update_fields=['total_active_seconds', 'current_session_started_at', 'last_activity_at', 'updated_at'])
    return record


def get_attendance_snapshot(user, now=None):
    now = now or timezone.now()
    if not getattr(user, 'is_authenticated', False):
        return {
            'is_active': False,
            'total_active_seconds': 0,
            'current_session_seconds': 0,
            'display_seconds': 0,
            'display_duration': format_duration(0),
            'started_at': None,
            'last_activity_at': None,
            'date': _today(now),
        }

    try:
        record = AttendanceRecord.objects.get(user=user, date=_today(now))
    except AttendanceRecord.DoesNotExist:
        return {
            'is_active': False,
            'total_active_seconds': 0,
            'current_session_seconds': 0,
            'display_seconds': 0,
            'display_duration': format_duration(0),
            'started_at': None,
            'last_activity_at': None,
            'date': _today(now),
        }
    except (ProgrammingError, OperationalError):
        return {
            'is_active': False,
            'total_active_seconds': 0,
            'current_session_seconds': 0,
            'display_seconds': 0,
            'display_duration': format_duration(0),
            'started_at': None,
            'last_activity_at': None,
            'date': _today(now),
        }

    current_session_seconds = _current_session_seconds(record, now) if is_record_active(record, now) else 0
    total_seconds = record.total_active_seconds + current_session_seconds
    return {
        'is_active': is_record_active(record, now),
        'total_active_seconds': record.total_active_seconds,
        'current_session_seconds': current_session_seconds,
        'display_seconds': total_seconds,
        'display_duration': format_duration(total_seconds),
        'started_at': record.current_session_started_at,
        'last_activity_at': record.last_activity_at,
        'date': record.date,
    }
