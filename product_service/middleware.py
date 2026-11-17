from django.core.exceptions import ValidationError
from store_service.models import Store

class StoreMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.store = None
        store_id = request.headers.get("x-store-id")
        if store_id:
            try:
                request.store = Store.objects.get(pk=store_id)
            except (Store.DoesNotExist, ValidationError):  # ValidationError = malformed UUID
                pass
        return self.get_response(request)
