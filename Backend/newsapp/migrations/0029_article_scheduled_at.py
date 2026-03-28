from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0028_alter_category_sub_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="scheduled_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
