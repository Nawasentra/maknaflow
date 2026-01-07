import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_home_view(client):
    url = reverse('home')
    response = client.get(url)
    assert response.status_code == 200
    assert b"Hello, world!" in response.content

def test_google_login_view_exists(client):
    url = reverse('google_login')
    response = client.options(url)
    # OPTIONS should be allowed, actual POST requires OAuth flow
    assert response.status_code in [200, 405]