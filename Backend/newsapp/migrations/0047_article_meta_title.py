from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0046_merge_20260423_1640'),
    ]

    operations = [
        migrations.AddField(
            model_name='article',
            name='meta_title',
            field=models.TextField(blank=True, default=''),
        ),
    ]
