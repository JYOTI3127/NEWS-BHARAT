from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0065_userprofile_digilocker_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="Report",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("period_type", models.CharField(choices=[("daily", "Daily"), ("weekly", "Weekly"), ("monthly", "Monthly")], default="daily", max_length=20)),
                ("report_date", models.DateField()),
                ("report_time", models.TimeField()),
                ("work_done", models.TextField()),
                ("pending_work", models.TextField(blank=True, default="")),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="work_reports", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Report",
                "verbose_name_plural": "Reports",
                "db_table": "reports",
                "ordering": ["-report_date", "-report_time", "-created_at"],
            },
        ),
    ]
