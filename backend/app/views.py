from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from decouple import config

from .models import Branch, Category, Transaction, User, IngestionLog, TransactionSource, IngestionStatus
from .serializers import (
    BranchSerializer,
    CategorySerializer,
    TransactionSerializer,
    UserSerializer,
    IngestionLogSerializer,
)
from .permissions import (
    IsOwner,
    IsStaffOrOwner,
    IsOwnerOrReadOnly,
    CanVerifyTransaction,
)


def home(request):
    return HttpResponse("Hello, world!")


class GoogleLogin(SocialLoginView):
    """
    Google OAuth2 login view for dj-rest-auth
    Ensure callback_url matches the frontend and Google Console settings
    """
    adapter_class = GoogleOAuth2Adapter
    callback_url = config('GOOGLE_OAUTH_CALLBACK_URL', default='http://localhost:5173')
    client_class = OAuth2Client
