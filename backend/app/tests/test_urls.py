from django.urls import reverse, resolve
from app.views import home, GoogleLogin

def test_home_url_resolves():
    resolver = resolve('/')
    assert resolver.func == home

def test_google_login_url_resolves():
    resolver = resolve('/auth/google/')
    assert resolver.func.view_class == GoogleLogin