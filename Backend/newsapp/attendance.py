from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError

from .models import AttendanceRecord

def format_duration(total_seconds):
    total_seconds = max(int(total_seconds or 0), 0)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def _today(now=None):
    return timezone.localdate(now or timezone.now())


def _current_session_seconds(record, now=None):
    now = now or timezone.now()
    if not record.current_session_started_at:
        return 0

    seconds = int((now - record.current_session_started_at).total_seconds())
    return max(seconds, 0)


def is_record_active(record, now=None):
    return bool(record.current_session_started_at)


def get_or_create_attendance_record(user, now=None):
    now = now or timezone.now()
    try:
        return AttendanceRecord.objects.get_or_create(
            user=user,
            date=_today(now),
            defaults={},
        )
    except (ProgrammingError, OperationalError):
        return None, False


def clock_in_attendance(user, now=None):
    if not getattr(user, 'is_authenticated', False):
        return None

    now = now or timezone.now()
    record, _ = get_or_create_attendance_record(user, now)
    if record is None:
        return None

    if record.current_session_started_at:
        return record

    record.current_session_started_at = now
    record.last_clock_in_at = now
    record.last_clock_out_at = None
    record.last_activity_at = now
    record.save(update_fields=['current_session_started_at', 'last_clock_in_at', 'last_clock_out_at', 'last_activity_at', 'updated_at'])
    return record


def touch_attendance(user, now=None):
    if not getattr(user, 'is_authenticated', False):
        return None

    now = now or timezone.now()
    record, _ = get_or_create_attendance_record(user, now)
    if record is None:
        return None

    if not record.current_session_started_at:
        return record

    record.last_activity_at = now
    record.save(update_fields=['last_activity_at', 'updated_at'])
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

    if record.current_session_started_at:
        extra_seconds = _current_session_seconds(record, now)
        if extra_seconds:
            record.total_active_seconds += extra_seconds

    record.last_clock_out_at = now
    record.current_session_started_at = None
    record.last_activity_at = now
    record.save(update_fields=['total_active_seconds', 'current_session_started_at', 'last_clock_out_at', 'last_activity_at', 'updated_at'])
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
            'clock_in_at': None,
            'clock_out_at': None,
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
            'clock_in_at': None,
            'clock_out_at': None,
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
            'clock_in_at': None,
            'clock_out_at': None,
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
        'clock_in_at': record.last_clock_in_at,
        'clock_out_at': record.last_clock_out_at,
        'last_activity_at': record.last_activity_at,
        'date': record.date,
    }
