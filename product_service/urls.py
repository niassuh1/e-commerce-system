from django.urls import path
from .views import create_product, update_product

urlpatterns = [
path('create/', create_product, name='create_product'),
path('<uuid:product_id>/', update_product, name='update_product'),
]