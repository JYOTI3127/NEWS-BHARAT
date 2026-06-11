import pytest
from django.core.exceptions import ValidationError
from django.urls import reverse

from newsapp.models import LeaveRequest


pytestmark = pytest.mark.django_db


def test_half_day_leave_counts_as_half_day(approved_half_day_leave):
    assert approved_half_day_leave.total_days == 0.5


def test_half_day_leave_rejects_multi_day_range(staff_user):
    leave_request = LeaveRequest(
        user=staff_user,
        start_date="2026-06-10",
        end_date="2026-06-11",
        is_half_day=True,
        reason="Invalid half day",
    )

    with pytest.raises(ValidationError):
        leave_request.full_clean()


def test_leaves_page_loads_for_staff_user(staff_client):
    response = staff_client.get(reverse("newsadmin:leaves"))

    assert response.status_code == 200
    assert b"Leave Requests" in response.content


def test_superuser_can_add_approved_half_day_leave(superuser_client, staff_user):
    response = superuser_client.post(
        reverse("newsadmin:leaves"),
        {
            "leave_action": "submit_leave",
            "leave_user_id": str(staff_user.pk),
            "start_date": "2026-06-10",
            "end_date": "2026-06-10",
            "reason": "Half day errand",
            "is_half_day": "1",
            "direct_approve": "1",
        },
    )

    assert response.status_code == 302
    leave_request = LeaveRequest.objects.get(user=staff_user, reason="Half day errand")
    assert leave_request.is_half_day is True
    assert leave_request.total_days == 0.5
    assert leave_request.status == LeaveRequest.STATUS_APPROVED


def test_staff_submission_creates_pending_leave_and_redirects(staff_client, staff_user):
    response = staff_client.post(
        reverse("newsadmin:leaves"),
        {
            "leave_action": "submit_leave",
            "start_date": "2026-06-12",
            "end_date": "2026-06-12",
            "reason": "Doctor visit",
        },
    )

    assert response.status_code == 302
    leave_request = LeaveRequest.objects.get(user=staff_user, reason="Doctor visit")
    assert leave_request.status == LeaveRequest.STATUS_PENDING
    assert leave_request.is_half_day is False
