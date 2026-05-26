from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0062_articleassignment_completion_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='LiveUpdate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=220)),
                ('summary', models.TextField(help_text='Short live update, ideally 1-2 lines.')),
                ('is_active', models.BooleanField(default=True)),
                ('published_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Live Update',
                'verbose_name_plural': 'Live Updates',
                'ordering': ['-published_at', '-created_at'],
            },
        ),
    ]
