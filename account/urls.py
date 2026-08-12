from django.urls import path
from .views import RegisterView,UserUpdateView,LoginView,LogoutView,GoogleLoginView,PublicConfigView

urlpatterns=[
    path('register',RegisterView.as_view(),name="register"),
    path('update',UserUpdateView.as_view(),name="update"),
    path('login',LoginView.as_view(),name="login"),
    path('logout',LogoutView.as_view(),name="logout"),
    path('google/',GoogleLoginView.as_view(),name="google-login"),
    path('config',PublicConfigView.as_view(),name="public-config"),
]