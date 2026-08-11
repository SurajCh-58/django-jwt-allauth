from .serializers import RegisterSerializer,UserUpdateSerializer,LogoutSerializer,CustomTokenSerializer
from rest_framework.generics import CreateAPIView,UpdateAPIView
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
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