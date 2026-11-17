from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from product_service.models import Product

from .cart import Cart
from .permissions import HasStore
from .serializers import AddCartItemSerializer, SetCartItemSerializer


def _get_cart(request: HttpRequest) -> Cart:
    return Cart(request.user.id, request._request.store.id)


def _check_stock(product: Product, quantity: int):
    if quantity > product.quantity:
        raise ValidationError(
            {"quantity": f"Only {product.quantity} of '{product.name}' available."}
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasStore])
def get_cart(request: HttpRequest):
    cart = _get_cart(request)
    items = cart.items()

    products = Product.objects.filter(id__in=items.keys(), store=request._request.store)
    found = {str(p.id): p for p in products}

    # Drop items whose product no longer exists in this store
    for product_id in items.keys() - found.keys():
        cart.remove(product_id)

    return Response({
        "items": [
            {
                "product_id": product_id,
                "name": product.name,
                "image_url": product.image_url,
                "quantity": items[product_id],
                "available": product.quantity,
            }
            for product_id, product in found.items()
        ]
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasStore])
def add_to_cart(request: HttpRequest):
    serializer = AddCartItemSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    product_id = serializer.validated_data['product_id']
    quantity = serializer.validated_data['quantity']

    product = get_object_or_404(Product, id=product_id, store=request._request.store)
    cart = _get_cart(request)

    _check_stock(product, cart.items().get(str(product_id), 0) + quantity)
    new_quantity = cart.add(product_id, quantity)

    return Response(
        {"product_id": str(product_id), "quantity": new_quantity},
        status=status.HTTP_201_CREATED,
    )


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, HasStore])
def cart_item(request: HttpRequest, product_id):
    cart = _get_cart(request)

    if request.method == 'DELETE':
        cart.remove(product_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = SetCartItemSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    quantity = serializer.validated_data['quantity']

    if quantity == 0:
        cart.remove(product_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    product = get_object_or_404(Product, id=product_id, store=request._request.store)
    _check_stock(product, quantity)
    cart.set(product_id, quantity)

    return Response({"product_id": str(product_id), "quantity": quantity})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasStore])
def clear_cart(request: HttpRequest):
    _get_cart(request).clear()
    return Response(status=status.HTTP_204_NO_CONTENT)
