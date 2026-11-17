from django.urls import path

from .views import checkout, get_order, list_orders, list_store_orders, update_order_status

urlpatterns = [
    path('checkout/', checkout, name='checkout'),
    path('list/', list_orders, name='list_orders'),
    path('store/', list_store_orders, name='list_store_orders'),
    path('<uuid:order_id>/', get_order, name='get_order'),
    path('<uuid:order_id>/status/', update_order_status, name='update_order_status'),
]
