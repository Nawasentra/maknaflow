from rest_framework import serializers
from .models import Branch, User, Category, Transaction

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
        fields = ['id', 'name', 'transaction_type', 'applicable_branch_type']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number', 'assigned_branch', 'is_verified']

# ==============================================
# 2. MAIN TRANSACTION SERIALIZER
# ==============================================

class TransactionSerializer(serializers.ModelSerializer):
    # FIELD EXPANSION
    # When React reads this, they get 'branch_name': 'Laundry Dago' instead of just 'branch': 1
    # This saves an extra API call
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    reported_by_email = serializers.EmailField(source='reported_by.email', read_only=True)
    reported_by_username = serializers.CharField(source='reported_by.username', read_only=True)
    reported_by_phone = serializers.CharField(source='reported_by.phone_number', read_only=True)

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

            # Expanded Fields (for OUTPUT/GET)
            'branch_name',
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
            'category_name',
            'reported_by_email',
            'reported_by_username',
            'reported_by_phone',
        ]

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