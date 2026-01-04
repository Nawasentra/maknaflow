from django.urls import path
from . import views
from app.views import GoogleLogin

urlpatterns = [
    path('', views.home, name='home'),
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
]