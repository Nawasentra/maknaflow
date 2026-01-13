from django.conf import settings
from django.core.exceptions import ValidationError
from datetime import date, datetime
import logging
import re
from app.models import (
    Transaction, Category, Branch, 
    TransactionType, TransactionSource, BranchType
)
from .luna_parser import parse_luna_email
from .hitachi_parser import parse_hitachi_email

logger = logging.getLogger(__name__)

def normalize(text):
    return (text or "").strip().lower()

class EmailWebhookService:
    def process_payload(self, payload):
        """
        Process the email webhook payload and create transactions
        """
        subject = payload.get('subject', '')
        sender = payload.get('sender', '')
        text_body = payload.get('text_body', '')

        if not text_body:
            logger.error("Payload missing 'text_body'")
            raise ValidationError("Payload missing 'text_body'")

        # Detect and parse email type
        email_type, parsed_data = self._detect_and_parse_email(subject, sender, text_body)

        # Ignore non-Luna/Hitachi emails
        if email_type not in ["LUNA", "HITACHI"]:
            logger.info(f"Ignoring non Luna/Hitachi email")
            return "Ignoring non Luna/Hitachi email"

        # Find branch
        branch = self._find_branch_from_metadata(parsed_data, email_type, subject)

        # Find user (optional, can be None)
        user = None
        try:
            user = self._find_user_by_email(sender)
        except Exception as e:
            logger.warning("Failed to find user by email '%s': %s", sender, e)

        # Create transactions
        if email_type == "LUNA":
            transactions = self._create_transactions(branch, user, subject, parsed_data, TransactionType.INCOME, "top_products", "LUNA POS")
            return f"Created {len(transactions)} transactions from Luna"
        elif email_type == "HITACHI":
            transactions = self._create_transactions(branch, user, subject, parsed_data, TransactionType.INCOME, "top_items", "Hitachi")
            return f"Created {len(transactions)} transactions from Hitachi"

    def _detect_and_parse_email(self, subject, sender, body):
        """
        Detect email type and parse accordingly
        """
        body_upper = body.upper()
        subject_upper = subject.upper()
        sender_upper = (sender or "").upper()

        # LUNA detection
        if "LUNA POS" in body_upper or "LUNA POS" in subject_upper or "DAILY REPORT LUNA POS" in body_upper:
            try:
                return "LUNA", parse_luna_email(body)
            except Exception as e:
                logger.warning(f"Failed to parse LUNA email: {e}")

        # HITACHI detection
        if "DAILY SALES SUMMARY" in subject_upper or "MERCHANT STATEMENT" in sender_upper or "HITACHI" in subject_upper or "HITACHI" in body_upper:
            try:
                return "HITACHI", parse_hitachi_email(body)
            except Exception as e:
                logger.warning(f"Failed to parse Hitachi email: {e}")
        return "SIMPLE", {}

    def _find_branch_from_metadata(self, parsed_data, email_type, subject_fallback):
        """
        Determine the Branch from parsed metadata or subject
        """
        branch_name = None
        # Prefer location/location_alias from metadata if available
        if parsed_data:
            metadata = parsed_data.get("metadata", {})
            branch_name = metadata.get("location_alias") or metadata.get("location")
        # Fallback to branch_name in parsed_data
        if not branch_name:
            branch_name = (parsed_data or {}).get("branch_name")
        # Fallback to subject
        if not branch_name and subject_fallback:
            subject = subject_fallback
            for prefix in ["Fwd:", "FW:", "Re:"]:
                if subject.upper().startswith(prefix.upper()):
                    subject = subject[len(prefix):].strip()
            branch_name = subject.split(":")[0].strip()
        if not branch_name:
            raise ValidationError("Parsed data does not contain branch information")
        # If branch_name contains '|', use the last part (after the last '|')
        if "|" in branch_name:
            branch_name = branch_name.split("|")[-1].strip()
        # Try to get or create the branch
        branch, created = Branch.objects.get_or_create(
            name=branch_name,
            defaults={'branch_type': BranchType.LAUNDRY}
        )
        return branch

    def _find_user_by_email(self, email_addr):
        """
        Find User by email, or return None if not found
        """
        from app.models import User
        if email_addr:
            try:
                return User.objects.get(email=email_addr)
            except User.DoesNotExist:
                logger.warning(f"User with email {email_addr} not found")
        return None

    def _create_transactions(self, branch, user, subject, parsed_data, trx_type, items_key, desc_prefix):
        """
        Create Transaction records from parsed data
        """
        transaction_date = date.today()
        metadata = (parsed_data or {}).get("metadata", {})
        if metadata.get("date"):
            try:
                date_str = str(metadata["date"]).strip()
                date_formats = [
                    "%A, %B %d, %Y",      # Monday, January 12, 2026
                    "%B %d, %Y",          # January 12, 2026
                    "%Y-%m-%d",           # 2026-01-12
                    "%d %B %Y",           # 12 January 2026
                ]
                for fmt in date_formats:
                    try:
                        transaction_date = datetime.strptime(date_str, fmt).date()
                        logger.debug(f"Parsed date with format '{fmt}': {transaction_date}")
                        break
                    except ValueError:
                        continue
            except Exception as e:
                logger.warning("Failed to parse date '%s': %s", metadata.get("date"), e)
        transactions = []
        category_cache = {}
        for item in (parsed_data or {}).get(items_key, []):
            name = item.get("name")
            amount = int(item.get("amount", 0))
            if not name or not amount:
                continue
            try:
                cache_key = (name, trx_type)
                category = category_cache.get(cache_key)
                if category is None:
                    category, _ = Category.objects.get_or_create(
                        name=name,
                        transaction_type=trx_type
                    )
                    category.branches.add(branch)
                    category_cache[cache_key] = category
                trans = Transaction.objects.create(
                    branch=branch,
                    reported_by=user,
                    amount=amount,
                    transaction_type=trx_type,
                    category=category,
                    date=transaction_date,
                    description=f"{desc_prefix}: {name} ({subject})",
                    source=TransactionSource.EMAIL,
                )
                transactions.append(trans)
            except Exception as e:
                logger.error(f"Failed to create transaction for item {item}: {e}")
        return transactions