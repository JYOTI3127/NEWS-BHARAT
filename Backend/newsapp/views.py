from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import *
from .serializers import CategorySerializer, ArticleSerializer
from .utils import has_permission


@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def article_list(request):
    articles = Article.objects.filter(status='published')
    serializer = ArticleSerializer(articles, many=True)
    return Response(serializer.data)

def update_article_status(request, article):
    if not has_permission(request.user, "publish_article"):
        raise PermissionDenied("You don't have permission to publish.")

    article.status = "published"
    article.save()

