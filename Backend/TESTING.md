# Testing Guide

This project supports both Django's built-in test runner and `pytest`.

## 1. Install dependencies

From the `Backend` folder:

```powershell
python -m pip install -r requirements.txt
```

If you only need the test stack first:

```powershell
python -m pip install Django pytest pytest-django djangorestframework
```

## 2. Run tests with pytest

```powershell
cd Backend
python -m pytest
```

Useful variants:

```powershell
python -m pytest -q
python -m pytest -x
python -m pytest --lf
python -m pytest newsapp/test_leaves_pytest.py
python -m pytest newsapp/test_inbox_pytest.py -k message
```

## 3. Run legacy Django tests

```powershell
cd Backend
python manage.py test
python manage.py test newsapp.tests.LeaveRequestAdminTests
```

## 4. Project test layout

- `newsapp/tests.py`: existing Django `TestCase` suite
- `newsapp/conftest.py`: shared pytest fixtures
- `newsapp/test_leaves_pytest.py`: leave flow pytest coverage
- `newsapp/test_inbox_pytest.py`: inbox/chat pytest coverage
- `newsapp/test_frontend_prerender_pytest.py`: prerender trigger/retry coverage
- `news/test_settings.py`: isolated test settings for pytest

## 5. Important note about the database

Pytest is configured to use:

- SQLite test database
- in-memory email backend
- local memory cache

That setup lives in `news/test_settings.py` so tests do not hit the shared development Postgres database by default.

## 6. Writing new pytest tests

Basic pattern:

```python
import pytest

from newsapp.models import LeaveRequest


pytestmark = pytest.mark.django_db


def test_example(staff_user):
    leave = LeaveRequest.objects.create(
        user=staff_user,
        start_date="2026-06-15",
        end_date="2026-06-15",
        reason="Sample",
    )
    assert leave.total_days == 1
```

Use fixtures from `conftest.py` whenever possible so setup stays short and reusable.

## 7. When to use which test style

- Use `pytest` for new focused tests and fixture-driven setup.
- Keep old `TestCase` tests working until there is a clear reason to migrate them.
- Do not rewrite the whole suite at once.
