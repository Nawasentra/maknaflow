import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, override_settings
from unittest.mock import Mock

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def allowed_email(settings):
    settings.ALLOWED_EMAILS = ['allowed@example.com']
    return 'allowed@example.com'

@pytest.fixture
def not_allowed_email():
    return 'notallowed@example.com'

@pytest.fixture
def staff_user():
    return User.objects.create_user(
        username='staffuser',
        email='staff@example.com',
        password='testpass',
        is_staff=True
    )

@pytest.mark.django_db
@override_settings(ALLOWED_EMAILS=['allowed@example.com'])
def test_google_login_allowed_email(api_client, allowed_email):
    from app.adapters import OwnerOnlyAdapter
    adapter = OwnerOnlyAdapter()
    mock_sociallogin = Mock()
    mock_sociallogin.account.extra_data = {'email': allowed_email}
    # Should not raise
    adapter.pre_social_login(None, mock_sociallogin)

@pytest.mark.django_db
@override_settings(ALLOWED_EMAILS=['allowed@example.com'])
def test_google_login_not_allowed_email(api_client, not_allowed_email):
    from app.adapters import OwnerOnlyAdapter
    adapter = OwnerOnlyAdapter()
    mock_sociallogin = Mock()
    mock_sociallogin.account.extra_data = {'email': not_allowed_email}
    with pytest.raises(Exception) as excinfo:
        adapter.pre_social_login(None, mock_sociallogin)
    assert "Access Denied" in str(excinfo.value)

@pytest.mark.django_db
@override_settings(ALLOWED_EMAILS=['allowed@example.com'])
def test_google_login_staff_user(api_client, staff_user):
    from app.adapters import OwnerOnlyAdapter
    adapter = OwnerOnlyAdapter()
    mock_sociallogin = Mock()
    mock_sociallogin.account.extra_data = {'email': staff_user.email}
    # Should not raise
    adapter.pre_social_login(None, mock_sociallogin)