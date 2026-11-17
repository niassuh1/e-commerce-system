from django.contrib import admin
from django.urls import path

from .views import get_store, get_all_stores, create_store


urlpatterns = [
    path('all/', get_all_stores, name='get_all_store'),
    path('info/', get_store, name='get_store'),
    path('create/', create_store, name='create_store'),
]
