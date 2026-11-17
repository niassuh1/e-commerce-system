from django.conf import settings
from django.db import models
import uuid
class Store(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.TextField(max_length=255)
    logo_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateField(auto_now_add=True)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='stores',
        null=True,
    )
    def __str__(self):
        return self.name