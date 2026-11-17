from django.db.models import Q
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cart_service.cart import Cart
from store_service.permissions import HasStore

from .models import Order, OrderStatus
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


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasStore])
def checkout(request: HttpRequest):

    store = request._request.store
    serializer = CheckoutSerializer(data=request.data, context={'request': request, 'store': store})
    serializer.is_valid(raise_exception=True)

    if not Cart(request.user.id, store.id).items():
        raise ValidationError({'cart': 'Your cart is empty.'})

    # TODO: Publish order.created from rabbitmq, and listen to it in the products service to handle inventory
    return Response({'detail': 'Order received.'}, status=status.HTTP_202_ACCEPTED)


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
