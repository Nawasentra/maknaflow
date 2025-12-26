import pytest
from django.contrib.auth import get_user_model
from app.models import Branch, Transaction, Category, TransactionType, BranchType

User = get_user_model()

@pytest.mark.django_db
def test_model():
    """
    Test the creation and relationships of Branch -> User -> Transaction
    """
    # Create a Branch
    branch = Branch.objects.create(
        name="Laundry Cabang Dago", 
        branch_type=BranchType.LAUNDRY
    )
    assert str(branch) == "Laundry Cabang Dago (Laundry Service)"

    # Create a User (Staff) assigned to the Branch
    staff_user = User.objects.create_user(
        username="staff1",
        email="staff@laundry.com",
        password="securepassword",
        assigned_branch=branch
    )
    assert staff_user.assigned_branch == branch
    assert staff_user.check_password("securepassword") is True

    # Create a Category
    category = Category.objects.create(
        name="Detergent",
        transaction_type=TransactionType.EXPENSE
    )

    # Create a Transaction linked to both
    transaction = Transaction.objects.create(
        branch=branch,
        reported_by=staff_user,
        amount=50000,
        transaction_type=TransactionType.EXPENSE,
        category=category,
        date="2023-10-25",
        description="Bought soap"
    )

    # Verify the links
    assert transaction.branch.name == "Laundry Cabang Dago"
    assert transaction.reported_by.email == "staff@laundry.com"
    
    # Reverse relationship (Branch -> Transactions)
    assert branch.transactions.count() == 1
    assert branch.transactions.first() == transaction