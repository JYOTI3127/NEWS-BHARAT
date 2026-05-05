import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0050_frontendbuildbatch"),
    ]

    operations = [
        migrations.AddField(
            model_name="pushsubscription",
            name="failed_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="last_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="last_status",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="sent_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="subscriber_email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AddField(
            model_name="pushsubscription",
            name="subscriber_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.CreateModel(
            name="PushNotificationLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField(blank=True, default="")),
                ("target_url", models.CharField(blank=True, default="", max_length=500)),
                ("icon", models.CharField(blank=True, default="", max_length=255)),
                ("status", models.CharField(choices=[("sent", "Sent"), ("failed", "Failed")], max_length=20)),
                ("error_message", models.TextField(blank=True, default="")),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
                (
                    "subscription",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_logs", to="newsapp.pushsubscription"),
                ),
            ],
            options={
                "verbose_name": "Push Notification Log",
                "verbose_name_plural": "Push Notification Logs",
                "ordering": ["-sent_at"],
            },
        ),
    ]
