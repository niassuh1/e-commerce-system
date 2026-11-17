from uuid import uuid4

from django.conf import settings
from django.db import models
from django.db.models import F, Q


class OrderStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    CONFIRMED = 'confirmed', 'Confirmed'
    SHIPPED = 'shipped', 'Shipped'
    DELIVERED = 'delivered', 'Delivered'
    CANCELLED = 'cancelled', 'Cancelled'


# Forward-only flow. Cancelling is allowed until the order ships.
ALLOWED_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)

    # Buyer, only one can be set (created constraint below)
    buyer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='orders',
        null=True,
        blank=True,
    )
    buyer_store = models.ForeignKey(
        'store_service.Store',
        on_delete=models.PROTECT,
        related_name='purchases',
        null=True,
        blank=True,
    )

    # Seller
    store = models.ForeignKey(
        'store_service.Store',
        on_delete=models.PROTECT,
        related_name='sales',
    )

    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
    )
    total = models.DecimalField(max_digits=12, decimal_places=2)
    cancel_reason = models.CharField(max_length=255, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(buyer_user__isnull=False, buyer_store__isnull=True)
                    | Q(buyer_user__isnull=True, buyer_store__isnull=False)
                ),
                name='order_exactly_one_buyer',
            ),
            # A store can't buy from itself
            models.CheckConstraint(
                condition=~Q(buyer_store=F('store')),
                name='order_no_self_purchase',
            ),
        ]
        indexes = [
            models.Index(fields=['buyer_user', '-created_at']),
            models.Index(fields=['buyer_store', '-created_at']),
            models.Index(fields=['store', '-created_at']),
        ]

    def can_transition_to(self, new_status) -> bool:
        return new_status in ALLOWED_TRANSITIONS[OrderStatus(self.status)]

    @property
    def buyer(self):
        return self.buyer_user or self.buyer_store

    def __str__(self):
        return f"Order {self.id} ({self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')

    product = models.ForeignKey(
        'product_service.Product',
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_items',
    )


    product_name = models.CharField(max_length=255)
    image_url = models.URLField(max_length=500, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    quantity = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gte=1), name='orderitem_quantity_gte_1'),
            models.UniqueConstraint(fields=['order', 'product'], name='orderitem_unique_product_per_order'),
        ]

    @property
    def total_sum(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.quantity}_{self.product_name}"
