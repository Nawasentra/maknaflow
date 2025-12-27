import pytest
from app.serializers import (
    BranchSerializer,
    CategorySerializer,
    UserSerializer,
    TransactionSerializer,
)
from app.models import Branch, Category, TransactionType, User, Transaction, BranchType
from django.utils import timezone

@pytest.mark.django_db
def test_branch_serializer():
    """
    Test the BranchSerializer for correct serialization of Branch instances
    """
    branch = Branch.objects.create(
        name="Test Branch",
        branch_type=BranchType.LAUNDRY,
        address="Jl. Test",
    )
    serializer = BranchSerializer(branch)
    data = serializer.data
    assert data["name"] == "Test Branch"
    assert data["branch_type"] == BranchType.LAUNDRY
    assert data["address"] == "Jl. Test"

@pytest.mark.django_db
def test_category_serializer():
    """
    Test the CategorySerializer for correct serialization of Category instances
    """
    category = Category.objects.create(
        name="Supplies",
        transaction_type=TransactionType.EXPENSE,
    )
    serializer = CategorySerializer(category)
    data = serializer.data
    assert data["name"] == "Supplies"
    assert data["transaction_type"] == TransactionType.EXPENSE

@pytest.mark.django_db
def test_user_serializer():
    branch = Branch.objects.create(name="Branch", branch_type=BranchType.LAUNDRY)
    user = User.objects.create_user(
        username="user1",
        email="user1@example.com",
        password="pass",
        phone_number="08123456789",
        assigned_branch=branch,
    )
    serializer = UserSerializer(user)
    data = serializer.data
    assert data["username"] == "user1"
    assert data["email"] == "user1@example.com"
    assert data["phone_number"] == "08123456789"
    assert data["assigned_branch"] == branch.id

@pytest.mark.django_db
def test_transaction_serializer():
    """
    Test the TransactionSerializer for correct serialization of Transaction instances including expanded fields
    """
    branch = Branch.objects.create(name="Branch", branch_type=BranchType.LAUNDRY)
    user = User.objects.create_user(username="user2", email="user2@example.com", password="pass", assigned_branch=branch)
    category = Category.objects.create(
        name="IncomeCat",
        transaction_type=TransactionType.INCOME,
    )
    transaction = Transaction.objects.create(
        branch=branch,
        reported_by=user,
        amount=100000,
        transaction_type=TransactionType.INCOME,
        category=category,
        date=timezone.now().date(),
        description="Income test",
    )
    serializer = TransactionSerializer(transaction)
    data = serializer.data
    assert float(data["amount"]) == 100000
    assert data["branch"] == branch.id
    assert data["category"] == category.id
    assert data["reported_by"] == user.id
    assert data["branch_name"] == branch.name
    assert data["category_name"] == category.name
    assert data["reported_by_email"] == user.email
    assert data["reported_by_username"] == user.username
    assert data["reported_by_phone"] == user.phone_number

@pytest.mark.django_db
def test_transaction_serializer_amount_validation():
    """
    Test if TransactionSerializer validates amount correctly
    """
    branch = Branch.objects.create(name="Branch", branch_type=BranchType.LAUNDRY)
    user = User.objects.create_user(username="user3", email="user3@example.com", password="pass", assigned_branch=branch)
    category = Category.objects.create(
        name="ExpenseCat",
        transaction_type=TransactionType.EXPENSE,
    )
    data = {
        "branch": branch.id,
        "reported_by": user.id,
        "amount": -500,
        "transaction_type": TransactionType.EXPENSE,
        "category": category.id,
        "date": timezone.now().date(),
        "description": "Negative amount",
    }
    serializer = TransactionSerializer(data=data)
    assert not serializer.is_valid()
    assert "amount" in serializer.errors

@pytest.mark.django_db
def test_transaction_serializer_category_type_validation():
    """
    Test if TransactionSerializer validates category transaction_type matches transaction_type
    """
    branch = Branch.objects.create(name="Branch", branch_type=BranchType.LAUNDRY)
    user = User.objects.create_user(username="user4", email="user4@example.com", password="pass", assigned_branch=branch)
    category = Category.objects.create(
        name="IncomeCat",
        transaction_type=TransactionType.INCOME,
    )
    data = {
        "branch": branch.id,
        "reported_by": user.id,
        "amount": 1000,
        "transaction_type": TransactionType.EXPENSE,  # Mismatch here
        "category": category.id,
        "date": timezone.now().date(),
        "description": "Type mismatch",
        "source": "WHATSAPP",
    }
    serializer = TransactionSerializer(data=data)
    assert not serializer.is_valid()
    assert "category" in serializer.errors