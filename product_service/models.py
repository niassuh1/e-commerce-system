from django.db import models
import uuid


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    image_url = models.URLField(max_length=500, blank=True)
    store = models.ForeignKey(
        'store_service.Store',
        on_delete=models.CASCADE,
        related_name='products',
        db_index=True
    )
    quantity = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name