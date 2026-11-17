from django.db import models
import uuid
# Create your models here.
class Store (models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.TextField(max_length=255)
    created_at = models.DateField(auto_now=True)
    
    def __str__(self):
        return self.name