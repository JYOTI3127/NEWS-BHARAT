# ── newsapp/documents.py ─────────────────────────────────────────────

from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from .models import Article, Category


@registry.register_document
class ArticleDocument(Document):

    # Related fields
    category = fields.ObjectField(properties={
        'id':   fields.IntegerField(),
        'name': fields.TextField(
            analyzer='hindi_analyzer',
            fields={'keyword': fields.KeywordField()}
        ),
    })

    author = fields.ObjectField(properties={
        'id':       fields.IntegerField(),
        'username': fields.TextField(
            fields={'keyword': fields.KeywordField()}
        ),
    })

    # title aur content — custom analyzers ke saath
    # ⚠️ Django.fields mein mat daalo — yahan define kiye hain
    title = fields.TextField(
        analyzer='hindi_analyzer',
        search_analyzer='hindi_analyzer',
        fields={
            'autocomplete': fields.TextField(
                analyzer='autocomplete_analyzer',
                search_analyzer='standard',
            ),
            'fuzzy':   fields.TextField(analyzer='fuzzy_analyzer'),
            'keyword': fields.KeywordField(),
        }
    )

    content = fields.TextField(
        analyzer='hindi_analyzer',
        search_analyzer='hindi_analyzer',
        fields={
            'fuzzy': fields.TextField(analyzer='fuzzy_analyzer'),
        }
    )

    class Index:
        name     = 'articles'
        settings = {
            'number_of_shards':   1,
            'number_of_replicas': 0,
            'analysis': {
                'analyzer': {
                    'hindi_analyzer': {
                        'type':      'custom',
                        'tokenizer': 'standard',
                        'filter': ['lowercase', 'stop'],
                    },
                    'fuzzy_analyzer': {
                        'type':      'custom',
                        'tokenizer': 'standard',
                        'filter': ['lowercase', 'asciifolding'],
                    },
                    'autocomplete_analyzer': {
                        'type':      'custom',
                        'tokenizer': 'standard',
                        'filter': ['lowercase', 'autocomplete_filter'],
                    },
                },
                'filter': {
                    'autocomplete_filter': {
                        'type':     'edge_ngram',
                        'min_gram': 2,
                        'max_gram': 20,
                    }
                }
            }
        }

    class Django:
        model  = Article
        # ⚠️ title aur content yahan mat daalo — upar define kiye hain
        fields = [
            'id',
            'status',
            'is_paid',
            'created_at',
            'published_at',
        ]
        related_models = [Category]

    def get_queryset(self):
        return super().get_queryset().select_related('author', 'category')

    def get_instances_from_related(self, related_instance):
        if isinstance(related_instance, Category):
            return related_instance.article_set.all()