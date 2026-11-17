from django.db import transaction
from django.db.models import F

from events import publish, subscribe
from events.event import Event
from events.event_types import EventType

from .models import Product, StockReservation


class InsufficientStock(Exception):
    pass


@subscribe(EventType.ORDER_CREATED)
def reserve_stock(event: Event) -> None:
    store_id = event.data["store_id"]
    order_id = event.data["order_id"]
    try:
        with transaction.atomic():  # savepoint: undo partial decrements if one item fails
            for item in event.data["items"]:
                updated = Product.objects.filter(
                    id=item["product_id"],
                    store_id=store_id,
                    quantity__gte=item["quantity"],
                ).update(quantity=F("quantity") - item["quantity"])
                if not updated:
                    raise InsufficientStock(item["product_id"])
                StockReservation.objects.create(
                    order_id=order_id,
                    product_id=item["product_id"],
                    quantity=item["quantity"],
                )
    except InsufficientStock as error:
        payload = {"order_id": order_id, "reason": f"Insufficient stock for product {error}"}
        transaction.on_commit(lambda: publish(EventType.INVENTORY_REJECTED, payload))


@subscribe(EventType.ORDER_CANCELLED)
def release_stock(event: Event) -> None:
    """Give back whatever this order reserved. Orders rejected for stock never reserved anything."""
    reservations = StockReservation.objects.select_for_update().filter(
        order_id=event.data["order_id"], released=False,
    )
    for reservation in reservations:
        Product.objects.filter(id=reservation.product_id).update(
            quantity=F("quantity") + reservation.quantity
        )
        reservation.released = True
        reservation.save(update_fields=["released"])
