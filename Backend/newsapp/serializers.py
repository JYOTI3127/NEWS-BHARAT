from rest_framework import serializers
from .models import *
from django.contrib.auth.models import User


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email']
 
 
class CategorySerializer(serializers.ModelSerializer):
    article_count  = serializers.SerializerMethodField()
    sub_categories = serializers.SerializerMethodField()  # ReadOnlyField ki jagah yeh

    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'description', 'status', 'sub_categories', 'article_count']

    def get_article_count(self, obj):
        return obj.articles.filter(status='published').count()

    def get_sub_categories(self, obj):
        subs = obj.sub_categories
        # Agar DB mein purana list format pada hai — dict mein convert karo
        if isinstance(subs, list):
            return {'default': subs} if subs else {}
        if isinstance(subs, dict):
            return subs
        return {}
 
 
class ArticleSerializer(serializers.ModelSerializer):
 
    # ── Categories (ManyToMany) ──
    categories = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        required=False
    )
    category_details = serializers.SerializerMethodField()
 
    # ── Audit trail — read only ──
    author             = UserSerializer(read_only=True)
    posted_by_username = serializers.SerializerMethodField()
    posted_by_fullname = serializers.SerializerMethodField()

    # FIX 2: author_display_name as the primary "author name" for frontend
    # Frontend should use display_author_name — falls back to username if blank
    display_author_name = serializers.SerializerMethodField()
 
    # ── Image ──
    image_url = serializers.SerializerMethodField()

    # FIX 1: image_alt and image_source explicitly exposed (they were missing from
    # read_only_fields and not guaranteed to be included via __all__ + read_only combo)
    image_alt    = serializers.CharField(required=False, allow_blank=True, default='')
    image_source = serializers.CharField(required=False, allow_blank=True, default='')

    # FIX 4: tags exposed as a Python list for easy frontend consumption
    tags_list = serializers.SerializerMethodField()

    # secondary_keywords exposed as list too
    secondary_keywords_list = serializers.SerializerMethodField()
 
    # ── Frontend se aane wale editor_ fields (write-only) ──
    editor_name      = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_position  = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_bio       = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_photo     = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_twitter   = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_linkedin  = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_instagram = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_facebook  = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    editor_articles  = serializers.IntegerField(write_only=True, required=False, default=0)
 
    class Meta:
        model  = Article
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'published_at', 'author',
            'posted_by_username', 'posted_by_fullname',
            'display_author_name',
            'author_display_name', 'author_display_position',
            'author_display_bio', 'author_display_photo',
            'author_display_twitter', 'author_display_linkedin',
            'author_display_instagram', 'author_display_facebook',
            'author_display_articles_count',
            'tags_list', 'secondary_keywords_list',
        ]
 
    def get_category_details(self, obj):
        return CategorySerializer(obj.categories.all(), many=True).data
 
    def get_posted_by_username(self, obj):
        return obj.author.username if obj.author else None
 
    def get_posted_by_fullname(self, obj):
        return obj.author.get_full_name() if obj.author else None

    # FIX 2: Returns author_display_name if set, otherwise falls back to actual user's
    # full name, then username. Frontend should use this field — never show raw author.username
    def get_display_author_name(self, obj):
        if obj.author_display_name and obj.author_display_name.strip():
            return obj.author_display_name.strip()
        if obj.author:
            full = obj.author.get_full_name()
            return full if full.strip() else obj.author.username
        return ''
 
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            try:
                base  = request.build_absolute_uri(obj.image.url) if request else obj.image.url
                mtime = obj.image.storage.get_modified_time(obj.image.name)
                return f"{base}?v={int(mtime.timestamp())}"
            except Exception:
                return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return obj.image_url

    # FIX 4: tags stored as comma-separated string in DB, returned as list to frontend
    def get_tags_list(self, obj):
        if not obj.tags:
            return []
        return [t.strip() for t in obj.tags.split(',') if t.strip()]

    # secondary_keywords as list
    def get_secondary_keywords_list(self, obj):
        if not obj.secondary_keywords:
            return []
        return [k.strip() for k in obj.secondary_keywords.split(',') if k.strip()]
 
    def create(self, validated_data):
        # editor_ fields nikalo aur author_display_* mein daalo
        display_name      = validated_data.pop('editor_name', '')
        display_position  = validated_data.pop('editor_position', '')
        display_bio       = validated_data.pop('editor_bio', '')
        display_photo     = validated_data.pop('editor_photo', '')
        display_twitter   = validated_data.pop('editor_twitter', '')
        display_linkedin  = validated_data.pop('editor_linkedin', '')
        display_instagram = validated_data.pop('editor_instagram', '')
        display_facebook  = validated_data.pop('editor_facebook', '')
        display_articles  = validated_data.pop('editor_articles', 0)
 
        # ManyToMany alag handle hoti hai
        categories = validated_data.pop('categories', [])
 
        request = self.context.get('request')
 
        article = Article.objects.create(
            # audit trail — logged-in user database mein save hoga
            author=request.user if request else None,
 
            # display fields — frontend pe dikhne wale
            author_display_name=display_name,
            author_display_position=display_position,
            author_display_bio=display_bio,
            author_display_photo=display_photo,
            author_display_twitter=display_twitter,
            author_display_linkedin=display_linkedin,
            author_display_instagram=display_instagram,
            author_display_facebook=display_facebook,
            author_display_articles_count=display_articles,
 
            **validated_data
        )
 
        # ManyToMany set karo
        if categories:
            article.categories.set(categories)
 
        return article
 
    def update(self, instance, validated_data):
        # editor_ fields nikalo
        display_name      = validated_data.pop('editor_name',      instance.author_display_name)
        display_position  = validated_data.pop('editor_position',  instance.author_display_position)
        display_bio       = validated_data.pop('editor_bio',       instance.author_display_bio)
        display_photo     = validated_data.pop('editor_photo',     instance.author_display_photo)
        display_twitter   = validated_data.pop('editor_twitter',   instance.author_display_twitter)
        display_linkedin  = validated_data.pop('editor_linkedin',  instance.author_display_linkedin)
        display_instagram = validated_data.pop('editor_instagram', instance.author_display_instagram)
        display_facebook  = validated_data.pop('editor_facebook',  instance.author_display_facebook)
        display_articles  = validated_data.pop('editor_articles',  instance.author_display_articles_count)
 
        # ManyToMany alag handle
        categories = validated_data.pop('categories', None)
 
        # author kabhi update nahi hoga
        validated_data.pop('author', None)
 
        # display fields update karo
        instance.author_display_name           = display_name
        instance.author_display_position       = display_position
        instance.author_display_bio            = display_bio
        instance.author_display_photo          = display_photo
        instance.author_display_twitter        = display_twitter
        instance.author_display_linkedin       = display_linkedin
        instance.author_display_instagram      = display_instagram
        instance.author_display_facebook       = display_facebook
        instance.author_display_articles_count = display_articles
 
        # baaki fields update karo
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
 
        instance.save()
 
        # ManyToMany update karo
        if categories is not None:
            instance.categories.set(categories)
 
        return instance
 
 
class ArticleMinSerializer(serializers.ModelSerializer):
    # FIX 2: Uses display name with fallback — same logic as ArticleSerializer
    author_name = serializers.SerializerMethodField()
    date        = serializers.SerializerMethodField()
    image_url   = serializers.SerializerMethodField()
    categories  = CategorySerializer(many=True, read_only=True)
    # FIX 1: image_alt and image_source in min serializer too for frontend image captions
    image_alt    = serializers.CharField(read_only=True)
    image_source = serializers.CharField(read_only=True)
 
    class Meta:
        model  = Article
        fields = ['id', 'title', 'image', 'author_name', 'date', 'image_url',
                  'categories', 'image_alt', 'image_source']
 
    def get_author_name(self, obj):
        # FIX 2: Always prefer display name over actual username
        if obj.author_display_name and obj.author_display_name.strip():
            return obj.author_display_name.strip()
        if obj.author:
            full = obj.author.get_full_name()
            return full if full.strip() else obj.author.username
        return ''
 
    def get_date(self, obj):
        return obj.created_at.strftime('%b %d, %Y') if obj.created_at else ''
 
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            try:
                base  = request.build_absolute_uri(obj.image.url) if request else obj.image.url
                mtime = obj.image.storage.get_modified_time(obj.image.name)
                return f"{base}?v={int(mtime.timestamp())}"
            except Exception:
                return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return obj.image_url