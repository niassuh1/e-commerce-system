from django.http import HttpRequest
from rest_framework.decorators import api_view

# Create your views here.

api_view(['POST'])
def create_user(request: HttpRequest):
    