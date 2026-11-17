import pika
from django.conf import settings
from pika.adapters.blocking_connection import BlockingChannel


def open_connection() -> pika.BlockingConnection:
    cfg = settings.RABBITMQ
    return pika.BlockingConnection(
        pika.ConnectionParameters(
            host=cfg["HOST"],
            port=cfg["PORT"],
            credentials=pika.PlainCredentials(cfg["USER"], cfg["PASSWORD"]),
            heartbeat=60,
        )
    )


def declare_exchange(channel: BlockingChannel) -> None:
    channel.exchange_declare(
        exchange=settings.EVENTS_EXCHANGE,
        exchange_type="topic",
        durable=True,
    )
