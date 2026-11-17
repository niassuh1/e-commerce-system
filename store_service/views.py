from django.http import HttpRequest
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework import status
from django.contrib.auth.models import User

from .permissions import HasStore
from .models import Store
from .serializers import StoreSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_stores(request: HttpRequest):
    stores_list = Store.objects.all()
    stores = StoreSerializer(stores_list, many=True)
    return Response(stores.data)

@api_view(['GET'])
@permission_classes([HasStore])
def get_store(request: HttpRequest):
    tenant_id = request.headers.get('x-store-id')
    store = Store.objects.get(id=tenant_id)
    storeItem = StoreSerializer(store)
    return Response(storeItem.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_store(request: HttpRequest):
    serializer = StoreSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(owner_user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    