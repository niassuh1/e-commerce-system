import logging

from django.conf import settings
from django.db import close_old_connections, transaction
from pika.adapters.blocking_connection import BlockingChannel

from .connection import declare_exchange, open_connection
from .event import Event
from .models import ProcessedEvent
from .registry import handlers_for, subscribed_event_types

logger = logging.getLogger(__name__)


class EventConsumer:
    def __init__(self, queue: str):
        self.queue = queue

    def run(self) -> None:
        with open_connection() as connection:
            channel = connection.channel()
            self._declare_topology(channel)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=self.queue, on_message_callback=self._on_message)
            channel.start_consuming()

    def _declare_topology(self, channel: BlockingChannel) -> None:
        declare_exchange(channel)


        dead_queue = f"{self.queue}.dead"
        channel.queue_declare(queue=dead_queue, durable=True)
        channel.queue_declare(
            queue=self.queue,
            durable=True,
            arguments={"x-dead-letter-exchange": "", "x-dead-letter-routing-key": dead_queue},
        )
        for event_type in subscribed_event_types():
            channel.queue_bind(queue=self.queue, exchange=settings.EVENTS_EXCHANGE, routing_key=event_type)

    def _on_message(self, channel: BlockingChannel, method, properties, body: bytes) -> None:
        close_old_connections()  
        try:
            self._handle(Event.from_json(body))
        except Exception:
            logger.exception("Failed to process message: %s", body[:200])

            channel.basic_nack(method.delivery_tag, requeue=not method.redelivered)
        else:
            channel.basic_ack(method.delivery_tag)
        finally:
            close_old_connections()

    def _handle(self, event: Event) -> None:

        with transaction.atomic():
            _, is_new = ProcessedEvent.objects.get_or_create(event_id=event.id, consumer=self.queue)
            if not is_new:
                logger.info("Skipping duplicate event %s", event.id)
                return
            for handler in handlers_for(event.type):
                handler(event)
