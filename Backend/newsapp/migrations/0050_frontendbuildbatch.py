from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0049_jobopening"),
    ]

    operations = [
        migrations.CreateModel(
            name="FrontendBuildBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("batch_key", models.CharField(default="default", max_length=50, unique=True)),
                ("pending_publish_count", models.PositiveIntegerField(default=0)),
                ("pending_article_ids", models.JSONField(blank=True, default=list)),
                ("first_pending_at", models.DateTimeField(blank=True, null=True)),
                ("last_queued_at", models.DateTimeField(blank=True, null=True)),
                ("last_triggered_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Frontend Build Batch",
                "verbose_name_plural": "Frontend Build Batches",
            },
        ),
    ]
