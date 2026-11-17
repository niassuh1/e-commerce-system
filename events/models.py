from django.db import models


class ProcessedEvent(models.Model):

    event_id = models.UUIDField()
    consumer = models.CharField(max_length=100)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["event_id", "consumer"], name="unique_event_per_consumer"),
        ]
