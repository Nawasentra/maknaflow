from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import IngestionLog, TransactionSource, IngestionStatus
from .serializers import EmailWebhookPayloadSerializer
from .ingestion.email_webhook import EmailWebhookService
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
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
            logger.error(f"Webhook processing failed: {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)