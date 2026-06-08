from datetime import time as dt_time

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse
from django.utils import timezone
import logging

from .attendance import clock_in_attendance, get_or_create_attendance_record, pause_attendance
from .models import AttendanceRecord


ATTENDANCE_EMAIL_ACTION_SALT = "newsapp.attendance.email-action"

MORNING_FIRST_REMINDER = dt_time(10, 15)
MORNING_SECOND_REMINDER = dt_time(10, 25)
MORNING_REMINDER_CUTOFF = dt_time(10, 30)
EVENING_FIRST_REMINDER = dt_time(18, 15)
EVENING_SECOND_REMINDER = dt_time(18, 30)
AUTO_CLOCK_OUT_TIME = dt_time(20, 0)

User = get_user_model()
logger = logging.getLogger(__name__)


def build_attendance_email_action_token(*, user_id, action, date_value):
    payload = {
        "user_id": int(user_id),
        "action": str(action or "").strip().lower(),
        "date": str(date_value),
    }
    return signing.dumps(payload, salt=ATTENDANCE_EMAIL_ACTION_SALT, compress=True)


def read_attendance_email_action_token(token, *, max_age=60 * 60 * 24):
    return signing.loads(token, salt=ATTENDANCE_EMAIL_ACTION_SALT, max_age=max_age)


def _attendance_site_url():
    return str(
        getattr(settings, "NEWSLETTER_SITE_URL", "")
        or getattr(settings, "SEO_SITE_URL", "")
        or "https://news4bharat.com"
    ).rstrip("/")


def _attendance_email_action_url(*, user_id, action, date_value):
    token = build_attendance_email_action_token(
        user_id=user_id,
        action=action,
        date_value=date_value,
    )
    return f"{_attendance_site_url()}{reverse('attendance_email_action')}?token={token}"


def _send_attendance_email(*, user, action, reminder_label):
    if not user.email:
        return False

    action_label = "Clock In" if action == "clock_in" else "Clock Out"
    subject = f"Attendance Reminder: Please {action_label}"
    action_url = _attendance_email_action_url(
        user_id=user.id,
        action=action,
        date_value=timezone.localdate(),
    )
    greeting_name = (user.get_full_name() or user.username or "Team Member").strip()

    text_body = (
        f"Dear {greeting_name},\n\n"
        f"This is a reminder to {action_label.lower()} for your attendance.\n"
        f"Reminder time: {reminder_label}\n\n"
        f"You can complete this action directly from the link below:\n"
        f"{action_url}\n\n"
        "If you have already completed this action, please ignore this email.\n\n"
        "Regards,\n"
        "News4Bharat HR & Admin"
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
        <div style="padding:24px 28px;background:#10235c;color:#ffffff">
          <div style="font-size:22px;font-weight:700">Attendance Reminder</div>
          <div style="margin-top:6px;font-size:14px;opacity:0.92">News4Bharat HR &amp; Admin</div>
        </div>
        <div style="padding:28px">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7">Dear {greeting_name},</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7">
            This is a reminder to complete your <strong>{action_label}</strong> for today.
          </p>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#4b5563">
            Reminder time: <strong>{reminder_label}</strong>
          </p>
          <div style="margin:24px 0">
            <a href="{action_url}" style="display:inline-block;padding:14px 24px;background:#10235c;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700">
              {action_label} Now
            </a>
          </div>
          <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#6b7280">
            If the button does not work, copy and open this link:
          </p>
          <p style="margin:0 0 18px;font-size:13px;line-height:1.7;word-break:break-all;color:#1d4ed8">{action_url}</p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280">
            If you have already completed this action, please ignore this email.
          </p>
        </div>
      </div>
    </div>
    """

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        to=[user.email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)
    return True


def execute_attendance_email_action(*, user, action, now=None):
    now = now or timezone.now()
    if action == "clock_in":
        return clock_in_attendance(user, now=now)
    if action == "clock_out":
        return pause_attendance(user, now=now)
    raise ValueError("Unsupported attendance action.")


def process_attendance_reminders(*, now=None):
    now = now or timezone.now()
    local_now = timezone.localtime(now)
    today = timezone.localdate(now)
    current_time = local_now.time()

    summary = {
        "clock_in_first_sent": 0,
        "clock_in_second_sent": 0,
        "clock_out_first_sent": 0,
        "clock_out_second_sent": 0,
        "auto_clocked_out": 0,
    }

    staff_users = User.objects.filter(is_active=True, is_staff=True)
    for user in staff_users:
        record, _ = get_or_create_attendance_record(user, now=now)
        if record is None:
            continue

        if (
            current_time >= MORNING_FIRST_REMINDER
            and current_time < MORNING_SECOND_REMINDER
            and not record.last_clock_in_at
            and not record.clock_in_first_reminder_sent_at
        ):
            if _send_attendance_email(user=user, action="clock_in", reminder_label="10:15 AM"):
                record.clock_in_first_reminder_sent_at = now
                record.save(update_fields=["clock_in_first_reminder_sent_at", "updated_at"])
                summary["clock_in_first_sent"] += 1

        if (
            current_time >= MORNING_SECOND_REMINDER
            and current_time < MORNING_REMINDER_CUTOFF
            and not record.last_clock_in_at
            and not record.clock_in_second_reminder_sent_at
        ):
            if _send_attendance_email(user=user, action="clock_in", reminder_label="10:25 AM"):
                record.clock_in_second_reminder_sent_at = now
                record.save(update_fields=["clock_in_second_reminder_sent_at", "updated_at"])
                summary["clock_in_second_sent"] += 1

        if (
            record.last_clock_in_at
            and not record.last_clock_out_at
            and current_time >= EVENING_FIRST_REMINDER
            and current_time < EVENING_SECOND_REMINDER
            and not record.clock_out_first_reminder_sent_at
        ):
            if _send_attendance_email(user=user, action="clock_out", reminder_label="6:15 PM"):
                record.clock_out_first_reminder_sent_at = now
                record.save(update_fields=["clock_out_first_reminder_sent_at", "updated_at"])
                summary["clock_out_first_sent"] += 1

        if (
            record.last_clock_in_at
            and not record.last_clock_out_at
            and current_time >= EVENING_SECOND_REMINDER
            and current_time < AUTO_CLOCK_OUT_TIME
            and not record.clock_out_second_reminder_sent_at
        ):
            if _send_attendance_email(user=user, action="clock_out", reminder_label="6:30 PM"):
                record.clock_out_second_reminder_sent_at = now
                record.save(update_fields=["clock_out_second_reminder_sent_at", "updated_at"])
                summary["clock_out_second_sent"] += 1

        if (
            record.last_clock_in_at
            and not record.last_clock_out_at
            and current_time >= AUTO_CLOCK_OUT_TIME
            and record.date == today
            and not record.auto_clocked_out_at
        ):
            execute_attendance_email_action(user=user, action="clock_out", now=now)
            record.refresh_from_db()
            record.auto_clocked_out_at = now
            record.save(update_fields=["auto_clocked_out_at", "updated_at"])
            summary["auto_clocked_out"] += 1

    return summary


def process_attendance_reminders_cron():
    summary = process_attendance_reminders()
    logger.info(
        "Attendance reminder job completed. "
        "Clock-in reminders: %s first, %s second. "
        "Clock-out reminders: %s first, %s second. "
        "Auto clock-outs: %s.",
        summary["clock_in_first_sent"],
        summary["clock_in_second_sent"],
        summary["clock_out_first_sent"],
        summary["clock_out_second_sent"],
        summary["auto_clocked_out"],
    )
