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

        logger.info(f"Processing email - Subject: {subject}, Sender: {sender}")

        if not text_body:
            logger.error("Payload missing 'text_body'")
            raise ValidationError("Payload missing 'text_body'")

        # Detect and parse email type
        email_type, parsed_data = self._detect_and_parse_email(subject, sender, text_body)
        logger.info(f"Detected email type: {email_type}")
        logger.debug(f"Parsed data: {parsed_data}")

        # Find branch
        branch = self._find_branch_from_metadata(parsed_data, email_type, subject)
        logger.info(f"Found/created branch: {branch.name} (ID: {branch.id})")

        # Find user (optional, can be None)
        user = None
        try:
            user = self._find_user_by_email(sender)
            if user:
                logger.info(f"Found user: {user.email} (ID: {user.id})")
        except Exception as e:
            logger.warning("Failed to find user by email '%s': %s", sender, e)

        # Create transactions
        if email_type == "LUNA":
            transactions = self._create_transactions(branch, user, subject, parsed_data, TransactionType.INCOME, "top_products", "LUNA POS")
            logger.info(f"Created {len(transactions)} transactions from Luna")
            return f"Created {len(transactions)} transactions from Luna"
        elif email_type == "HITACHI":
            transactions = self._create_transactions(branch, user, subject, parsed_data, TransactionType.INCOME, "top_items", "Hitachi")
            logger.info(f"Created {len(transactions)} transactions from Hitachi")
            return f"Created {len(transactions)} transactions from Hitachi"
        else:
            logger.info(f"Unknown email type: {email_type}")
            return f"Processed email with unknown type: {email_type}"

    def _detect_and_parse_email(self, subject, sender, body):
        """
        Detect email type and parse accordingly
        """
        body_upper = body.upper()
        subject_upper = subject.upper()
        sender_upper = (sender or "").upper()

        logger.debug(f"Checking email patterns - Subject: {subject_upper}, Sender: {sender_upper}")

        # LUNA detection
        if "LUNA POS" in body_upper or "Fwd: Daily Summary Report" in subject_upper:
            logger.info("Detected LUNA email pattern")
            try:
                parsed = parse_luna_email(body)
                logger.debug(f"LUNA parse successful: {parsed}")
                return "LUNA", parsed
            except Exception as e:
                logger.error(f"Failed to parse LUNA email: {e}", exc_info=True)
                return "LUNA_ERROR", {}

        # HITACHI detection
        if "Fwd: Daily Summary" in subject_upper or "MERCHANT STATEMENT" in body_upper:
            logger.info("Detected HITACHI email pattern")
            try:
                parsed = parse_hitachi_email(body)
                logger.debug(f"HITACHI parse successful: {parsed}")
                return "HITACHI", parsed
            except Exception as e:
                logger.error(f"Failed to parse Hitachi email: {e}", exc_info=True)
                return "HITACHI_ERROR", {}
        
        logger.warning("No matching email pattern found")
        return "UNKNOWN", {}

    def _find_branch_from_metadata(self, parsed_data, email_type, subject_fallback):
        """
        Determine the Branch from parsed metadata or subject
        """
        branch_name = None
        
        logger.debug(f"Finding branch - Email type: {email_type}, Parsed data: {parsed_data}")
        
        # Extract from metadata.location
        if parsed_data:
            metadata = parsed_data.get("metadata", {})
            branch_name = metadata.get("location")
            logger.debug(f"Extracted location from metadata: {branch_name}")
        
        # Fallback to subject if no location in metadata
        if not branch_name and subject_fallback:
            logger.debug(f"No location in metadata, trying subject: {subject_fallback}")
            subject = subject_fallback
            for prefix in ["Fwd:", "FW:", "Re:"]:
                if subject.upper().startswith(prefix.upper()):
                    subject = subject[len(prefix):].strip()
            branch_name = subject.split(":")[0].strip()
            logger.debug(f"Extracted branch from subject: {branch_name}")
        
        if not branch_name:
            logger.error("No branch information found in parsed data or subject")
            raise ValidationError("Parsed data does not contain branch information")
        
        # Clean branch name (remove everything before '|' if present)
        if "|" in branch_name:
            original = branch_name
            branch_name = branch_name.split("|")[-1].strip()
            logger.debug(f"Cleaned branch name: {original} -> {branch_name}")
        
        # Get or create the branch
        branch, created = Branch.objects.get_or_create(
            name=branch_name,
            defaults={'branch_type': BranchType.LAUNDRY}
        )
        
        if created:
            logger.info(f"Created new branch: {branch.name}")
        else:
            logger.debug(f"Found existing branch: {branch.name}")
        
        return branch

    def _find_user_by_email(self, email_addr):
        """
        Find User by email, or return None if not found
        """
        from app.models import User
        logger.debug(f"Looking up user by email: {email_addr}")
        if email_addr:
            try:
                user = User.objects.get(email=email_addr)
                logger.debug(f"Found user: {user.email}")
                return user
            except User.DoesNotExist:
                logger.warning(f"User with email {email_addr} not found")
        return None

    def _create_transactions(self, branch, user, subject, parsed_data, trx_type, items_key, desc_prefix):
        """
        Create Transaction records from parsed data
        """
        logger.debug(f"Creating transactions - Branch: {branch.name}, Items key: {items_key}")
        
        transaction_date = date.today()
        metadata = (parsed_data or {}).get("metadata", {})
        if metadata.get("date"):
            try:
                date_str = str(metadata["date"]).strip()
                logger.debug(f"Parsing date: {date_str}")
                date_formats = [
                    "%A, %B %d, %Y",  # e.g. Tuesday, November 5, 2025
                    "%B %d, %Y",      # e.g. November 5, 2025
                    "%Y-%m-%d",       # e.g. 2025-11-05
                    "%d %B %Y",       # e.g. 31 October 2025
                ]
                for fmt in date_formats:
                    try:
                        transaction_date = datetime.strptime(date_str, fmt).date()
                        logger.debug(f"Successfully parsed date with format {fmt}: {transaction_date}")
                        break
                    except ValueError:
                        continue
            except Exception as e:
                logger.warning("Failed to parse date '%s': %s", metadata.get("date"), e)
        
        transactions = []
        category_cache = {}
        items = (parsed_data or {}).get(items_key, [])
        logger.info(f"Processing {len(items)} items for transactions")
        
        for item in items:
            name = item.get("name")
            amount = int(item.get("amount", 0))
            logger.debug(f"Processing item: {name}, Amount: {amount}")
            
            if not name or not amount:
                logger.debug(f"Skipping item (missing name or zero amount): {item}")
                continue
            
            try:
                cache_key = (name, trx_type)
                category = category_cache.get(cache_key)
                if category is None:
                    category, cat_created = Category.objects.get_or_create(
                        name=name,
                        transaction_type=trx_type
                    )
                    category.branches.add(branch)
                    category_cache[cache_key] = category
                    if cat_created:
                        logger.debug(f"Created new category: {name}")
                    else:
                        logger.debug(f"Found existing category: {name}")
                
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
                logger.debug(f"Created transaction ID {trans.id} for {name}: Rp {amount:,}")
            except Exception as e:
                logger.error(f"Failed to create transaction for item {item}: {e}", exc_info=True)
        
        logger.info(f"Successfully created {len(transactions)} transactions")
        return transactions