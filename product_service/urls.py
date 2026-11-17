from django.urls import path
from .views import create_product, product_detail, list_products

urlpatterns = [
    path('create/', create_product, name='create_product'),
    path('<uuid:product_id>/', product_detail, name='product_detail'),
    path('list/', list_products, name='list_products'),
]
