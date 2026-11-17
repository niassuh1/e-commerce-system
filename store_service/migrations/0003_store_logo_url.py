from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store_service', '0002_store_owner_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='store',
            name='logo_url',
            field=models.URLField(blank=True, max_length=500),
        ),
    ]
