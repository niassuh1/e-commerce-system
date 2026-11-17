from django.http import HttpRequest
from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .permissions import HasStore
from .models import Product
from .serializers import ProductSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasStore])
def create_product(request: HttpRequest):
    serializer = ProductSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(store=request._request.store)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, HasStore])
def update_product(request: HttpRequest, product_id):
    store = request._request.store
    if store.owner_user_id != request.user.id:
        raise PermissionDenied("You don't own this store.")

    product = get_object_or_404(Product, id=product_id, store=store)
    serializer = ProductSerializer(
        product, data=request.data, partial=request.method == 'PATCH'
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)

