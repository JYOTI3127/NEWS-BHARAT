from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0061_articleassignment_message_deadline'),
    ]

    operations = [
        migrations.AddField(
            model_name='articleassignment',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='articleassignment',
            name='completion_note',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='articleassignment',
            name='work_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('completed', 'Completed')], default='pending', max_length=20),
        ),
    ]
