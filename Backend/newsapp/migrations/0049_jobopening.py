from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0048_attendancerecord'),
    ]

    operations = [
        migrations.CreateModel(
            name='JobOpening',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=180)),
                ('team', models.CharField(blank=True, default='', max_length=180)),
                ('employment_type', models.CharField(choices=[('full_time', 'Full-Time'), ('part_time', 'Part-Time'), ('contract', 'Contract'), ('internship', 'Internship'), ('freelance', 'Freelance')], default='full_time', max_length=20)),
                ('location', models.CharField(blank=True, default='', max_length=180)),
                ('short_description', models.TextField()),
                ('skills', models.CharField(blank=True, default='', max_length=500)),
                ('icon_key', models.CharField(blank=True, default='briefcase', max_length=50)),
                ('apply_url', models.URLField(blank=True, default='')),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Job Opening',
                'verbose_name_plural': 'Job Openings',
                'ordering': ['display_order', 'title'],
            },
        ),
    ]
