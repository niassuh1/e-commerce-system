from django.contrib.auth.models import Group, Permission
from rest_framework.permissions import BasePermission

DEFAULT_GROUP_NAME = 'merchant'
DEFAULT_PERMISSIONS = ['store_service.add_store', 'product_service.add_product']


def has_perm(perm: str):
    """Build a DRF permission class that checks a Django permission, e.g. 'store_service.add_store'."""

    class HasDjangoPerm(BasePermission):
        message = f"You need the '{perm}' permission."

        def has_permission(self, request, view):
            return request.user.has_perm(perm)

    return HasDjangoPerm


def grant_default_permissions(user):
    """Put the user in the default group that can create stores and products."""
    group, _ = Group.objects.get_or_create(name=DEFAULT_GROUP_NAME)
    for perm in DEFAULT_PERMISSIONS:
        app_label, codename = perm.split('.')
        group.permissions.add(
            Permission.objects.get(content_type__app_label=app_label, codename=codename)
        )
    user.groups.add(group)
