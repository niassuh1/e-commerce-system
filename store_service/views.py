from django.http import HttpRequest
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from auth_service.permissions import has_perm
from .permissions import HasStore
from .models import Store
from .serializers import StoreSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_stores(request: HttpRequest):
    stores_list = Store.objects.all().order_by('name')
    stores = StoreSerializer(stores_list, many=True)
    return Response(stores.data)


@api_view(['GET', 'PATCH'])
@permission_classes([HasStore])
def get_store(request: HttpRequest):
    """Read the store in x-store-id. Its owner can also rename it or change its logo."""
    store = request._request.store

    if request.method == 'PATCH':
        if not request.user.is_authenticated:
            raise NotAuthenticated()
        if store.owner_user_id != request.user.id:
            raise PermissionDenied("You don't own this store.")
        serializer = StoreSerializer(store, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    return Response(StoreSerializer(store).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, has_perm('store_service.add_store')])
def create_store(request: HttpRequest):
    serializer = StoreSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(owner_user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
