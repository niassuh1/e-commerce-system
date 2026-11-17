import pika
from django.conf import settings

from .connection import declare_exchange, open_connection
from .event import Event


def publish(event_type: str, data: dict) -> Event:

    event = Event(type=event_type, data=data)

    with open_connection() as connection:
        channel = connection.channel()
        declare_exchange(channel)
        channel.confirm_delivery() 
        channel.basic_publish(
            exchange=settings.EVENTS_EXCHANGE,
            routing_key=event.type,
            body=event.to_json(),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=pika.DeliveryMode.Persistent,
                message_id=event.id,
                type=event.type,
            ),
        )
    return event
