from rest_framework.permissions import BasePermission

class HasStore(BasePermission):
    message = "A valid x-store-id header is required."

    def has_permission(self, request, view):
        return getattr(request._request, "store", None) is not None
