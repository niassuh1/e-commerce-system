from django.core.validators import MinValueValidator
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
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    quantity = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name


class StockReservation(models.Model):
    """Stock taken out of a product for one order, so a cancelled order can give it back exactly once."""

    order_id = models.UUIDField(db_index=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reservations')
    quantity = models.PositiveIntegerField()
    released = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['order_id', 'product'], name='reservation_unique_product_per_order'),
        ]

    def __str__(self):
        return f"{self.quantity} x {self.product_id} for order {self.order_id}"
