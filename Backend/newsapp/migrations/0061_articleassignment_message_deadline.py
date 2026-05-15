from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0060_category_meta_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='articleassignment',
            name='assignment_message',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='articleassignment',
            name='deadline',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterUniqueTogether(
            name='articleassignment',
            unique_together={('article', 'user', 'role_type')},
        ),
    ]
