from rest_framework import serializers

from store_service.models import Store

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    total_sum = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'image_url', 'unit_price', 'quantity', 'total_sum']
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'buyer_user', 'buyer_store', 'store',
            'status', 'total', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'buyer_user', 'buyer_store', 'store', 'status', 'total', 'item_count', 'created_at']
        read_only_fields = fields


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
