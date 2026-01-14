"""
WhatsApp Message Parser
Converts WhatsApp messages into transaction data
"""
import re
import logging
from datetime import datetime
from typing import Optional, Dict, Tuple

logger = logging.getLogger(__name__)


class WhatsAppMessageParser:
    """
    Parses WhatsApp messages and extracts transaction information
    Supports formats like:
    - "INCOME 150000 Layanan Cuci"
    - "EXPENSE 50000 Bahan Deterjen"
    """
    
    INCOME_KEYWORDS = ['INCOME', 'INCOME:', 'PEMASUKAN', 'MASUK', '+']
    EXPENSE_KEYWORDS = ['EXPENSE', 'EXPENSE:', 'PENGELUARAN', 'KELUAR', '-']
    
    @staticmethod
    def parse_transaction_message(message: str) -> Optional[Dict]:
        """
        Parse transaction message
        
        Args:
            message: Raw WhatsApp message text
            
        Returns:
            dict with 'transaction_type', 'amount', 'description' or None if invalid
        """
        message = message.strip().upper()
        
        # Check for INCOME
        for keyword in WhatsAppMessageParser.INCOME_KEYWORDS:
            if message.startswith(keyword):
                result = WhatsAppMessageParser._parse_format(message, 'INCOME', keyword)
                if result:
                    return result
        
        # Check for EXPENSE
        for keyword in WhatsAppMessageParser.EXPENSE_KEYWORDS:
            if message.startswith(keyword):
                result = WhatsAppMessageParser._parse_format(message, 'EXPENSE', keyword)
                if result:
                    return result
        
        return None
    
    @staticmethod
    def _parse_format(message: str, transaction_type: str, keyword: str) -> Optional[Dict]:
        """
        Parse specific transaction format
        Format: KEYWORD AMOUNT DESCRIPTION
        """
        # Remove keyword
        remaining = message[len(keyword):].strip()
        
        # Extract amount (first number found)
        amount_match = re.search(r'(\d+(?:[.,]\d{2})?)', remaining)
        if not amount_match:
            return None
        
        amount_str = amount_match.group(1).replace(',', '.').replace('.', '')
        try:
            amount = int(amount_str)
        except ValueError:
            return None
        
        # Extract description (text after amount)
        description_start = remaining[amount_match.end():].strip()
        description = description_start if description_start else 'No description'
        
        return {
            'transaction_type': transaction_type,
            'amount': amount,
            'description': description,
            'date': datetime.now().date()
        }
    
    @staticmethod
    def extract_phone_number(incoming_message_data: dict) -> Optional[str]:
        """
        Extract sender's WhatsApp number from Twilio webhook
        
        Args:
            incoming_message_data: dict from request.POST (Twilio webhook)
            
        Returns:
            Phone number like 'whatsapp:+6281234567890' or None
        """
        from_number = incoming_message_data.get('From')
        if from_number and from_number.startswith('whatsapp:'):
            return from_number
        return None
    
    @staticmethod
    def is_media_message(incoming_message_data: dict) -> bool:
        """
        Check if message contains media (image of receipt)
        """
        num_media = int(incoming_message_data.get('NumMedia', 0))
        return num_media > 0
    
    @staticmethod
    def get_media_url(incoming_message_data: dict, media_index: int = 0) -> Optional[str]:
        """
        Get media URL from Twilio webhook
        """
        num_media = int(incoming_message_data.get('NumMedia', 0))
        if num_media > media_index:
            return incoming_message_data.get(f'MediaUrl{media_index}')
        return None


def validate_transaction_data(data: dict) -> Tuple[bool, Optional[str]]:
    """
    Validate parsed transaction data
    
    Returns:
        (is_valid, error_message)
    """
    if not data:
        return False, "Invalid message format"
    
    if data.get('amount', 0) <= 0:
        return False, "Amount must be greater than 0"
    
    if data.get('transaction_type') not in ['INCOME', 'EXPENSE']:
        return False, "Transaction type must be INCOME or EXPENSE"
    
    return True, None
