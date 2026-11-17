from rest_framework import serializers
from django.contrib.auth.models import User

from store_service.serializers import StoreSerializer

class UserSerializer(serializers.ModelSerializer):
    stores = StoreSerializer(many=True, read_only=True)
    class Meta:
        model = User
        fields = ['id', 'is_superuser', 'username', 'first_name', 'last_name',
                  'email', 'is_staff', 'is_active', 'stores']