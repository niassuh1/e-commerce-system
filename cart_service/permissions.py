from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


class HasStore(BasePermission):
    message = "A valid x-store-id header is required."

    def has_permission(self, request, view):
        if getattr(request._request, "store", None) is None:
            raise PermissionDenied(self.message)
        return True
