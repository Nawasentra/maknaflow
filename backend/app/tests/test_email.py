# unit tests for email_webhook.py

import pytest
from unittest.mock import patch, MagicMock
from django.core.exceptions import ValidationError
from app.ingestion.email_webhook import EmailWebhookService
from app.models import Branch, Category, TransactionType, BranchType, Transaction, User

@pytest.fixture
def test_branch(db):
    return Branch.objects.create(name="Test Branch", branch_type=BranchType.LAUNDRY)

@pytest.fixture
def test_user(db, test_branch):
    return User.objects.create_user(
        username="owner",
        email="owner@test.com",
        password="testpass"
    )

@pytest.fixture
def test_category(db):
    return Category.objects.create(
        name="Detergent",
        transaction_type=TransactionType.EXPENSE
    )

@pytest.fixture
def webhook_service():
    return EmailWebhookService()

@pytest.mark.django_db
def test_process_payload_luna_success(webhook_service, test_branch, test_user, monkeypatch):
    Category.objects.all().delete()
    payload = {
        "sender": test_user.email,
        "subject": "LUNA POS Daily Report",
        "text_body": "LUNA POS ..."
    }
    monkeypatch.setattr("app.ingestion.email_webhook.parse_luna_email", lambda x: {
        "metadata": {"location_alias": "Test Branch", "date": "November 5, 2025"},
        "top_products": [{"name": "Cuci Kering", "amount": 10000}]
    })
    monkeypatch.setattr(EmailWebhookService, "_find_user_by_email", lambda self, email: test_user)
    result = webhook_service.process_payload(payload)
    assert "Created 1 transactions from Luna" in result
    assert Transaction.objects.filter(category__name="Cuci Kering").exists()

@pytest.mark.django_db
def test_process_payload_hitachi_success(webhook_service, test_branch, test_user, monkeypatch):
    Category.objects.all().delete()
    payload = {
        "sender": test_user.email,
        "subject": "Daily Sales Summary",
        "text_body": "HITACHI ..."
    }
    monkeypatch.setattr("app.ingestion.email_webhook.parse_hitachi_email", lambda x: {
        "metadata": {"location_alias": "Test Branch", "date": "November 5, 2025"},
        "top_items": [{"name": "Soap", "amount": 20000}]
    })
    monkeypatch.setattr(EmailWebhookService, "_find_user_by_email", lambda self, email: test_user)
    result = webhook_service.process_payload(payload)
    assert "Created 1 transactions from Hitachi" in result
    assert Transaction.objects.filter(category__name="Soap").exists()

@pytest.mark.django_db
def test_process_payload_missing_text_body(webhook_service):
    payload = {
        "sender": "someone@email.com",
        "subject": "LUNA POS Daily Report",
        "text_body": ""
    }
    with pytest.raises(ValidationError):
        webhook_service.process_payload(payload)

@pytest.mark.django_db
def test_find_branch_from_metadata_with_metadata(webhook_service, test_branch):
    parsed_data = {"metadata": {"location_alias": "Test Branch"}}
    branch = webhook_service._find_branch_from_metadata(parsed_data, None, None)
    assert branch.name == "Test Branch"

@pytest.mark.django_db
def test_find_branch_from_metadata_with_subject(webhook_service, test_branch):
    parsed_data = {}
    branch = webhook_service._find_branch_from_metadata(parsed_data, None, "Test Branch: Expense")
    assert branch.name == "Test Branch"

@pytest.mark.django_db
def test_find_branch_from_metadata_no_branch(webhook_service):
    with pytest.raises(ValidationError):
        webhook_service._find_branch_from_metadata({}, None, "")

@pytest.mark.django_db
def test_find_user_by_email_found(webhook_service, test_user):
    user = webhook_service._find_user_by_email(test_user.email)
    assert user == test_user

@pytest.mark.django_db
def test_find_user_by_email_create_new(webhook_service, settings):
    settings.OWNER_EMAILS = ["newuser@x.com"]
    user = webhook_service._find_user_by_email("notfound@x.com")
    assert user.email == "newuser@x.com"

@pytest.mark.django_db
def test_create_transactions_empty_items(webhook_service, test_branch, test_user):
    parsed_data = {"top_products": []}
    result = webhook_service._create_transactions(test_branch, test_user, "subject", parsed_data, TransactionType.INCOME, "top_products", "LUNA POS")
    assert result == []

@pytest.mark.django_db
def test_parse_body_valid_and_invalid(webhook_service, test_category):
    # Valid
    c, a = webhook_service._parse_body("Detergent: 1000")
    assert c.name == "Detergent" and int(a) == 1000
    # Invalid
    with pytest.raises(ValidationError):
        webhook_service._parse_body("InvalidFormat")

@pytest.mark.django_db
def test_detect_and_parse_email_types(monkeypatch, webhook_service):
    monkeypatch.setattr("app.ingestion.luna_parser.parse_luna_email", lambda x: {"top_products": []})
    monkeypatch.setattr("app.ingestion.hitachi_parser.parse_hitachi_email", lambda x: {"top_items": []})
    assert webhook_service._detect_and_parse_email("LUNA POS", "", "")[0] == "LUNA"
    assert webhook_service._detect_and_parse_email("DAILY SALES SUMMARY", "", "")[0] == "HITACHI"
    assert webhook_service._detect_and_parse_email("random", "", "")[0] == "SIMPLE"