from django.core.management.base import BaseCommand
from django.conf import settings
from app.ingestion.email_ingestion import EmailIngestionService
from app.models import Transaction, IngestionLog, Branch, BranchType
import json

class Command(BaseCommand):
    """
    Django management command for email ingestion
    
    This command:
    1. Connects to IMAP server
    2. Fetches unread emails from owner
    3. Parses and creates transactions
    4. Marks emails as read
    
    Usage:
        python manage.py ingest_emails
        python manage.py ingest_emails --verbose
        python manage.py ingest_emails --dry-run
    """
    
    help = 'Connects to IMAP, fetches unread emails from Owner, and creates transactions'

    def add_arguments(self, parser):
        """
        Define command-line arguments
        This method is called by Django to set up argument parsing
        """
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Fetch and parse emails but do not create transactions (for testing)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output including configuration and recent logs',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output results in JSON format',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of emails to process (useful for testing)',
        )

    def handle(self, *args, **options):
        """
        Main method when the command is executed
        """

        # Show header (except JSON mode)
        if not options['json']:
            self.stdout.write(self.style.SUCCESS("=" * 70))
            self.stdout.write(self.style.SUCCESS("Email Ingestion Service"))
            self.stdout.write(self.style.SUCCESS("=" * 70))
        
        # Show configuration if verbose (and not JSON)
        if options['verbose'] and not options['json']:
            self._show_configuration()
        
        # Check prerequisites (skip in JSON mode)
        if not options['json']:
            self._check_prerequisites(options)
        
        # Show dry-run warning
        if options['dry_run'] and not options['json']:
            self.stdout.write(
                self.style.WARNING("\n⚠️  DRY RUN MODE - No transactions will be created")
            )
        
        # Initialize service
        if not options['json']:
            self.stdout.write("\n🔄 Connecting to IMAP and processing emails...")
        service = EmailIngestionService(
            dry_run=options.get('dry_run', False),
            limit=options.get('limit', None)
        )
        
        # Process emails
        try:
            result = service.fetch_and_process()
            
            if options['json']:
                # Output JSON format
                json_output = self._get_json_results()
                self.stdout.write(json.dumps(json_output, indent=2, ensure_ascii=False))
            else:
                self.stdout.write(self.style.SUCCESS(f"\n✅ {result}"))
                
                # Show results if verbose
                if options['verbose']:
                    self._show_results()
        except Exception as e:
            if options['json']:
                error_output = {
                    "success": False,
                    "error": str(e),
                    "traceback": traceback.format_exc()
                }
                self.stdout.write(json.dumps(error_output, indent=2))
            else:
                self.stdout.write(self.style.ERROR(f"\n❌ Error: {e}"))
                import traceback
                self.stdout.write(traceback.format_exc())
            return

    def _get_json_results(self):
        """Get ingestion results in JSON format"""
        from app.models import Transaction, IngestionLog
        import json
        
        # Get recent transactions
        recent_transactions = Transaction.objects.filter(
            source='EMAIL'
        ).order_by('-created_at')[:10]
        
        # Get recent logs
        recent_logs = IngestionLog.objects.filter(
            source='EMAIL'
        ).order_by('-created_at')[:10]
        
        transactions_data = []
        for trans in recent_transactions:
            transactions_data.append({
                "id": trans.id,
                "date": trans.date.isoformat() if trans.date else None,
                "branch": {
                    "id": trans.branch.id,
                    "name": trans.branch.name,
                    "type": trans.branch.branch_type
                },
                "amount": str(trans.amount),
                "category": {
                    "id": trans.category.id,
                    "name": trans.category.name,
                    "type": trans.category.transaction_type
                },
                "transaction_type": trans.transaction_type,
                "description": trans.description,
                "reported_by": {
                    "id": trans.reported_by.id if trans.reported_by else None,
                    "username": trans.reported_by.username if trans.reported_by else None,
                    "email": trans.reported_by.email if trans.reported_by else None
                } if trans.reported_by else None,
                "is_verified": trans.is_verified,
                "created_at": trans.created_at.isoformat() if trans.created_at else None,
                "source": trans.source
            })
        
        logs_data = []
        for log in recent_logs:
            log_data = {
                "id": log.id,
                "status": log.status,
                "source": log.source,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "raw_payload": {
                    "subject": log.raw_payload.get("subject"),
                    "sender": log.raw_payload.get("sender"),
                    "email_type": log.raw_payload.get("email_type", "SIMPLE"),
                    "parsed_data": log.raw_payload.get("parsed_data"),  # Include parsed data
                    "body_preview": log.raw_payload.get("body", "")[:500] if log.raw_payload.get("body") else None  # Truncate body for readability
                },
                "error_message": log.error_message,
                "transaction_id": log.created_transaction.id if log.created_transaction else None
            }
            
            # If transaction exists, add transaction details
            if log.created_transaction:
                trans = log.created_transaction
                log_data["transaction"] = {
                    "id": trans.id,
                    "date": trans.date.isoformat() if trans.date else None,
                    "branch": trans.branch.name,
                    "amount": str(trans.amount),
                    "category": trans.category.name,
                    "transaction_type": trans.transaction_type
                }
            
            logs_data.append(log_data)
        
        return {
            "success": True,
            "summary": {
                "total_transactions": Transaction.objects.filter(source='EMAIL').count(),
                "total_logs": IngestionLog.objects.filter(source='EMAIL').count(),
                "recent_transactions_count": len(transactions_data),
                "recent_logs_count": len(logs_data)
            },
            "recent_transactions": transactions_data,
            "recent_logs": logs_data
        }

    def _show_configuration(self):
        """Display current configuration"""
        self.stdout.write("\n📧 Configuration:")
        self.stdout.write(f"   IMAP Host: {getattr(settings, 'IMAP_HOST', 'NOT SET')}")
        self.stdout.write(f"   IMAP User: {getattr(settings, 'IMAP_USER', 'NOT SET')}")
        
        # Show owner emails
        owner_emails = getattr(settings, 'OWNER_EMAILS', [])
        if not owner_emails:
            owner_emails = [getattr(settings, 'OWNER_EMAIL', 'NOT SET')]
        
        if len(owner_emails) == 1:
            self.stdout.write(f"   Owner Email: {owner_emails[0]}")
        else:
            self.stdout.write(f"   Owner Emails ({len(owner_emails)}):")
            for email in owner_emails:
                self.stdout.write(f"     - {email}")
        
        password = getattr(settings, 'IMAP_PASSWORD', None)
        if password:
            self.stdout.write(f"   Password: {'*' * min(len(password), 20)}")
        else:
            self.stdout.write(self.style.WARNING("   Password: NOT SET"))

    def _check_prerequisites(self, options=None):
        """Check if required data exists before processing"""
        from app.models import Branch, User
        
        self.stdout.write("\n🔍 Checking prerequisites...")
        
        branches = Branch.objects.all()
        users = User.objects.filter(email__isnull=False)
        
        if branches.count() == 0:
            self.stdout.write(
                self.style.WARNING("   ⚠️  No branches found!")
            )
        else:
            self.stdout.write(f"   ✓ Found {branches.count()} branch(es)")
            # Check verbose option instead of verbosity
            if options and options.get('verbose', False):
                for branch in branches:
                    self.stdout.write(f"     - {branch.name}")
        
        if users.count() == 0:
            self.stdout.write(
                self.style.WARNING("   ⚠️  No users found. Create at least one user first!")
            )
        else:
            self.stdout.write(f"   ✓ Found {users.count()} user(s)")

    def _show_results(self):
        """Display recent transactions and logs"""
        import json
        
        self.stdout.write("\n📊 Recent Results:")
        
        # Show recent transactions
        recent_transactions = Transaction.objects.filter(
            source='EMAIL'
        ).order_by('-created_at')[:5]
        
        if recent_transactions.exists():
            self.stdout.write(f"\n   Recent Transactions ({recent_transactions.count()}):")
            for trans in recent_transactions:
                self.stdout.write(
                    f"     • {trans.date} | {trans.branch.name} | "
                    f"{trans.amount} | {trans.category.name}"
                )
        else:
            self.stdout.write("   No EMAIL transactions found")
        
        # Show recent logs with JSON payload
        recent_logs = IngestionLog.objects.filter(
            source='EMAIL'
        ).order_by('-created_at')[:5]
        
        if recent_logs.exists():
            self.stdout.write(f"\n   Recent Ingestion Logs ({recent_logs.count()}):")
            for log in recent_logs:
                if log.status == 'SUCCESS':
                    style = self.style.SUCCESS
                    icon = "✓"
                elif log.status == 'FAILED':
                    style = self.style.ERROR
                    icon = "✗"
                else:
                    style = self.style.WARNING
                    icon = "⏳"
                
                self.stdout.write(
                    f"     {icon} {style(log.status)} - "
                    f"{log.created_at.strftime('%Y-%m-%d %H:%M')}"
                )
                if log.error_message:
                    self.stdout.write(
                        f"       Error: {log.error_message[:100]}"
                    )
                
                # Show raw payload JSON
                self.stdout.write(f"       Raw Payload JSON:")
                self.stdout.write(
                    json.dumps(log.raw_payload, indent=8, ensure_ascii=False)
                )
        else:
            self.stdout.write("   No ingestion logs found")
        
        # Show recent logs
        recent_logs = IngestionLog.objects.filter(
            source='EMAIL'
        ).order_by('-created_at')[:5]
        
        if recent_logs.exists():
            self.stdout.write(f"\n   Recent Ingestion Logs ({recent_logs.count()}):")
            for log in recent_logs:
                if log.status == 'SUCCESS':
                    style = self.style.SUCCESS
                    icon = "✓"
                elif log.status == 'FAILED':
                    style = self.style.ERROR
                    icon = "✗"
                else:
                    style = self.style.WARNING
                    icon = "⏳"
                
                self.stdout.write(
                    f"     {icon} {style(log.status)} - "
                    f"{log.created_at.strftime('%Y-%m-%d %H:%M')}"
                )
                if log.error_message:
                    self.stdout.write(
                        f"       Error: {log.error_message[:100]}"
                    )
        else:
            self.stdout.write("   No ingestion logs found")