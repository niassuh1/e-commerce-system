from rest_framework import serializers

from store_service.models import Store

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    total_sum = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'image_url', 'unit_price', 'quantity', 'total_sum']
        read_only_fields = fields


class _OrderPartiesMixin(serializers.Serializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    store_logo_url = serializers.CharField(source='store.logo_url', read_only=True)
    buyer_store_name = serializers.CharField(source='buyer_store.name', read_only=True, default=None)
    buyer_username = serializers.CharField(source='buyer_user.username', read_only=True, default=None)


class OrderSerializer(_OrderPartiesMixin, serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'buyer_user', 'buyer_username', 'buyer_store', 'buyer_store_name',
            'store', 'store_name', 'store_logo_url',
            'status', 'cancel_reason', 'total', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class OrderListSerializer(_OrderPartiesMixin, serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'buyer_user', 'buyer_username', 'buyer_store', 'buyer_store_name',
            'store', 'store_name', 'store_logo_url',
            'status', 'cancel_reason', 'total', 'item_count', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_item_count(self, order) -> int:
        # Uses the prefetched items instead of one COUNT query per order
        return sum(item.quantity for item in order.items.all())


class CheckoutSerializer(serializers.Serializer):

    buyer_store = serializers.PrimaryKeyRelatedField(
        queryset=Store.objects.all(),
        required=False,
        allow_null=True,
        default=None,
    )

    def validate_buyer_store(self, buyer_store):
        if buyer_store is None:
            return None

        if buyer_store.owner_user_id != self.context['request'].user.id:
            raise serializers.ValidationError("You don't own this store.")

        if buyer_store == self.context['store']:
            raise serializers.ValidationError("A store can't order from itself.")

        return buyer_store


class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']

    def validate_status(self, new_status):
        order = self.instance
        if new_status == order.status:
            raise serializers.ValidationError(f"The order is already {order.status}.")
        if not order.can_transition_to(new_status):
            raise serializers.ValidationError(f"An order can't go from {order.status} to {new_status}.")
        return new_status
