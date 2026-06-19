from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse
from django.utils.html import escape
from django.utils import timezone

from .models import LeaveRequest


LEAVE_REQUEST_ACTION_SALT = "leave-request-email-action"
LEAVE_REQUEST_ACTION_MAX_AGE = 60 * 60 * 24 * 14


def build_leave_request_action_token(leave_request, action):
    return signing.dumps(
        {
            "leave_request_id": int(leave_request.pk),
            "action": str(action or "").strip().lower(),
        },
        salt=LEAVE_REQUEST_ACTION_SALT,
    )


def read_leave_request_action_token(token, expected_action=None):
    payload = signing.loads(
        token,
        salt=LEAVE_REQUEST_ACTION_SALT,
        max_age=LEAVE_REQUEST_ACTION_MAX_AGE,
    )
    action = str(payload.get("action") or "").strip().lower()
    if action not in {LeaveRequest.STATUS_APPROVED, LeaveRequest.STATUS_REJECTED}:
        raise signing.BadSignature("Invalid leave action")
    if expected_action and action != str(expected_action).strip().lower():
        raise signing.BadSignature("Leave action mismatch")
    return payload

def execute_leave_request_action(token, action, reviewer=None):
    payload = read_leave_request_action_token(token, expected_action=action)
    leave_request = LeaveRequest.objects.select_related("user", "reviewed_by").get(
        pk=payload["leave_request_id"]
    )
    if leave_request.status != LeaveRequest.STATUS_PENDING:
        return leave_request
    leave_request.status = action
    leave_request.reviewed_at = timezone.now()
    if reviewer is not None and getattr(reviewer, "is_superuser", False):
        leave_request.reviewed_by = reviewer
    leave_request.save(update_fields=["status", "reviewed_at", "reviewed_by", "updated_at"])
    return leave_request

def send_leave_request_submission_email(leave_request, request):
    User = get_user_model()
    recipients = list(
        User.objects.filter(is_active=True, is_superuser=True)
        .exclude(email="")
        .values_list("email", flat=True)
    )
    if not recipients:
        return 0

    employee_name = leave_request.user.get_full_name() or leave_request.user.username
    employee_name_html = escape(employee_name)
    reason_html = escape(leave_request.reason)
    approve_token = build_leave_request_action_token(leave_request, LeaveRequest.STATUS_APPROVED)
    reject_token = build_leave_request_action_token(leave_request, LeaveRequest.STATUS_REJECTED)
    approve_url = request.build_absolute_uri(reverse("leave_request_email_action"))
    reject_url = request.build_absolute_uri(reverse("leave_request_email_action"))
    approve_url = f"{approve_url}?{urlencode({'token': approve_token, 'action': LeaveRequest.STATUS_APPROVED})}"
    reject_url = f"{reject_url}?{urlencode({'token': reject_token, 'action': LeaveRequest.STATUS_REJECTED})}"
    dashboard_url = request.build_absolute_uri(reverse("newsadmin:leaves"))

    date_range = (
        leave_request.start_date.strftime("%d %b %Y")
        if leave_request.start_date == leave_request.end_date
        else f"{leave_request.start_date.strftime('%d %b %Y')} to {leave_request.end_date.strftime('%d %b %Y')}"
    )
    subject = f"Leave request: {employee_name}"
    text_body = (
        f"{employee_name} submitted a leave request.\n\n"
        f"Dates: {date_range}\n"
        f"Days: {leave_request.total_days}\n"
        f"Reason: {leave_request.reason}\n\n"
        f"Approve: {approve_url}\n"
        f"Reject: {reject_url}\n\n"
        f"Dashboard: {dashboard_url}\n"
    )
    html_body = (
        "<div style=\"font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#1f2937;\">"
        "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe3f0;border-radius:18px;overflow:hidden;\">"
        "<div style=\"background:linear-gradient(135deg,#17337a,#1d4ed8);padding:22px 24px;color:#ffffff;\">"
        "<div style=\"font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;\">News4Bharat Team Ops</div>"
        f"<h1 style=\"margin:10px 0 0;font-size:24px;line-height:1.3;\">Leave Request Pending</h1>"
        "</div>"
        "<div style=\"padding:24px;\">"
        f"<p style=\"margin:0 0 16px;font-size:15px;line-height:1.7;\"><strong>{employee_name_html}</strong> submitted a leave request.</p>"
        "<div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:18px;\">"
        f"<p style=\"margin:0 0 10px;\"><strong>Dates</strong><br>{date_range}</p>"
        f"<p style=\"margin:0 0 10px;\"><strong>Total days</strong><br>{leave_request.total_days}</p>"
        f"<p style=\"margin:0;\"><strong>Reason</strong><br>{reason_html}</p>"
        "</div>"
        "<div style=\"display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;\">"
        f"<a href=\"{approve_url}\" style=\"display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;\">Approve</a>"
        f"<a href=\"{reject_url}\" style=\"display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;\">Reject</a>"
        "</div>"
        f"<a href=\"{dashboard_url}\" style=\"display:inline-block;color:#1d4ed8;text-decoration:none;font-weight:700;\">Open dashboard</a>"
        "</div></div></div>"
    )

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "") or None,
        to=recipients,
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=True)
    return len(recipients)
