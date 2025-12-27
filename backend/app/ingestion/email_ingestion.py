import imaplib, email, re, logging
from datetime import datetime
from email.header import decode_header
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from app.models import (
    Branch, User, Category, Transaction, IngestionLog,
    TransactionType, TransactionSource, IngestionStatus,
)
from app.ingestion.luna_parser import parse_luna_email
from app.ingestion.hitachi_parser import parse_hitachi_email

logger = logging.getLogger(__name__)

# Email Ingestion Service Class
class EmailIngestionService:
    def __init__(self):
        self.host = settings.IMAP_HOST
        self.user = settings.IMAP_USER
        self.password = settings.IMAP_PASSWORD
        self.owner_emails = [e.strip() for e in getattr(settings, 'OWNER_EMAILS', []) if e.strip()]

    # Connect to IMAP server
    def connect(self):
        try:
            self.mail = imaplib.IMAP4_SSL(self.host)
            self.mail.login(self.user, self.password)
            return True
        except Exception as e:
            logger.error(f"IMAP Connection Failed: {e}")
            return False

    # Close IMAP connection
    def close(self):
        try:
            self.mail.close()
            self.mail.logout()
        except:
            pass

    # Build search criteria for unread emails from owner emails
    def _build_search_criteria(self):
        if not self.owner_emails:
            return '(UNSEEN)'
        if len(self.owner_emails) == 1:
            return f'(UNSEEN FROM "{self.owner_emails[0]}")'
        from_parts = ' '.join([f'FROM "{email}"' for email in self.owner_emails])
        return f'(UNSEEN (OR {from_parts}))'

    # Fetch and process emails
    def fetch_and_process(self):
        if not self.connect():
            return "Connection Failed"
        try:
            self.mail.select("inbox")
            status, messages = self.mail.search(None, self._build_search_criteria())
            if status != "OK":
                return "Search Failed"
            email_ids = messages[0].split()
            processed, failed = 0, 0
            for e_id in email_ids:
                try:
                    _, msg_data = self.mail.fetch(e_id, "(RFC822)")
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            if self._process_single_email(msg, e_id):
                                processed += 1
                            else:
                                failed += 1
                except Exception as e:
                    logger.error(f"Error processing email ID {e_id.decode()}: {e}")
                    failed += 1
            return f"Successfully processed {processed} emails. Failed: {failed}."
        except Exception as e:
            logger.error(f"Ingestion Loop Error: {e}")
            return f"Error: {e}"
        finally:
            self.close()

    # Process a single email message
    def _process_single_email(self, msg, email_id):
        subject = self._decode_subject(msg["Subject"])
        body = self._get_email_body(msg)
        sender = msg.get("From")

        if not body:
            logger.warning(f"Could not extract email body from email ID {email_id.decode()}")
            return False
        
        log = IngestionLog.objects.create(
            source=TransactionSource.EMAIL,
            raw_payload={"subject": subject, "sender": sender, "body": body},
            status=IngestionStatus.PENDING
        )

        try:
            email_type, parsed_data = self._detect_and_parse_email(body)
            log.raw_payload.update({"email_type": email_type, "parsed_data": parsed_data})
            log.save()
            branch = self._find_branch_from_metadata(parsed_data or {}, email_type, subject)
            user = self._find_user_by_email(self._extract_email_from_sender(sender))
            
            if email_type == "LUNA":
                trans = self._create_transactions(branch, user, subject, parsed_data, log, TransactionType.INCOME, "top_products", "LUNA POS")
            elif email_type == "HITACHI":
                trans = self._create_transactions(branch, user, subject, parsed_data, log, TransactionType.INCOME, "top_items", "Hitachi")
            else:
                category, amount = self._parse_body(body)
                trans = [Transaction.objects.create(
                    branch=branch, reported_by=user, amount=amount,
                    transaction_type=TransactionType.EXPENSE, category=category,
                    date=timezone.localtime(log.created_at).date(),
                    description=f"Via Email: {subject}", source=TransactionSource.EMAIL
                )]

            log.status = IngestionStatus.SUCCESS
            log.created_transaction = trans[0] if isinstance(trans, list) and trans else None
            log.save()

            try:
                self.mail.store(email_id, "+FLAGS", "\\Seen")
            except Exception as e:
                logger.warning(f"Failed to mark email as read: {e}")
            return True
        
        except Exception as e:
            log.status = IngestionStatus.FAILED
            log.error_message = str(e)
            log.save()
            logger.error(f"Parsing Error for Log {log.id}: {e}")
            return False

    # Find business branch from parsed metadata
    def _find_branch_from_metadata(self, parsed_data, email_type, subject_fallback):
        branch_name = (parsed_data or {}).get("branch_name")
        if not branch_name and subject_fallback:
            branch_name = subject_fallback.split(":")[0].strip()
        if not branch_name:
            raise ValidationError("No Branch name found in email or subject.")
        try:
            return Branch.objects.get(name__iexact=branch_name)
        except Branch.DoesNotExist:
            raise ValidationError(f"No Branch name found matching '{branch_name}'")

    # Detect email type and parse accordingly
    def _detect_and_parse_email(self, body):
        body_upper = body.upper()
        if "LUNA POS" in body_upper or "DAILY REPORT LUNA POS" in body_upper:
            try:
                return "LUNA", parse_luna_email(body)
            except Exception as e:
                logger.warning(f"Failed to parse LUNA email: {e}")
        if "DAILY SALES SUMMARY" in body_upper or "MERCHANT STATEMENT" in body_upper:
            try:
                return "HITACHI", parse_hitachi_email(body)
            except Exception as e:
                logger.warning(f"Failed to parse Hitachi email: {e}")
        return "SIMPLE", {}

    # Create transactions from parsed data
    def _create_transactions(self, branch, user, subject, parsed_data, log, trx_type, items_key, desc_prefix):
        transaction_date = log.created_at.date()
        metadata = (parsed_data or {}).get("metadata", {})
        if metadata.get("date"):
            try:
                date_str = metadata["date"]
                if items_key == "top_products":
                    date_parts = date_str.split(", ")
                    if len(date_parts) >= 2:
                        date_str = ", ".join(date_parts[1:])
                        transaction_date = datetime.strptime(date_str, "%B %d, %Y").date()
                else:
                    transaction_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except:
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

    # Parse simple body format
    def _parse_body(self, text):
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

    # Extract email address from sender string
    def _extract_email_from_sender(self, sender_string):
        if not sender_string:
            return None
        match = re.search(r'<([^>]+)>', sender_string)
        return match.group(1) if match else sender_string.strip()

    # Find or create user by email
    def _find_user_by_email(self, email_addr):
        if email_addr:
            try:
                return User.objects.get(email=email_addr)
            except User.DoesNotExist:
                pass

        if not self.owner_emails:
            raise User.DoesNotExist("No owner emails configured. Cannot determine user for transaction.")
        
        owner_email = self.owner_emails[0]
        
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

    # Decode email subject
    def _decode_subject(self, subject):
        if not subject:
            return ""
        decoded_list = decode_header(subject)
        subject_str = ""
        for text, encoding in decoded_list:
            if isinstance(text, bytes):
                try:
                    subject_str += text.decode(encoding if encoding else "utf-8")
                except Exception:
                    subject_str += text.decode("utf-8", errors="replace")
            else:
                subject_str += text
        return subject_str

    # Extract email body text
    def _get_email_body(self, msg):
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition") or ""):
                    payload = part.get_payload(decode=True)
                    charset = part.get_content_charset() or "utf-8"
                    try:
                        return (payload or b"").decode(charset, errors="replace").strip()
                    except Exception:
                        continue
        else:
            if msg.get_content_type() == "text/plain":
                payload = msg.get_payload(decode=True)
                charset = msg.get_content_charset() or "utf-8"
                try:
                    return (payload or b"").decode(charset, errors="replace").strip()
                except Exception:
                    pass
        return ""

    # Find branch by name
    def _find_branch(self, text):
        if not text:
            raise ValidationError("No Branch name found")
        for branch in Branch.objects.all():
            if branch.name.lower() in text.lower():
                return branch
        raise ValidationError("No Branch name found")

    # Find user by email
    def _find_user(self, email_addr):
        if not email_addr:
            raise User.DoesNotExist("No email provided")
        return User.objects.get(email=email_addr)