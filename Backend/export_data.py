import django, os, io
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'news.settings')
django.setup()
from django.core.management import call_command
buf = io.StringIO()
call_command('dumpdata', '--natural-foreign', '--natural-primary', exclude=['contenttypes', 'auth.permission'], indent=2, stdout=buf)
with open('data_backup.json', 'w', encoding='utf-8') as f:
    f.write(buf.getvalue())
print('Done!')