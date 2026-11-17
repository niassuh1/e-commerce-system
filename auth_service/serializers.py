from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction

from store_service.serializers import StoreSerializer
from .permissions import grant_default_permissions


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'first_name', 'last_name', 'email']
        extra_kwargs = {'email': {'required': True}}

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        grant_default_permissions(user)
        return user


class UserSerializer(serializers.ModelSerializer):
    stores = StoreSerializer(many=True, read_only=True)
    class Meta:
        model = User
        fields = ['id', 'is_superuser', 'username', 'first_name', 'last_name',
                  'email', 'is_staff', 'is_active', 'stores']