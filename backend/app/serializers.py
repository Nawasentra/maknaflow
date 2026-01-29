from rest_framework import serializers
from .models import Branch, User, Category, Transaction, IngestionLog, DailySummary, StaffIdentity

# ==============================================
# 1. REFERENCE SERIALIZERS
# Simple serializers used for dropdowns or simple lists
# ==============================================

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'branch_type', 'address']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'transaction_type']

class StaffIdentitySerializer(serializers.ModelSerializer):
    """
    Serializer untuk model StaffIdentity baru.
    Menggantikan UserPhoneNumber, UserLineID, dll.
    """
    class Meta:
        model = StaffIdentity
        fields = ['id', 'identifier', 'description']


class UserSerializer(serializers.ModelSerializer):
    """
    Updated User Serializer for Ultimate Model.
    - assigned_branches: List of Branch objects (Many-to-Many)
    - identities: List of phone numbers/LIDs
    """
    assigned_branches = BranchSerializer(many=True, read_only=True)
    identities = StaffIdentitySerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_verified', 'jabatan', 
            'assigned_branches', 'identities'
        ]

# ==============================================
# 2. MAIN TRANSACTION SERIALIZER
# ==============================================

class TransactionSerializer(serializers.ModelSerializer):
    # FIELD EXPANSION
    # When React reads this, they get 'branch_name': 'Laundry Dago' instead of just 'branch': 1
    # This saves an extra API call
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_type = serializers.CharField(source='branch.branch_type', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    reported_by_email = serializers.EmailField(source='reported_by.email', read_only=True)
    reported_by_username = serializers.CharField(source='reported_by.username', read_only=True)
    # Custom method to get phone number because User no longer has direct phone_number field
    reported_by_phone = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            # IDs (for INPUT/POST)
            'id',
            'branch',
            'category',
            'reported_by',

            # Data Fields
            'date',
            'amount',
            'transaction_type',
            'description',
            'source',
            'source_identifier',
            'evidence_image',
            'is_verified',
            'payment_method',

            # Expanded Fields (for OUTPUT/GET)
            'branch_name',
            'branch_type',
            'category_name',
            'reported_by_email',
            'reported_by_username',
            'reported_by_phone',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'is_verified',
            'created_at',
            'updated_at',
            'branch_name',
            'branch_type',
            'category_name',
            'reported_by_email',
            'reported_by_username',
            'reported_by_phone',
        ]
    
    def get_reported_by_phone(self, obj):
        """
        Helper to fetch the first available identity (phone number) from the user
        """
        if obj.reported_by and obj.reported_by.identities.exists():
            return obj.reported_by.identities.first().identifier
        return None

    def validate_amount(self, value):
        """
        Validation to ensure the transaction amount is positive
        """
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value

    def validate(self, data):
        """
        Object-level validation
        Check if the Category matches the Transaction Type
        """
        category = data.get('category')
        transaction_type = data.get('transaction_type')

        # Only validate if both are present (might be partial update)
        if category and transaction_type:
            if category.transaction_type != transaction_type:
                raise serializers.ValidationError({
                    "category": f"Category '{category.name}' belongs to {category.transaction_type}, but this transaction is {transaction_type}"
                })
        return data

    def create(self, validated_data):
        """
        Optionally attach the reporting user if provided in context
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            # If not explicitly set, set reported_by to current user
            if 'reported_by' not in validated_data or validated_data['reported_by'] is None:
                validated_data['reported_by'] = request.user
        return super().create(validated_data)

# ==============================================
# 3. INGESTION LOG SERIALIZER
# ==============================================

class IngestionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngestionLog
        fields = [
            'id',
            'source',
            'status',
            'error_message',
            'created_at',
            'created_transaction',
        ]
        read_only_fields = [
            'id',
            'created_at',
        ]


# ==============================================
# 4. WEBHOOK PAYLOAD SERIALIZERS
# ==============================================

class EmailWebhookPayloadSerializer(serializers.Serializer):
    """
    Serializer for validating email webhook payloads from Make.com
    """
    sender = serializers.EmailField(required=False)
    subject = serializers.CharField(required=False)
    text_body = serializers.CharField(required=False)
    # Added flexibility for other fields if needed
    recipient = serializers.CharField(required=False)


class WhatsAppWebhookPayloadSerializer(serializers.Serializer):
    """
    Serializer for validating WhatsApp webhook payloads
    """
    branch_id = serializers.CharField() # Changed to CharField to accept Names or IDs
    phone_number = serializers.CharField(max_length=100)
    message = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    amount = serializers.IntegerField(required=False)
    type = serializers.CharField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

# ==============================================
# 5. DAILY SUMMARY SERIALIZER
# ==============================================

class DailySummarySerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_type = serializers.CharField(source='branch.branch_type', read_only=True)
    
    class Meta:
        model = DailySummary
        fields = [
            'id',
            'branch',
            'branch_name',
            'branch_type',
            'date',
            'source',
            
            # Summary totals
            'gross_sales',
            'total_discount',
            'net_sales',
            'total_tax',
            'total_collected',
            
            # Payment breakdown
            'cash_amount',
            'qris_amount',
            'transfer_amount',
            
            # Metadata
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'branch_name',
            'branch_type',
            'created_at',
            'updated_at',
        ]
