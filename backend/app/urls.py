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
    DailySummaryViewSet,
    EmailIngestionWebhook,
    WhatsAppWebhookView,
    InternalWhatsAppIngestion,
)

# Create router for ViewSets
router = SimpleRouter()
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'users', UserViewSet, basename='user')
router.register(r'ingestion-logs', IngestionLogViewSet, basename='ingestionlog')
router.register(r'daily-summaries', DailySummaryViewSet, basename='dailysummary')

urlpatterns = [
    path('', views.home, name='home'),
    
    # API endpoints (with /api/ prefix)
    path('api/', include([
        # Authentication endpoints under /api/
        path('auth/google/', GoogleLogin.as_view(), name='google_login'),
        path('auth/', include('dj_rest_auth.urls')),
        path('auth/registration/', include('dj_rest_auth.registration.urls')),
        
        # ViewSet endpoints
        path('', include(router.urls)),
    ])),
    
    # Webhook endpoints (NOT under /api/)
    path('webhooks/make/', EmailIngestionWebhook.as_view(), name='email-webhook'),
    path('webhooks/whatsapp/', WhatsAppWebhookView.as_view(), name='whatsapp-webhook'),
    path('api/ingestion/internal-wa/', InternalWhatsAppIngestion.as_view()),
    path('api/bot/master-data/', BotMasterData.as_view()),
]