from django.urls import path
from .views import get_cart, add_to_cart, cart_item, clear_cart

urlpatterns = [
    path('list/', get_cart, name='get_cart'),
    path('add/', add_to_cart, name='add_to_cart'),
    path('edit/<uuid:product_id>/', cart_item, name='cart_item'),
    path('clear/', clear_cart, name='clear_cart'),
]
