import pytest
from django.urls import reverse

from newsapp.models import Message, Notification


pytestmark = pytest.mark.django_db


def test_inbox_page_loads_for_staff_user(staff_client):
    response = staff_client.get(reverse("admin_inbox"))

    assert response.status_code == 200
    assert b"Inbox" in response.content


def test_start_conversation_creates_private_conversation(staff_client, second_staff_user):
    response = staff_client.get(reverse("start_conversation", args=[second_staff_user.pk]))

    assert response.status_code == 302
    assert "conv=" in response.url


def test_send_message_creates_message_and_notification(staff_client, private_conversation, second_staff_user):
    response = staff_client.post(
        reverse("send_message"),
        {
            "conversation_id": str(private_conversation.pk),
            "text": "Hello from pytest",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert Message.objects.filter(conversation=private_conversation, text="Hello from pytest").exists()
    assert Notification.objects.filter(user=second_staff_user, notif_type="message").exists()


def test_send_message_requires_conversation_membership(client, second_staff_user, superuser):
    client.force_login(superuser)

    response = client.post(
        reverse("send_message"),
        {
            "conversation_id": "999999",
            "text": "Should fail",
        },
    )

    assert response.status_code == 404
