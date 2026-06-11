import pytest

from newsapp.models import Conversation, ConversationMember, LeaveRequest


@pytest.fixture
def staff_user(django_user_model):
    return django_user_model.objects.create_user(
        username="staffuser",
        password="testpass123",
        email="staff@example.com",
        is_staff=True,
    )


@pytest.fixture
def superuser(django_user_model):
    return django_user_model.objects.create_user(
        username="adminuser",
        password="testpass123",
        email="admin@example.com",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def second_staff_user(django_user_model):
    return django_user_model.objects.create_user(
        username="secondstaff",
        password="testpass123",
        email="secondstaff@example.com",
        is_staff=True,
    )


@pytest.fixture
def staff_client(client, staff_user):
    client.force_login(staff_user)
    return client


@pytest.fixture
def superuser_client(client, superuser):
    client.force_login(superuser)
    return client


@pytest.fixture
def approved_half_day_leave(staff_user):
    return LeaveRequest.objects.create(
        user=staff_user,
        start_date="2026-06-10",
        end_date="2026-06-10",
        is_half_day=True,
        reason="Personal work",
        status=LeaveRequest.STATUS_APPROVED,
    )


@pytest.fixture
def private_conversation(staff_user, second_staff_user):
    conversation = Conversation.objects.create(conv_type="private")
    ConversationMember.objects.create(conversation=conversation, user=staff_user)
    ConversationMember.objects.create(conversation=conversation, user=second_staff_user)
    return conversation
