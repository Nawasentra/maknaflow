from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import IngestionLog, TransactionSource, IngestionStatus
from .serializers import EmailWebhookPayloadSerializer
from .ingestion.email_webhook import EmailWebhookService
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
import logging

logger = logging.getLogger(__name__)

class EmailIngestionWebhook(APIView):
    """
    POST /webhooks/make/
    Headers: X-Api-Key: <your-key>
    """
    authentication_classes = [] 
    permission_classes = []
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        # 1. Security
        api_key = request.headers.get('X-Api-Key')
        expected_api_key = getattr(settings, 'INGESTION_API_KEY', None)
        if not expected_api_key:
            logger.error("INGESTION_API_KEY is not configured or is empty.")
            return Response({"error": "Server misconfiguration"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        if api_key != expected_api_key:
            logger.warning("Unauthorized access attempt with API key: %s", api_key)
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # 2. Input validation
        serializer = EmailWebhookPayloadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"Invalid webhook payload: {serializer.errors}")
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Log
        log = IngestionLog.objects.create(
            source=TransactionSource.EMAIL,
            raw_payload=serializer.validated_data,
            status=IngestionStatus.PENDING
        )

        # 4. Process
        try:
            service = EmailWebhookService()
            msg = service.process_payload(serializer.validated_data)
            
            log.status = IngestionStatus.SUCCESS
            log.save()
            logger.info("Webhook processed successfully.")
            return Response({"status": "success", "message": msg}, status=status.HTTP_200_OK)

        except Exception as e:
            log.status = IngestionStatus.FAILED
            log.error_message = str(e)
            log.save()
            logger.error(f"Webhook processing failed: {e}", exc_info=True)
            return Response(
                {"status": "error", "message": "Failed to process webhook"},
                status=status.HTTP_400_BAD_REQUEST
            )
          
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
from django.conf import settings
import logging

from .models import Branch, Category, Transaction, User, IngestionLog, TransactionSource, IngestionStatus
from .serializers import (
    BranchSerializer,
    CategorySerializer,
    TransactionSerializer,
    UserSerializer,
    IngestionLogSerializer,
    WhatsAppWebhookPayloadSerializer,
)
from .permissions import (
    IsOwner,
    IsStaffOrOwner,
    IsOwnerOrReadOnly,
    CanVerifyTransaction,
)

logger = logging.getLogger(__name__)


class GoogleLogin(SocialLoginView):
    """
    Google OAuth2 login endpoint for owner accounts only
    
    POST /api/auth/google/
    Body: {
        "access_token": "google_access_token_here",  # For frontend OAuth flow
        OR
        "code": "google_auth_code_here",  # For backend OAuth flow
        OR
        "id_token": "google_id_token_here"  # For Google One Tap
    }
    
    Returns: {
        "key": "rest_framework_auth_token",
        "user": {...}
    }
    """
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    
    @property
    def callback_url(self):
        """Get callback URL from settings"""
        return config(
            'GOOGLE_OAUTH_CALLBACK_URL',
            default='http://localhost:8000/accounts/google/login/callback/'
        )
    
    def post(self, request, *args, **kwargs):
        """Handle Google OAuth login with detailed logging"""
        logger.info("=" * 80)
        logger.info("Google OAuth Login Attempt")
        logger.info("=" * 80)
        
        # Log request details
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request path: {request.path}")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"Request data keys: {list(request.data.keys())}")
        
        # Don't log the actual token for security, just check if it exists
        has_access_token = 'access_token' in request.data
        has_code = 'code' in request.data
        has_id_token = 'id_token' in request.data
        
        logger.info(f"Has access_token: {has_access_token}")
        logger.info(f"Has code: {has_code}")
        logger.info(f"Has id_token: {has_id_token}")
        
        # Check if Google OAuth is configured
        google_config = settings.SOCIALACCOUNT_PROVIDERS.get('google', {})
        client_id = google_config.get('APP', {}).get('client_id')
        
        if not client_id:
            logger.error("Google OAuth CLIENT_ID is not configured")
            return Response(
                {"error": "Google authentication is not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        logger.info(f"Google Client ID configured: {client_id[:20]}...")
        
        # Check if owner emails are configured
        if not settings.OWNER_EMAILS:
            logger.error("OWNER_EMAILS not configured")
            return Response(
                {"error": "Owner authentication is not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        logger.info(f"Owner emails configured: {len(settings.OWNER_EMAILS)} email(s)")
        
        try:
            # Call parent class method
            logger.info("Calling parent SocialLoginView.post()...")
            response = super().post(request, *args, **kwargs)
            
            # Log success
            if response.status_code == 200:
                user_email = response.data.get('user', {}).get('email', 'unknown')
                logger.info(f"✅ Google OAuth login successful for: {user_email}")
            else:
                logger.warning(f"⚠️ Response status: {response.status_code}")
                logger.warning(f"Response data: {response.data}")
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Google OAuth login failed: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Exception details: {e}", exc_info=True)
            
            return Response(
                {
                    "error": "Authentication failed. Please try again.",
                    "detail": str(e) if settings.DEBUG else "Please check server logs."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


def home(request):
    """
    Simple home view for testing
    """
    return HttpResponse("""
        <html>
        <head><title>MaknaFlow API</title></head>
        <body>
            <h1>MaknaFlow Transaction Management API</h1>
            <p>Server is running!</p>
            <ul>
                <li><a href="/admin/">Admin Panel</a></li>
                <li><a href="/api/">API Browser</a></li>
                <li><a href="/auth/google/">Google Login (Owners Only)</a></li>
            </ul>
        </body>
        </html>
    """)

# ==========================================
# BRANCH VIEWSET
# ==========================================

class BranchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRUD operations on Branches
    - Owner: Full access
    - Staff: Read-only access to all branches
    """
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['branch_type']
    search_fields = ['name', 'address']


# ==========================================
# CATEGORY VIEWSET
# ==========================================

class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRUD operations on Categories
    - Owner: Full access
    - Staff: Read-only access to all
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['transaction_type']
    search_fields = ['name']


# ==========================================
# TRANSACTION VIEWSET
# ==========================================

class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Transaction management
    - List: Filter by branch, date range, verification status
    - Create: Staff can create for their branch, auto-verified if they're verified staff
    - Verify: Only owner can verify
    - Void: Only owner can void
    """
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated, CanVerifyTransaction]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'transaction_type', 'is_verified', 'date', 'source']
    search_fields = ['description', 'category__name', 'source_identifier']
    ordering_fields = ['date', 'created_at', 'amount']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        """
        Filter transactions based on user role
        - Owner: sees all
        - Staff: sees only their branch's transactions
        """
        if self.request.user.is_superuser:
            return Transaction.objects.all()
        
        if self.request.user.assigned_branch:
            return Transaction.objects.filter(branch=self.request.user.assigned_branch)
        
        return Transaction.objects.none()

    def perform_create(self, serializer):
        """
        Auto-set reported_by and auto-verify if staff is verified
        """
        # Prepare additional fields
        extra_fields = {
            'reported_by': self.request.user
        }
        
        # Auto-verify if the staff member is verified
        if self.request.user.is_verified:
            extra_fields['is_verified'] = True
        
        # Save with all fields at once
        serializer.save(**extra_fields)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsOwner])
    def verify(self, request, pk=None):
        """
        Verify a transaction (owner only)
        """
        transaction = self.get_object()
        transaction.is_verified = True
        transaction.save()
        
        return Response(
            {'detail': 'Transaction verified successfully'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsOwner])
    def void(self, request, pk=None):
        """
        Mark transaction as void/cancelled (owner only)
        """
        transaction = self.get_object()
        transaction.is_valid = False
        transaction.voided_by = request.user
        transaction.voided_at = timezone.now()
        transaction.save()
        
        return Response(
            {'detail': 'Transaction voided successfully'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending(self, request):
        """
        Get all pending transactions (not verified)
        """
        transactions = self.get_queryset().filter(is_verified=False)
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)


# ==========================================
# USER VIEWSET
# ==========================================

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User/Staff management
    - Owner: Full access to manage staff
    - Staff: Read-only, can only view their own profile
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['assigned_branch', 'is_verified']
    search_fields = ['username', 'email', 'phone_number']

    def get_queryset(self):
        """
        Owner sees all users, staff sees only their own profile
        """
        if self.request.user.is_superuser:
            return User.objects.all()
        
        return User.objects.filter(id=self.request.user.id)

    def get_permissions(self):
        """
        Allow any user to view profile endpoint, but restrict others
        """
        if self.action == 'profile':
            return [IsAuthenticated()]
        elif self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), IsOwner()]
        else:
            return [IsAuthenticated(), IsOwner()]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        """
        Get current user profile
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsOwner])
    def verify(self, request, pk=None):
        """
        Verify a staff member (owner only)
        - Verified staff: transactions auto-approved
        """
        user = self.get_object()
        user.is_verified = True
        user.save()
        
        return Response(
            {'detail': 'Staff member verified successfully'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsOwner])
    def unverify(self, request, pk=None):
        """
        Unverify a staff member (owner only)
        """
        user = self.get_object()
        user.is_verified = False
        user.save()
        
        return Response(
            {'detail': 'Staff member unverified'},
            status=status.HTTP_200_OK
        )


# ==========================================
# INGESTION LOG VIEWSET
# ==========================================

class IngestionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing Ingestion Logs
    - Owner: Full access
    - Staff: View logs from their branch transactions
    """
    queryset = IngestionLog.objects.all()
    serializer_class = IngestionLogSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['source', 'status']
    ordering_fields = ['created_at']
    ordering = ['-created_at']


# ==========================================
# WEBHOOK VIEWS (API Key Protected)
# ==========================================

class WhatsAppWebhookView(APIView):
    """
    Webhook endpoint for WhatsApp ingestion (Twilio/Make.com)
    Requires INGESTION_API_KEY in Authorization header
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Verify API Key is configured
        expected_key = getattr(settings, 'INGESTION_API_KEY', None)
        
        if not expected_key:
            logger.error("INGESTION_API_KEY is not configured or is empty.")
            return Response(
                {'error': 'Server misconfiguration'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Verify API Key matches
        api_key = request.headers.get('X-Api-Key')
        
        if api_key != expected_key:
            logger.warning("Unauthorized WhatsApp webhook access attempt with API key: %s", api_key)
            return Response(
                {'error': 'Invalid or missing API key'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Log the raw payload
        ingestion_log = IngestionLog.objects.create(
            source=TransactionSource.WHATSAPP,
            raw_payload=request.data,
            status=IngestionStatus.PENDING
        )

        try:
            # Validate payload
            serializer = WhatsAppWebhookPayloadSerializer(data=request.data)
            
            if not serializer.is_valid():
                ingestion_log.status = IngestionStatus.FAILED
                ingestion_log.error_message = str(serializer.errors)
                ingestion_log.save()
                logger.warning(f"Invalid WhatsApp webhook payload: {serializer.errors}")
                return Response(
                    {'error': 'Invalid payload format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get validated data
            data = serializer.validated_data
            
            # Try to get user by phone number
            try:
                user = User.objects.get(phone_number=data['phone_number'])
                branch = user.assigned_branch
                
                if not branch:
                    ingestion_log.status = IngestionStatus.FAILED
                    ingestion_log.error_message = 'User has no assigned branch'
                    ingestion_log.save()
                    return Response(
                        {'error': 'Invalid request'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            except User.DoesNotExist:
                ingestion_log.status = IngestionStatus.FAILED
                ingestion_log.error_message = 'User with phone number not found'
                ingestion_log.save()
                return Response(
                    {'error': 'Invalid request'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Store the message for processing
            # TODO: Integrate with a message parser to extract transaction details
            message_text = data['message']
            
            # For now, just log it as pending processing
            ingestion_log.status = IngestionStatus.SUCCESS
            ingestion_log.save()

            return Response(
                {
                    'detail': 'WhatsApp message received and queued for processing',
                    'user': user.username,
                    'branch': branch.name
                },
                status=status.HTTP_202_ACCEPTED
            )

        except Exception as e:
            ingestion_log.status = IngestionStatus.FAILED
            ingestion_log.error_message = str(e)
            ingestion_log.save()
            logger.error(f"WhatsApp webhook processing failed: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to process webhook'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
