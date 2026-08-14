from .serializers import RegisterSerializer,UserUpdateSerializer,LogoutSerializer,CustomTokenSerializer,GoogleLoginSerializer
from rest_framework.generics import CreateAPIView,UpdateAPIView
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.contrib.auth import get_user_model

from google.oauth2 import id_token
from google.auth.transport import requests

User=get_user_model()
# Create your views here.

class RegisterView(CreateAPIView):
    serializer_class=RegisterSerializer
    permission_classes=[AllowAny]

class UserUpdateView(UpdateAPIView):
    serializer_class=UserUpdateSerializer
    permission_classes=[IsAuthenticated]

    def get_object(self):
        return self.request.user
    
class LoginView(TokenObtainPairView):
    serializer_class=CustomTokenSerializer

class LogoutView(APIView):
    permission_classes=[IsAuthenticated]

    def post(self,request):
        serializer=LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token=RefreshToken(serializer.validated_data["refresh"])
        token.blacklist()
        return Response({"detail":"log out sucessfully."},status=status.HTTP_205_RESET_CONTENT)

class GoogleLoginView(APIView):
    permission_classes=[AllowAny]

    def post(self,request):
        serializer=GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token=serializer.validated_data["token"]

        try:
            google_data=id_token.verify_oauth2_token(token,requests.Request(),settings.GOOGLE_CLIENT_ID)
        except ValueError:
            return Response({"detail":"Invalid Google token."},status=status.HTTP_400_BAD_REQUEST)
        email=google_data.get("email")

        if not email:
            return Response({"message":"Google account email not found."},status=status.HTTP_400_BAD_REQUEST)
        user=User.objects.filter(email__iexact=email).first()

        if user is None:
            username=email.split("@")[0]
            base_username=username
            counter=1
            while User.objects.filter(username=username).exists():
                username=f"{base_username}_{counter}"
                counter+=1
            user=User.objects.create_user(username=username,email=email,)

        refresh=RefreshToken.for_user(user)
        return Response({
            "access":str(refresh.access_token),
            "refresh":str(refresh)
        },status=status.HTTP_200_OK)
    
class PublicConfigView(APIView):
    permission_classes=[AllowAny]

    def get(self,request):
        return Response({"google_client_id":settings.GOOGLE_CLIENT_ID})