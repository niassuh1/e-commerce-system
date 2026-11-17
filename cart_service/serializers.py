from rest_framework import serializers


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)


class SetCartItemSerializer(serializers.Serializer):
    # 0 removes the item from the cart
    quantity = serializers.IntegerField(min_value=0)
