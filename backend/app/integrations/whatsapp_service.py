"""
WhatsApp Integration Service using Twilio
Handles sending and receiving WhatsApp messages
"""
import logging
from twilio.rest import Client
from decouple import config
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


class WhatsAppService:
    """
    Service for WhatsApp integration using Twilio
    """
    
    def __init__(self):
        self.account_sid = config('TWILIO_ACCOUNT_SID', default=None)
        self.auth_token = config('TWILIO_AUTH_TOKEN', default=None)
        self.whatsapp_number = config('TWILIO_WHATSAPP_NUMBER', default=None)  # e.g., 'whatsapp:+1234567890'
        
        if not all([self.account_sid, self.auth_token, self.whatsapp_number]):
            raise ImproperlyConfigured(
                "WhatsApp service requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
                "and TWILIO_WHATSAPP_NUMBER in environment variables"
            )
        
        self.client = Client(self.account_sid, self.auth_token)
    
    def send_message(self, recipient_whatsapp_number: str, message_body: str) -> dict:
        """
        Send a WhatsApp message using Twilio
        
        Args:
            recipient_whatsapp_number: e.g., 'whatsapp:+6281234567890'
            message_body: The message text to send
            
        Returns:
            dict with 'success' and 'message_sid' or 'error'
        """
        try:
            message = self.client.messages.create(
                from_=self.whatsapp_number,
                body=message_body,
                to=recipient_whatsapp_number
            )
            logger.info(f"WhatsApp message sent to {recipient_whatsapp_number}: {message.sid}")
            return {
                'success': True,
                'message_sid': message.sid
            }
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_transaction_confirmation(self, recipient_number: str, transaction_data: dict) -> dict:
        """
        Send transaction confirmation message
        
        Args:
            recipient_number: e.g., 'whatsapp:+6281234567890'
            transaction_data: dict with 'amount', 'category', 'type', 'date'
        """
        message_body = f"""
✅ *Transaksi Tercatat*

Tipe: {transaction_data.get('type', 'Unknown')}
Kategori: {transaction_data.get('category', 'Unknown')}
Jumlah: Rp {transaction_data.get('amount', 0):,.0f}
Tanggal: {transaction_data.get('date', 'Unknown')}

Terima kasih telah melaporkan transaksi!
        """.strip()
        
        return self.send_message(recipient_number, message_body)
    
    def send_help_message(self, recipient_number: str) -> dict:
        """Send help/instructions message"""
        help_text = """
📲 *MaknaFlow WhatsApp Bot*

Untuk melaporkan transaksi, kirim pesan dengan format:

*INCOME* - Untuk Pemasukan
Contoh: INCOME 150000 Layanan Cuci

*EXPENSE* - Untuk Pengeluaran
Contoh: EXPENSE 50000 Bahan Deterjen

Atau kirim gambar struk dengan keterangan.

Butuh bantuan? Ketik: HELP
        """.strip()
        
        return self.send_message(recipient_number, help_text)


# Singleton instance
_whatsapp_service = None

def get_whatsapp_service():
    """Get or create WhatsApp service singleton"""
    global _whatsapp_service
    if _whatsapp_service is None:
        try:
            _whatsapp_service = WhatsAppService()
        except ImproperlyConfigured:
            logger.warning("WhatsApp service not configured. Set required environment variables.")
            return None
    return _whatsapp_service
