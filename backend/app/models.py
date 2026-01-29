from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

# ==========================================
# 1. ABSTRACT MODELS (Utilities)
# ==========================================

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

# ==========================================
# 2. ENUMS & CONSTANTS
# ==========================================

class BranchType(models.TextChoices):
    LAUNDRY = 'LAUNDRY', 'Laundry Service'
    CARWASH = 'CARWASH', 'Car Wash'
    KOS = 'KOS', 'Kos'
    OTHER = 'OTHER', 'Other Business'
    GENERAL = 'GENERAL', 'General / Owner'

class TransactionType(models.TextChoices):
    INCOME = 'INCOME', 'Income'
    EXPENSE = 'EXPENSE', 'Expense'

class TransactionSource(models.TextChoices):
    WHATSAPP = 'WHATSAPP', 'WhatsApp Bot'
    EMAIL = 'EMAIL', 'Email Report'
    MANUAL = 'MANUAL', 'Manual Entry by Owner'

class IngestionStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Processing'
    SUCCESS = 'SUCCESS', 'Successfully Parsed'
    FAILED = 'FAILED', 'Parsing Failed'

class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Cash'
    QRIS = 'QRIS', 'QRIS'
    TRANSFER = 'TRANSFER', 'Transfer'

# ==========================================
# 3. DOMAIN MODELS
# ==========================================

class Branch(TimeStampedModel):
    name = models.CharField(max_length=100)
    branch_type = models.CharField(
        max_length=20,
        choices=BranchType.choices,
        default=BranchType.LAUNDRY
    )
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.get_branch_type_display()})"

    class Meta:
        verbose_name_plural = "Branches"


class User(AbstractUser):
    # Menggunakan ManyToManyField agar user bisa memegang banyak cabang sekaligus
    assigned_branches = models.ManyToManyField(
        Branch,
        related_name='staff_members',
        blank=True,
        help_text="Cabang-cabang yang bisa diakses oleh user ini."
    )
    
    is_verified = models.BooleanField(
        default=False,
        help_text="If True, transactions from this staff auto-approve without owner verification"
    )
    
    # Jabatan opsional
    jabatan = models.CharField(max_length=50, default='Staff', blank=True)
    
    def __str__(self):
        return self.email or self.username

class StaffIdentity(TimeStampedModel):
    """
    Tabel Identitas (Nomor HP / LID)
    Memungkinkan 1 User punya banyak nomor (misal: 1 HP Android, 1 HP iPhone/LID)
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='identities')
    
    # Diisi: "628123..." ATAU "12345@lid"
    identifier = models.CharField(
        max_length=100, 
        unique=True, 
        help_text="Masukkan Nomor WA (628...) atau ID LID (...@lid)"
    )
    
    description = models.CharField(max_length=50, blank=True, help_text="Contoh: HP Pribadi, Laptop Kantor")

    def __str__(self):
        return f"{self.identifier} - {self.user.first_name}"


class Category(TimeStampedModel):
    name = models.CharField(max_length=50)
    transaction_type = models.CharField(choices=TransactionType.choices, max_length=10)
    
    branches = models.ManyToManyField(
        'Branch',
        related_name='categories',
        blank=True,
        help_text="Branches that use this category"
    )

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return f"{self.name} ({self.transaction_type})"

class IngestionLog(TimeStampedModel):
    source = models.CharField(max_length=20, choices=TransactionSource.choices)
    raw_payload = models.JSONField(help_text="The full JSON received from the webhook")
    status = models.CharField(max_length=20, choices=IngestionStatus.choices, default=IngestionStatus.PENDING)
    error_message = models.TextField(blank=True, null=True)
    
    created_transaction = models.ForeignKey(
        'Transaction', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='ingestion_logs'
    )

    def __str__(self):
        return f"Log #{self.id} - {self.source} - {self.status}"

class Transaction(TimeStampedModel):
    branch = models.ForeignKey(
        'Branch',
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    
    reported_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions_reported', help_text="Staff who reported this transaction via WhatsApp")
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether this transaction is verified (auto-verified if from verified staff)"
    )
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    category = models.ForeignKey('Category', on_delete=models.CASCADE)
    date = models.DateField(help_text="The actual date of transaction")
    description = models.TextField(blank=True)
    payment_method = models.CharField(
        max_length=10, 
        choices=PaymentMethod.choices, 
        blank=True
    )

    is_valid = models.BooleanField(default=True)
    voided_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='voided_transactions')
    voided_at = models.DateTimeField(null=True, blank=True)
    
    source = models.CharField(
        max_length=20, 
        choices=TransactionSource.choices
    )
    source_identifier = models.CharField(
        max_length=100,
        blank=True,
        help_text="WhatsApp phone number that sent the data"
    )
    evidence_image = models.ImageField(upload_to='receipts/%Y/%m/', blank=True, null=True)

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date', 'branch']),
            models.Index(fields=['is_verified', 'date']),
            models.Index(fields=['reported_by']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['branch', 'date', 'amount', 'transaction_type', 'category', 'source', 'source_identifier'],
                name='unique_transaction_per_source'
            ),
        ]

    def __str__(self):
        status = "✓" if self.is_verified else "⏳"
        return f"{status} {self.date} - {self.branch.name} - {self.amount}"
    
    def save(self, *args, **kwargs):
        if not self.pk and self.reported_by and self.reported_by.is_verified:
            self.is_verified = True
        super().save(*args, **kwargs)

class DailySummary(TimeStampedModel):
    branch = models.ForeignKey(
        'Branch',
        on_delete=models.CASCADE,
        related_name='daily_summaries'
    )
    date = models.DateField(help_text="Date of the sales summary")
    source = models.CharField(
        max_length=20,
        choices=TransactionSource.choices,
        help_text="Email source: Luna or Hitachi"
    )
    
    gross_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_collected = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    cash_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    qris_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transfer_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    raw_data = models.JSONField(
        blank=True,
        null=True,
        help_text="Full parsed data from email (top products, categories, etc.)"
    )
    
    ingestion_log = models.ForeignKey(
        'IngestionLog',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_summaries'
    )

    class Meta:
        verbose_name_plural = "Daily Summaries"
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date', 'branch']),
            models.Index(fields=['source', 'date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['branch', 'date', 'source'],
                name='unique_daily_summary'
            ),
        ]

    def __str__(self):
        return f"{self.date} - {self.branch.name} - {self.source} - Rp {self.total_collected:,}"