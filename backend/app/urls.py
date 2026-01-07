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
    EmailWebhookView,
    WhatsAppWebhookView,
)

# Create router for ViewSets
router = SimpleRouter()
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'users', UserViewSet, basename='user')
router.register(r'ingestion-logs', IngestionLogViewSet, basename='ingestion-log')

urlpatterns = [
    path('', views.home, name='home'),
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('api/', include(router.urls)),
    
    # Webhook endpoints (API Key protected)
    path('webhooks/email/', EmailWebhookView.as_view(), name='email_webhook'),
    path('webhooks/whatsapp/', WhatsAppWebhookView.as_view(), name='whatsapp_webhook'),
]