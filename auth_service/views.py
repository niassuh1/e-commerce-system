from django.http import HttpRequest
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import AccessToken

from auth_service.serializers import RegisterSerializer, UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request: HttpRequest):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


# Create your views here.
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request: HttpRequest):
    jwt_token = request.headers.get("Authorization").split(' ')[1]
    token = AccessToken(jwt_token)
    user_obj = User.objects.get(id=token["user_id"])
    return Response(UserSerializer(user_obj).data)