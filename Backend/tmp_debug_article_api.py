import os
import django
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'news.settings')
django.setup()
from newsapp.views import article_list

factory = APIRequestFactory()
request = factory.get('/api/articles/')
request.user = AnonymousUser()

try:
    response = article_list(request)
    print('STATUS', getattr(response, 'status_code', None))
    print('TYPE', type(response))
    print('DATA', getattr(response, 'data', response))
except Exception as exc:
    import traceback
    traceback.print_exc()
