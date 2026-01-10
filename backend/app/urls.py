from django.urls import path, include
from rest_framework.routers import SimpleRouter
from . import views
from app.views import (
    GoogleLogin,
    BranchViewSet,
    CategoryViewSet,
    TransactionViewSet,
    UserViewSet,
    IngestionLogViewSet,
    EmailIngestionWebhook,
    WhatsAppWebhookView,
)

# Create router for ViewSets
router = SimpleRouter()
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'users', UserViewSet, basename='user')
router.register(r'ingestion-logs', IngestionLogViewSet, basename='ingestionlog')

urlpatterns = [
    path('', views.home, name='home'),
    
    # Authentication endpoints
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('auth/', include('dj_rest_auth.urls')),  # login, logout, password reset, etc.
    path('auth/registration/', include('dj_rest_auth.registration.urls')),  # signup (disabled for regular users)
    
    # API endpoints
    path('api/', include(router.urls)),
    
    # Webhook endpoints (API Key protected)
    path('webhooks/make/', EmailIngestionWebhook.as_view(), name='email-webhook'),
    path('webhooks/whatsapp/', WhatsAppWebhookView.as_view(), name='whatsapp-webhook'),
]