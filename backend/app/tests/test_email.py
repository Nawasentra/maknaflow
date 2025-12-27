import pytest
from unittest.mock import MagicMock, patch
from email.message import EmailMessage
from django.core.exceptions import ValidationError
from app.ingestion.email_ingestion import EmailIngestionService
from app.models import (
    Branch, User, Category, TransactionType, BranchType
)
from django.utils import timezone

@pytest.fixture
def test_branch(db):
    return Branch.objects.create(name="Test Branch", branch_type=BranchType.LAUNDRY)

@pytest.fixture
def test_user(db, test_branch):
    return User.objects.create_user(
        username="owner",
        email="owner@test.com",
        password="testpass",
        assigned_branch=test_branch
    )

@pytest.fixture
def test_category(db):
    return Category.objects.create(
        name="Detergent",
        transaction_type=TransactionType.EXPENSE
    )

@pytest.fixture
def email_service(settings):
    service = EmailIngestionService()
    service.owner_emails = ["owner@test.com"]
    return service

@pytest.fixture
def sample_email_message():
    msg = EmailMessage()
    msg["From"] = "owner@test.com"
    msg["Subject"] = "Test Branch: Expense Report"
    msg.set_content("Detergent: 50000")
    return msg

class TestEmailIngestionService:
    @pytest.mark.django_db
    def test_find_branch_case_insensitive(self, email_service, test_branch):
        found = email_service._find_branch("test branch")
        assert found == test_branch

    @pytest.mark.django_db
    def test_find_branch_not_found(self, email_service):
        with pytest.raises(ValidationError):
            email_service._find_branch("notexist")

    @pytest.mark.django_db
    def test_find_user_found(self, email_service, test_user):
        found = email_service._find_user(test_user.email)
        assert found == test_user

    @pytest.mark.django_db
    def test_find_user_not_found(self, email_service):
        with pytest.raises(User.DoesNotExist):
            email_service._find_user("notfound@example.com")

    @pytest.mark.django_db
    def test_find_branch_from_metadata_colon(self, email_service, test_branch):
        # Should extract "Test Branch" from subject
        assert email_service._find_branch_from_metadata({}, None, "Test Branch: Expense") == test_branch

    @pytest.mark.django_db
    def test_find_branch_from_metadata_no_branch(self, email_service):
        with pytest.raises(ValidationError):
            email_service._find_branch_from_metadata({}, None, "")

    @pytest.mark.django_db
    def test_parse_body_valid_and_invalid(self, email_service, test_category):
        # Valid
        c, a = email_service._parse_body("Detergent: 1000")
        assert c.name == "Detergent" and int(a) == 1000
        # Invalid
        with pytest.raises(ValidationError):
            email_service._parse_body("InvalidFormat")

    @pytest.mark.django_db
    def test_process_single_email_success(self, email_service, test_branch, test_user, test_category, sample_email_message):
        email_service.mail = MagicMock()
        email_service.mail.store.return_value = ("OK", None)
        result = email_service._process_single_email(sample_email_message, b"123")
        assert result is True

    @pytest.mark.django_db
    def test_fetch_and_process_single_email(self, email_service, test_branch, test_user, test_category):
        msg = EmailMessage()
        msg["From"] = "owner@test.com"
        msg["Subject"] = "Test Branch: Expense"
        msg.set_content("Detergent: 50000")
        with patch.object(email_service, 'connect', return_value=True):
            email_service.mail = MagicMock()
            email_service.mail.select.return_value = ("OK", None)
            email_service.mail.search.return_value = ("OK", [b"1"])
            email_service.mail.fetch.return_value = (
                "OK",
                [(b"1 (RFC822 {100}", msg.as_bytes())]
            )
            email_service.mail.store.return_value = ("OK", None)
            result = email_service.fetch_and_process()
            assert "Successfully processed 1 emails" in result

    @pytest.mark.django_db
    def test_fetch_and_process_multiple_emails(self, email_service, test_branch, test_user, test_category):
        msg1 = EmailMessage()
        msg1["From"] = "owner@test.com"
        msg1["Subject"] = "Test Branch: Expense 1"
        msg1.set_content("Detergent: 10000")
        msg2 = EmailMessage()
        msg2["From"] = "owner@test.com"
        msg2["Subject"] = "Test Branch: Expense 2"
        msg2.set_content("Soap: 20000")
        with patch.object(email_service, 'connect', return_value=True):
            email_service.mail = MagicMock()
            email_service.mail.select.return_value = ("OK", None)
            email_service.mail.search.return_value = ("OK", [b"1 2"])
            email_service.mail.fetch.side_effect = [
                ("OK", [(b"1 (RFC822 {100}", msg1.as_bytes())]),
                ("OK", [(b"2 (RFC822 {100}", msg2.as_bytes())])
            ]
            email_service.mail.store.return_value = ("OK", None)
            result = email_service.fetch_and_process()
            assert "Successfully processed 2 emails" in result

# Utility tests (outside the class)
def test_extract_email_from_sender():
    service = EmailIngestionService()
    assert service._extract_email_from_sender("John <john@example.com>") == "john@example.com"
    assert service._extract_email_from_sender("plain@example.com") == "plain@example.com"
    assert service._extract_email_from_sender(None) is None

def test_decode_subject():
    service = EmailIngestionService()
    assert service._decode_subject("Test") == "Test"
    encoded = "=?utf-8?q?Test_Subject?="
    assert "Test Subject" in service._decode_subject(encoded)

def test_get_email_body_plain():
    from email.message import EmailMessage
    service = EmailIngestionService()
    msg = EmailMessage()
    msg.set_content("Hello world")
    assert service._get_email_body(msg) == "Hello world"

def test_get_email_body_multipart():
    from email.message import EmailMessage
    service = EmailIngestionService()
    msg = EmailMessage()
    msg.set_content("Hello world")
    msg.add_alternative("<p>Hello world</p>", subtype="html")
    assert "Hello world" in service._get_email_body(msg)

def test_detect_and_parse_email_types(monkeypatch):
    service = EmailIngestionService()
    monkeypatch.setattr("app.ingestion.luna_parser.parse_luna_email", lambda x: {"top_products": []})
    monkeypatch.setattr("app.ingestion.hitachi_parser.parse_hitachi_email", lambda x: {"top_items": []})
    assert service._detect_and_parse_email("LUNA POS")[0] == "LUNA"
    assert service._detect_and_parse_email("DAILY SALES SUMMARY")[0] == "HITACHI"
    assert service._detect_and_parse_email("random")[0] == "SIMPLE"

def test_email_ingestion_connect_fail(monkeypatch):
    service = EmailIngestionService()
    monkeypatch.setattr("imaplib.IMAP4_SSL", lambda *a, **k: (_ for _ in ()).throw(Exception("fail")))
    assert not service.connect()

def test_email_ingestion_close_handles_exception(email_service):
    email_service.mail = MagicMock()
    email_service.mail.close.side_effect = Exception("fail")
    email_service.mail.logout.side_effect = Exception("fail")
    # Should not raise
    email_service.close()

def test_build_search_criteria_variants(email_service):
    # No owner_emails
    email_service.owner_emails = []
    assert email_service._build_search_criteria() == '(UNSEEN)'
    # One owner_email
    email_service.owner_emails = ['a@b.com']
    assert email_service._build_search_criteria() == '(UNSEEN FROM "a@b.com")'
    # Multiple owner_emails
    email_service.owner_emails = ['a@b.com', 'b@c.com']
    crit = email_service._build_search_criteria()
    assert 'FROM "a@b.com"' in crit and 'FROM "b@c.com"' in crit

def test_process_single_email_handles_no_body(email_service):
    msg = EmailMessage()
    msg["Subject"] = "Test"
    msg.set_content("")
    email_service.mail = MagicMock()
    result = email_service._process_single_email(msg, b"1")
    assert result is False

def test_process_single_email_handles_exception(email_service, test_branch, test_user, test_category):
    msg = EmailMessage()
    msg["From"] = "owner@test.com"
    msg["Subject"] = "Test Branch: Expense"
    msg.set_content("Detergent: notanumber")  # Will cause parse_body to fail
    email_service.mail = MagicMock()
    result = email_service._process_single_email(msg, b"1")
    assert result is False

def test_create_transactions_handles_empty_items(email_service, test_branch, test_user):
    log = MagicMock()
    log.created_at.date.return_value = timezone.now().date()
    parsed_data = {"top_products": []}
    result = email_service._create_transactions(test_branch, test_user, "subject", parsed_data, log, TransactionType.INCOME, "top_products", "LUNA POS")
    assert result == []

def test_create_transactions_handles_invalid_date(email_service, test_branch, test_user):
    log = MagicMock()
    log.created_at.date.return_value = timezone.now().date()
    parsed_data = {"metadata": {"date": "notadate"}, "top_products": [{"name": "X", "amount": 100}]}
    # Should not raise
    email_service._create_transactions(test_branch, test_user, "subject", parsed_data, log, TransactionType.INCOME, "top_products", "LUNA POS")

def test_get_email_body_handles_non_text(email_service):
    from email.message import EmailMessage
    msg = EmailMessage()
    msg.set_type("application/octet-stream")
    msg.set_payload(b"binarydata")
    assert email_service._get_email_body(msg) == ""

def test_find_user_by_email_creates_new(email_service, db):
    email_service.owner_emails = ["newuser@x.com"]
    user = email_service._find_user_by_email("notfound@x.com")
    assert user.email == "newuser@x.com"

def test_find_user_by_email_no_owner_emails(email_service):
    email_service.owner_emails = []
    with pytest.raises(User.DoesNotExist):
        email_service._find_user_by_email(None)