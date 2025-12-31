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

        # Find branch
        branch = self._find_branch_from_metadata(parsed_data, email_type, subject)

        # Find user (optional, can be None)
        user = None
        try:
            user = self._find_user_by_email(sender)
        except Exception:
            pass

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
            raise ValidationError("No Branch name found in email or subject")
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
        Find User by email, or return owner user if not found
        """
        from app.models import User
        if email_addr:
            try:
                return User.objects.get(email=email_addr)
            except User.DoesNotExist:
                pass
        owner_emails = getattr(settings, 'OWNER_EMAILS', [])
        if not owner_emails:
            raise User.DoesNotExist("No owner emails configured. Cannot determine user for transaction")
        owner_email = owner_emails[0]
        try:
            return User.objects.get(email=owner_email)
        except User.DoesNotExist:
            username = owner_email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            return User.objects.create_user(
                username=username, email=owner_email, password=None,
                is_active=True, is_staff=True, is_superuser=False
            )

    def _create_transactions(self, branch, user, subject, parsed_data, trx_type, items_key, desc_prefix):
        """
        Create Transaction records from parsed data
        """
        transaction_date = date.today()
        metadata = (parsed_data or {}).get("metadata", {})
        if metadata.get("date"):
            try:
                date_str = metadata["date"]
                # Parse date in "Month Date, year" format
                date_parts = date_str.split(", ")
                if len(date_parts) >= 2:
                    date_str = ", ".join(date_parts[1:])
                    transaction_date = datetime.strptime(date_str, "%B %d, %Y").date()
                else:
                    transaction_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except Exception:
                pass
        transactions = []
        for item in (parsed_data or {}).get(items_key, []):
            name = item.get("name")
            amount = item.get("amount", 0)
            if not name or not amount:
                continue
            category, _ = Category.objects.get_or_create(
                name=name, defaults={'name': name, 'transaction_type': trx_type}
            )
            category.branches.add(branch)
            trans = Transaction.objects.create(
                branch=branch, reported_by=user, amount=amount,
                transaction_type=trx_type, category=category,
                date=transaction_date,
                description=f"{desc_prefix}: {name} ({subject})",
                source=TransactionSource.EMAIL
            )
            transactions.append(trans)
        return transactions

    def _parse_body(self, text):
        """
        Simple parser for SIMPLE email type
        """
        match = re.search(r'(?P<category>\w+)\s*:\s*(?P<amount>\d+)', text)
        if not match:
            raise ValidationError("Invalid Format. Expected 'Category: Amount'")
        cat_name = match.group('category')
        amount = match.group('amount')
        category = Category.objects.filter(
            name__iexact=cat_name,
            transaction_type=TransactionType.EXPENSE
        ).first()
        if not category:
            category = Category.objects.create(
                name=cat_name,
                transaction_type=TransactionType.EXPENSE
            )
        return category, amount