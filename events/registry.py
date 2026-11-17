from collections import defaultdict
from typing import Callable

from .event import Event

Handler = Callable[[Event], None]

_handlers: dict[str, list[Handler]] = defaultdict(list)


def subscribe(event_type: str) -> Callable[[Handler], Handler]:


    def decorator(handler: Handler) -> Handler:
        _handlers[event_type].append(handler)
        return handler

    return decorator


def handlers_for(event_type: str) -> list[Handler]:
    return _handlers.get(event_type, [])


def subscribed_event_types() -> list[str]:
    return list(_handlers)
