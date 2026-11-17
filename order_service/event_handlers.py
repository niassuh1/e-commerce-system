from events import subscribe
from events.event import Event
from events.event_types import EventType

from .models import Order, OrderStatus


@subscribe(EventType.INVENTORY_REJECTED)
def cancel_rejected_order(event: Event) -> None:
    Order.objects.filter(
        id=event.data["order_id"], status=OrderStatus.PENDING,
    ).update(status=OrderStatus.CANCELLED, cancel_reason=event.data.get("reason", "")[:255])
