from decimal import Decimal

from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from product_service.models import Product
from store_service.models import Store

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


def _cart_payload(cart: Cart, store: Store) -> dict:
    
    items = cart.items()

    products = Product.objects.filter(id__in=items.keys(), store=store)
    found = {str(p.id): p for p in products}

    for product_id in items.keys() - found.keys():
        cart.remove(product_id)

    lines = [
        {
            "product_id": product_id,
            "name": product.name,
            "image_url": product.image_url,
            "price": str(product.price),
            "quantity": items[product_id],
            "line_total": str(product.price * items[product_id]),
            "available": product.quantity,
        }
        for product_id, product in sorted(found.items(), key=lambda pair: pair[1].name)
    ]
    subtotal = sum((product.price * items[pid] for pid, product in found.items()), Decimal("0"))

    return {
        "store": {"id": str(store.id), "name": store.name, "logo_url": store.logo_url},
        "items": lines,
        "item_count": sum(items[pid] for pid in found),
        "subtotal": str(subtotal),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasStore])
def get_cart(request: HttpRequest):
    return Response(_cart_payload(_get_cart(request), request._request.store))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_carts(request: HttpRequest):
    store_ids = Cart.store_ids_for_user(request.user.id)
    stores = Store.objects.filter(id__in=store_ids).order_by('name')

    carts = []
    for store in stores:
        payload = _cart_payload(Cart(request.user.id, store.id), store)
        if payload["items"]:
            carts.append(payload)
    return Response({"carts": carts})


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
