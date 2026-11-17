from django.contrib import admin

from .models import Product, StockReservation

admin.site.register(Product)
admin.site.register(StockReservation)
