from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from datetime import date, datetime
import logging
import re
from app.models import (
    Transaction, Category, Branch, DailySummary,
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

        # Create daily summary AND individual transactions
        if email_type == "LUNA":
            summary = self._create_luna_summary(branch, user, subject, parsed_data)
            transactions = self._create_transactions(branch, user, subject, parsed_data, TransactionType.INCOME, "top_products", "Luna POS")
            logger.info(f"Created Luna summary + {len(transactions)} transactions")
            return f"Created Luna summary + {len(transactions)} transactions"
        elif email_type == "HITACHI":
            summary = self._create_hitachi_summary(branch, user, subject, parsed_data)
            transactions = self._create_transactions(branch, user, subject, parsed_data, TransactionType.INCOME, "top_items", "Hitachi")
            logger.info(f"Created Hitachi summary + {len(transactions)} transactions")
            return f"Created Hitachi summary + {len(transactions)} transactions"
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

    def _create_luna_summary(self, branch, user, subject, parsed_data):
        """
        Create DailySummary from Luna email
        """
        logger.debug(f"Creating Luna summary - Branch: {branch.name}")
        
        transaction_date = self._parse_date(parsed_data.get("metadata", {}))
        summary_data = parsed_data.get("summary", {})
        payments = parsed_data.get("payments", {})
        
        try:
            summary, created = DailySummary.objects.update_or_create(
                branch=branch,
                date=transaction_date,
                source=TransactionSource.EMAIL,
                defaults={
                    'gross_sales': summary_data.get("gross_sales", 0),
                    'total_discount': summary_data.get("total_discount", 0),
                    'net_sales': summary_data.get("net_sales", 0),
                    'total_tax': summary_data.get("total_tax", 0),
                    'total_collected': summary_data.get("total_collected", 0),
                    'cash_amount': payments.get("cash", 0),
                    'qris_amount': payments.get("qris", 0),
                    'transfer_amount': payments.get("transfer", 0),
                    'raw_data': parsed_data,
                }
            )
            
            action = "Created" if created else "Updated"
            logger.info(f"{action} Luna summary ID {summary.id} for {transaction_date}")
            return summary
            
        except Exception as e:
            logger.error(f"Failed to create Luna summary: {e}", exc_info=True)
            raise

    def _create_hitachi_summary(self, branch, user, subject, parsed_data):
        """
        Create DailySummary from Hitachi email
        """
        logger.debug(f"Creating Hitachi summary - Branch: {branch.name}")
        
        transaction_date = self._parse_date(parsed_data.get("metadata", {}))
        summary_data = parsed_data.get("summary", {})
        
        try:
            summary, created = DailySummary.objects.update_or_create(
                branch=branch,
                date=transaction_date,
                source=TransactionSource.EMAIL,
                defaults={
                    'gross_sales': summary_data.get("gross_sales", 0),
                    'total_discount': summary_data.get("total_discount", 0),
                    'net_sales': summary_data.get("net_sales", 0),
                    'total_tax': summary_data.get("total_tax", 0),
                    'total_collected': summary_data.get("total_collected", 0),
                    'cash_amount': 0,
                    'qris_amount': 0,  # Hitachi doesn't provide payment breakdown
                    'transfer_amount': 0,
                    'raw_data': parsed_data,
                }
            )
            
            action = "Created" if created else "Updated"
            logger.info(f"{action} Hitachi summary ID {summary.id} for {transaction_date}")
            return summary
            
        except Exception as e:
            logger.error(f"Failed to create Hitachi summary: {e}", exc_info=True)
            raise

    def _parse_date(self, metadata):
        """
        Extract and parse date from metadata
        """
        transaction_date = date.today()
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
                logger.warning(f"Failed to parse date: {e}")
        return transaction_date

    def _create_transactions(self, branch, user, subject, parsed_data, trx_type, items_key, desc_prefix):
        """
        Create Transaction records from parsed data
        """
        logger.debug(f"Creating transactions - Branch: {branch.name}, Items key: {items_key}")
        
        transaction_date = self._parse_date(parsed_data.get("metadata", {}))
        
        transactions = []
        duplicates = 0
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
            except IntegrityError:
                duplicates += 1
                logger.warning(f"Duplicate transaction skipped for {name}: Rp {amount:,} on {transaction_date}")
                continue
            except Exception as e:
                logger.error(f"Failed to create transaction for item {item}: {e}", exc_info=True)
        
        logger.info(f"Successfully created {len(transactions)} transactions ({duplicates} duplicates skipped)")
        return transactions