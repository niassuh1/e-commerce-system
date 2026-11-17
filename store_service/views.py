from django.http import HttpRequest
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

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