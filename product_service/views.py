from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from auth_service.permissions import has_perm
from .permissions import HasStore
from .models import Product
from .serializers import ProductSerializer


def _require_owner(request: HttpRequest):
    if not request.user.is_authenticated:
        raise NotAuthenticated()
    if request._request.store.owner_user_id != request.user.id:
        raise PermissionDenied("You don't own this store.")


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasStore, has_perm('product_service.add_product')])
def create_product(request: HttpRequest):
    _require_owner(request)
    serializer = ProductSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(store=request._request.store)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([HasStore])
def product_detail(request: HttpRequest, product_id):
    """Anyone can read a product. Only the store owner can change or delete it."""
    store = request._request.store
    product = get_object_or_404(Product, id=product_id, store=store)

    if request.method == 'GET':
        return Response(ProductSerializer(product).data)

    _require_owner(request)

    if request.method == 'DELETE':
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ProductSerializer(
        product, data=request.data, partial=request.method == 'PATCH'
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([HasStore])
def list_products(request: HttpRequest):
    store = request._request.store

    products = Product.objects.filter(store=store).order_by('name')
    return Response(ProductSerializer(products, many=True).data)
