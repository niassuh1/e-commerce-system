from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils.module_loading import autodiscover_modules

from events.consumer import EventConsumer
from events.registry import subscribed_event_types


class Command(BaseCommand):
    help = "Consume the events this service subscribes to (handlers live in <app>/event_handlers.py)."

    def handle(self, *args, **options):
        autodiscover_modules("event_handlers")

        event_types = subscribed_event_types()
        if not event_types:
            raise CommandError("No handlers found. Create <app>/event_handlers.py with @subscribe(...) functions.")

        queue = f"{settings.SERVICE_NAME}.events"
        self.stdout.write(f"Queue '{queue}' listening for: {', '.join(sorted(event_types))}. CTRL+C to stop.")
        try:
            EventConsumer(queue).run()
        except KeyboardInterrupt:
            self.stdout.write("Stopped.")
