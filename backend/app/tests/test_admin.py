import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory
from app.admin import (
    BranchAdmin, CategoryAdmin, TransactionAdmin, IngestionLogAdmin,
)
from app.models import Branch, Category, Transaction, IngestionLog, User, TransactionType, TransactionSource, IngestionStatus
import types

@pytest.mark.django_db
def test_branch_admin_list_display():
    branch = Branch.objects.create(name="Test", branch_type="LAUNDRY")
    admin = BranchAdmin(Branch, AdminSite())
    assert "name" in admin.list_display
    assert branch.__str__() == "Test (Laundry Service)"

@pytest.mark.django_db
def test_category_admin_get_branches():
    branch = Branch.objects.create(name="Test", branch_type="LAUNDRY")
    category = Category.objects.create(name="Soap", transaction_type=TransactionType.EXPENSE)
    category.branches.add(branch)
    admin = CategoryAdmin(Category, AdminSite())
    result = admin.get_branches(category)
    assert branch.name in result

@pytest.mark.django_db
def test_transaction_admin_actions():
    branch = Branch.objects.create(name="Test", branch_type="LAUNDRY")
    category = Category.objects.create(name="Soap", transaction_type=TransactionType.EXPENSE)
    user = User.objects.create_user(username="u", email="u@x.com", password="x", assigned_branch=branch)
    transaction = Transaction.objects.create(
        branch=branch, reported_by=user, amount=1000, transaction_type=TransactionType.EXPENSE,
        category=category, date="2023-01-01", description="desc", source=TransactionSource.EMAIL
    )
    admin = TransactionAdmin(Transaction, AdminSite())
    assert admin.branch_name(transaction) == branch.name
    assert admin.category_name(transaction) == category.name

@pytest.mark.django_db
def test_ingestionlog_admin_actions():
    branch = Branch.objects.create(name="Test", branch_type="LAUNDRY")
    category = Category.objects.create(name="Soap", transaction_type=TransactionType.EXPENSE)
    user = User.objects.create_user(username="u", email="u@x.com", password="x", assigned_branch=branch)
    transaction = Transaction.objects.create(
        branch=branch, reported_by=user, amount=1000, transaction_type=TransactionType.EXPENSE,
        category=category, date="2023-01-01", description="desc", source=TransactionSource.EMAIL
    )
    log = IngestionLog.objects.create(
        source=TransactionSource.EMAIL, raw_payload={"foo": "bar"}, status=IngestionStatus.FAILED,
        created_transaction=transaction
    )
    admin = IngestionLogAdmin(IngestionLog, AdminSite())
    # Patch message_user to avoid MessageFailure
    admin.message_user = types.MethodType(lambda self, request, message, *a, **k: None, admin)
    assert isinstance(admin.has_error(log), bool)
    assert "foo" in admin.raw_payload_display(log)
    # Test delete_failed_logs and delete_with_transactions using a real request
    queryset = IngestionLog.objects.filter(id=log.id)
    rf = RequestFactory()
    request = rf.get('/')
    admin.delete_failed_logs(request, queryset)
    # Re-create for next test
    log = IngestionLog.objects.create(
        source=TransactionSource.EMAIL, raw_payload={"foo": "bar"}, status=IngestionStatus.FAILED,
        created_transaction=transaction
    )
    queryset = IngestionLog.objects.filter(id=log.id)
    admin.delete_with_transactions(request, queryset)