from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('store_service', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='store',
            name='owner_user',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='stores',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
