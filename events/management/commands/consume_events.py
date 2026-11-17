from importlib import import_module

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from events.consumer import EventConsumer
from events.registry import subscribed_event_types


class Command(BaseCommand):
    help = "Consume the events this service subscribes to (handlers live in <SERVICE_NAME>/event_handlers.py)."

    def handle(self, *args, **options):
        try:
            import_module(f"{settings.SERVICE_NAME}.event_handlers")
        except ModuleNotFoundError as error:
            raise CommandError(f"{settings.SERVICE_NAME} has no event_handlers module.") from error

        event_types = subscribed_event_types()
        if not event_types:
            raise CommandError("No handlers found. Create <app>/event_handlers.py with @subscribe(...) functions.")

        queue = f"{settings.SERVICE_NAME}.events"
        self.stdout.write(f"Queue '{queue}' listening for: {', '.join(sorted(event_types))}. CTRL+C to stop.")
        try:
            EventConsumer(queue).run()
        except KeyboardInterrupt:
            self.stdout.write("Stopped.")
