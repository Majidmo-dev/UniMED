from django.contrib.auth.hashers import make_password
from django.db import migrations


def seed(apps, schema_editor):
    User = apps.get_model('api', 'User')

    User.objects.update_or_create(
        username='admin@suzaadmin.ac.tz',
        defaults={
            'email': 'admin@suzaadmin.ac.tz',
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True,
            'password': make_password('Suzaadmin@2026'),
        },
    )

    User.objects.update_or_create(
        username='abdull@suza.ac.tz',
        defaults={
            'email': 'abdull@suza.ac.tz',
            'role': 'doctor',
            'doctor_name': 'Dr. Abdull',
            'specialty': 'General practitioner',
            'password': make_password('Suza@2026'),
        },
    )


def unseed(apps, schema_editor):
    User = apps.get_model('api', 'User')
    User.objects.filter(username__in=['admin@suzaadmin.ac.tz', 'abdull@suza.ac.tz']).delete()


class Migration(migrations.Migration):
    dependencies = [('api', '0001_initial')]
    operations = [migrations.RunPython(seed, unseed)]
