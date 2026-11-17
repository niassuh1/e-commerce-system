from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cart_service.cart import Cart
from events.event_types import EventType
from events.publisher import publish
from product_service.models import Product
from store_service.permissions import HasStore

from .models import Order, OrderItem, OrderStatus
from .serializers import (
    CheckoutSerializer,
    OrderListSerializer,
    OrderSerializer,
    OrderStatusSerializer,
)


def _is_seller(order: Order, user) -> bool:
    return order.store.owner_user_id == user.id


def _is_buyer(order: Order, user) -> bool:
    return order.buyer_user_id == user.id or (
        order.buyer_store is not None and order.buyer_store.owner_user_id == user.id
    )


def _get_order(order_id) -> Order:
    return get_object_or_404(
        Order.objects.select_related('store', 'buyer_store').prefetch_related('items'),
        id=order_id,
    )


def _check_cart_is_available(cart_items: dict[str, int], products: dict[str, Product]) -> None:
    """Quick feedback for the buyer. The real stock change happens when order.created is consumed."""
    errors = []
    for product_id, quantity in cart_items.items():
        product = products.get(product_id)
        if product is None:
            errors.append(f"Product {product_id} is no longer available.")
        elif quantity > product.quantity:
            errors.append(f"Only {product.quantity} of '{product.name}' available.")
    if errors:
        raise ValidationError({'items': errors})


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasStore])
def checkout(request: HttpRequest):
    store = request._request.store
    serializer = CheckoutSerializer(data=request.data, context={'request': request, 'store': store})
    serializer.is_valid(raise_exception=True)
    buyer_store = serializer.validated_data['buyer_store']

    cart = Cart(request.user.id, store.id)
    cart_items = cart.items()
    if not cart_items:
        raise ValidationError({'cart': 'Your cart is empty.'})

    products = {str(p.id): p for p in Product.objects.filter(id__in=cart_items.keys(), store=store)}
    _check_cart_is_available(cart_items, products)

    with transaction.atomic():
        order = Order.objects.create(
            buyer_user=None if buyer_store else request.user,
            buyer_store=buyer_store,
            store=store,
            total=sum((products[pid].price * quantity for pid, quantity in cart_items.items()), Decimal('0')),
        )
        OrderItem.objects.bulk_create(
            OrderItem(
                order=order,
                product=products[pid],
                product_name=products[pid].name,
                image_url=products[pid].image_url,
                unit_price=products[pid].price,
                quantity=quantity,
            )
            for pid, quantity in cart_items.items()
        )

        transaction.on_commit(cart.clear)

    payload = {
        "order_id": str(order.id),
        "store_id": str(order.store_id),
        "items": [{"product_id": str(i.product_id), "quantity": i.quantity} for i in order.items.all()],
    }
    transaction.on_commit(lambda: publish(EventType.ORDER_CREATED, payload))
    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_orders(request: HttpRequest):
 
    orders = Order.objects.filter(
        Q(buyer_user=request.user) | Q(buyer_store__owner_user=request.user)
    ).prefetch_related('items')
    return Response(OrderListSerializer(orders, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasStore])
def list_store_orders(request: HttpRequest):

    store = request._request.store
    if store.owner_user_id != request.user.id:
        raise PermissionDenied("You don't own this store.")

    orders = Order.objects.filter(store=store).prefetch_related('items')
    return Response(OrderListSerializer(orders, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order(request: HttpRequest, order_id):
    order = _get_order(order_id)
    if not (_is_buyer(order, request.user) or _is_seller(order, request.user)):
        raise PermissionDenied("You can't view this order.")
    return Response(OrderSerializer(order).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_order_status(request: HttpRequest, order_id):

    order = _get_order(order_id)

    serializer = OrderStatusSerializer(order, data=request.data)
    serializer.is_valid(raise_exception=True)
    new_status = serializer.validated_data['status']

    buyer_may_cancel = _is_buyer(order, request.user) and new_status == OrderStatus.CANCELLED
    if not (_is_seller(order, request.user) or buyer_may_cancel):
        raise PermissionDenied("You can't set this status on this order.")

    serializer.save()
    return Response(OrderSerializer(order).data)
