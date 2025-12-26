from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

# ==========================================
# 1. ABSTRACT MODELS (Utilities)
# ==========================================

class TimeStampedModel(models.Model):
    """
    Abstract base class that provides self-updating 'created_at' and 'updated_at' fields
    """
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at'] # Default ordering by creation datetime

# ==========================================
# 2. ENUMS & CONSTANTS
# ==========================================

class BranchType(models.TextChoices):
    LAUNDRY = 'LAUNDRY', 'Laundry Service'
    CARWASH = 'CARWASH', 'Car Wash'
    KOS = 'KOS', 'Kos'
    OTHER = 'OTHER', 'Other Business'

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

# ==========================================
# 3. DOMAIN MODELS
# ==========================================

class Branch(TimeStampedModel):
    """
    Representation of a physical business location or branch
    """
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
    """
    Custom User Model
    - Owner: is_superuser=True
    - Staff: regular users with phone numbers for WhatsApp reporting
    """
    phone_number = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        unique=True,
        help_text="Staff's WhatsApp number for transaction reporting"
    )
    assigned_branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_members',
        help_text="Branch where this staff member works (null for owner)"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="If True, transactions from this staff auto-approve without owner verification"
    )
    
    def __str__(self):
        return self.email or self.username


class Category(TimeStampedModel):
    """
    Financial categories (e.g., 'Detergent', 'Electricity')
    """
    name = models.CharField(max_length=50)
    transaction_type = models.CharField(choices=TransactionType.choices, max_length=10)
    
    # If a category is specific to a branch type (e.g., specific soap for Carwash)
    applicable_branch_type = models.CharField(
        max_length=20, 
        choices=BranchType.choices, 
        blank=True, 
        null=True
    )

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return f"{self.name} ({self.transaction_type})"

class IngestionLog(TimeStampedModel):
    """
    Stores the raw data from Webhooks (Mailgun/WhatsApp)
    Functions as a safety net
    """
    source = models.CharField(max_length=20, choices=TransactionSource.choices)
    raw_payload = models.JSONField(help_text="The full JSON received from the webhook")
    status = models.CharField(max_length=20, choices=IngestionStatus.choices, default=IngestionStatus.PENDING)
    error_message = models.TextField(blank=True, null=True)
    
    # Link to the transaction if created successfully
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
    """
    Records for income and expenses with verifications
    """
    branch = models.ForeignKey(
        Branch, 
        on_delete=models.CASCADE, 
        related_name='transactions'
    )
    
    # Tracking
    reported_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions_reported',
        help_text="Staff who reported this transaction via WhatsApp"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether this transaction is verified (auto-verified if from verified staff)"
    )
    
    # Transaction details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    date = models.DateField(help_text="The actual date of transaction")
    description = models.TextField(blank=True)

    # Field for marking transaction as void/cancelled
    is_valid = models.BooleanField(default=True)  # True = Dihitung, False = Dianggap batal
    
    # Log siapa yang membatalkan
    voided_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='voided_transactions')
    voided_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata for ingestion
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

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date', 'branch']),
            models.Index(fields=['is_verified', 'date']),
            models.Index(fields=['reported_by']),
        ]

    def __str__(self):
        status = "✓" if self.is_verified else "⏳"
        return f"{status} {self.date} - {self.branch.name} - {self.amount}"
    
    def save(self, *args, **kwargs):
        """
        Auto-approve transactions if it's from verified staff
        """
        if not self.pk and self.reported_by and self.reported_by.is_verified:
            self.is_verified = True
        super().save(*args, **kwargs)