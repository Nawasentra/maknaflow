from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import IngestionLog, TransactionSource, IngestionStatus, Transaction, Branch, Category, User
from .serializers import EmailWebhookPayloadSerializer
from .ingestion.email_webhook import EmailWebhookService
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
import logging
import traceback

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

from .models import Branch, Category, Transaction, User, IngestionLog, DailySummary, TransactionSource, IngestionStatus
from .serializers import (
    BranchSerializer,
    CategorySerializer,
    TransactionSerializer,
    UserSerializer,
    IngestionLogSerializer,
    DailySummarySerializer,
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
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    
    def get_callback_url(self, request, app):
        """
        Override to provide the callback URL.
        This is called by the OAuth2Client.
        """
        callback = config(
            'GOOGLE_OAUTH_CALLBACK_URL',
            default=None
        )
        
        if not callback:
            # Build from request if not configured
            protocol = 'https' if request.is_secure() else 'http'
            host = request.get_host()
            callback = f"{protocol}://{host}/accounts/google/login/callback/"
            logger.info(f"Auto-generated callback URL: {callback}")
        else:
            logger.info(f"Using configured callback URL: {callback}")
        
        return callback

    @property
    def callback_url(self):
        """Get callback URL from settings"""
        return config(
            'GOOGLE_OAUTH_CALLBACK_URL',
            default='http://localhost:8000/accounts/google/login/callback/'
        )
    
    def post(self, request, *args, **kwargs):
        """Handle Google OAuth login with comprehensive error handling"""
        logger.info("=" * 80)
        logger.info("Google OAuth Login Attempt")
        logger.info("=" * 80)
        
        # 1. Log request metadata
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request path: {request.path}")
        logger.info(f"Content-Type: {request.content_type}")
        logger.info(f"Origin: {request.headers.get('Origin', 'No Origin header')}")
        logger.info(f"User-Agent: {request.headers.get('User-Agent', 'Unknown')}")
        
        # 2. Log request data (without sensitive info)
        logger.info(f"Request data keys: {list(request.data.keys())}")
        has_access_token = 'access_token' in request.data
        has_code = 'code' in request.data
        has_id_token = 'id_token' in request.data
        
        logger.info(f"Has access_token: {has_access_token}")
        logger.info(f"Has code: {has_code}")
        logger.info(f"Has id_token: {has_id_token}")
        
        if not (has_access_token or has_code or has_id_token):
            logger.error("No authentication token provided")
            return Response(
                {
                    "error": "Missing authentication token",
                    "detail": "Please provide one of: access_token, code, or id_token"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. Check Google OAuth configuration
        google_config = settings.SOCIALACCOUNT_PROVIDERS.get('google', {})
        client_id = google_config.get('APP', {}).get('client_id')
        client_secret = google_config.get('APP', {}).get('secret')
        
        if not client_id:
            logger.error("❌ GOOGLE_OAUTH_CLIENT_ID is not configured")
            return Response(
                {
                    "error": "Server misconfiguration",
                    "detail": "Google OAuth client ID not configured"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        if not client_secret:
            logger.error("❌ GOOGLE_OAUTH_CLIENT_SECRET is not configured")
            return Response(
                {
                    "error": "Server misconfiguration",
                    "detail": "Google OAuth client secret not configured"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        logger.info(f"✅ Google Client ID configured (first 20 chars): {client_id[:20]}...")
        logger.info(f"✅ Google Client Secret configured: {'*' * len(client_secret)}")
        
        # 4. Check owner emails configuration
        if not settings.OWNER_EMAILS:
            logger.error("❌ OWNER_EMAILS not configured")
            return Response(
                {
                    "error": "Server misconfiguration",
                    "detail": "Owner emails not configured"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        logger.info(f"✅ Owner emails configured: {settings.OWNER_EMAILS}")
        
        # 5. Log callback URL
        callback = self.callback_url
        logger.info(f"Callback URL: {callback}")
        
        try:
            # 6. Call parent class method
            logger.info("Calling parent SocialLoginView.post()...")
            response = super().post(request, *args, **kwargs)
            
            # 7. Log response
            logger.info(f"Response status code: {response.status_code}")
            
            if response.status_code == 200:
                user_data = response.data.get('user', {})
                user_email = user_data.get('email', 'unknown')
                logger.info(f"✅ Google OAuth login successful")
                logger.info(f"User email: {user_email}")
                logger.info(f"User ID: {user_data.get('pk', 'unknown')}")
                logger.info(f"Token created: {'key' in response.data}")
            else:
                logger.warning(f"⚠️ Non-200 response: {response.status_code}")
                logger.warning(f"Response data: {response.data}")
            
            logger.info("=" * 80)
            return response
            
        except Exception as e:
            # 8. Comprehensive error logging
            logger.error("=" * 80)
            logger.error(f"❌ Google OAuth login exception caught")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Exception message: {str(e)}")
            logger.error(f"Exception args: {e.args}")
            logger.error("Full traceback:")
            logger.error(traceback.format_exc())
            logger.error("=" * 80)
            
            # 9. Build error response
            error_response = {
                "error": "Authentication failed",
                "message": "Please try again"
            }
            
            # Include more details in DEBUG mode
            if settings.DEBUG:
                error_response["debug_info"] = {
                    "exception_type": type(e).__name__,
                    "exception_message": str(e),
                    "has_access_token": has_access_token,
                    "has_code": has_code,
                    "has_id_token": has_id_token,
                    "callback_url": callback,
                }
            else:
                error_response["detail"] = "Please check server logs for more information"
            
            return Response(
                error_response,
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
# DAILY SUMMARY VIEWSET
# ==========================================

class DailySummaryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing Daily Summaries from email ingestion
    - Owner: See all summaries
    - Staff: See only their branch summaries
    """
    queryset = DailySummary.objects.all()
    serializer_class = DailySummarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['branch', 'date', 'source']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        """
        Filter summaries based on user role
        - Owner: sees all
        - Staff: sees only their branch's summaries
        """
        if self.request.user.is_superuser:
            return DailySummary.objects.all()
        
        if self.request.user.assigned_branch:
            return DailySummary.objects.filter(branch=self.request.user.assigned_branch)
        
        return DailySummary.objects.none()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def payment_breakdown(self, request):
        """
        Get aggregated payment breakdown across all summaries
        Useful for dashboard pie chart
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Allow filtering by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Aggregate payment methods
        from django.db.models import Sum
        aggregates = queryset.aggregate(
            total_cash=Sum('cash_amount'),
            total_qris=Sum('qris_amount'),
            total_transfer=Sum('transfer_amount')
        )
        
        return Response({
            'cash': float(aggregates['total_cash'] or 0),
            'qris': float(aggregates['total_qris'] or 0),
            'transfer': float(aggregates['total_transfer'] or 0),
            'total': float(
                (aggregates['total_cash'] or 0) + 
                (aggregates['total_qris'] or 0) + 
                (aggregates['total_transfer'] or 0)
            )
        })


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

class InternalWhatsAppIngestion(APIView):
    # Endpoint ini akan dipanggil oleh Node.js Bot
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        data = request.data
        
        # 1. Identifikasi Staff berdasarkan No HP (sesuai screenshot Security)
        # Pastikan format nomor HP di database konsisten (misal: 628xxx)
        phone = data.get('phone_number')
        staff_user = User.objects.filter(profile__phone_number=phone, is_staff=True).first()
        
        if not staff_user:
            return Response({"error": "Nomor tidak terdaftar sebagai Staff"}, status=400)

        # 2. Catat ke IngestionLog (Safety Net sesuai arsitektur)
        log = IngestionLog.objects.create(
            source="WHATSAPP_INTERNAL",
            raw_data=str(data),
            status="PENDING"
        )

        try:
            # Ambil file gambar dari request (jika ada)
            evidence_file = request.FILES.get('evidence') 

            transaction = Transaction.objects.create(
                user=staff_user,
                branch=branch,
                category=category,
                amount=data.get('amount'),
                description=data.get('notes', '-'),
                payment_method="CASH",
                is_verified=staff_user.is_verified_staff,
                evidence=evidence_file # Simpan file ke database
            )
            
            # Update Log sukses
            log.status = "SUCCESS"
            log.save()
            
            return Response({"message": "Transaksi berhasil disimpan", "id": transaction.id}, status=201)
            
        except Exception as e:
            log.status = "FAILED"
            log.save()
            return Response({"error": str(e)}, status=400)